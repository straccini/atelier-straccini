# Specifica funzionale — Trascrizione AI di ricette e praline

**Progetto**: M'è dolce / Atelier Sinestetico
**Componente**: funzione AI di trascrizione testo → record strutturato
**Stato attuale**: non funzionante / da ricostruire
**Target**: Code.gs v3.3

---

## 1. Obiettivo

Permettere all'editor di incollare un testo libero (descrizione, ricetta copiata da un libro, appunti, trascrizione di una registrazione vocale già testuale, articolo di giornale) e ottenere automaticamente un record strutturato conforme agli schemi `medolce` o `ricettario`, da rivedere e confermare prima del salvataggio.

## 2. Perché la versione precedente "non funziona" — ipotesi diagnostiche

In assenza del codice attuale della funzione, le cause tipiche di malfunzionamento sono:

**a) Chiave API mancante o scaduta**
Se la trascrizione chiama un modello esterno (Gemini, OpenAI), la chiave è tipicamente in `PropertiesService.getScriptProperties()`. Se è stata rimossa, rigenerata o mai settata, la chiamata fallisce silenziosamente.

**b) Endpoint o modello deprecato**
Modelli AI cambiano nome e URL frequentemente (es. Gemini 1.0 → 1.5 → 2.0). Un endpoint vecchio restituisce 404 o errore di modello inesistente.

**c) Quota / limiti superati**
Quota giornaliera esaurita sul progetto Google Cloud associato, oppure billing non abilitato.

**d) Output AI non JSON-parseable**
Se il prompt non impone uno schema rigido, il modello risponde con testo libero che il parser non accetta.

**e) CORS o permessi webapp**
Se la chiamata AI parte dal frontend HTML invece che dal backend GAS, Google blocca le chiamate cross-origin. Soluzione: far passare tutto dal backend.

**f) Mancato deploy della nuova versione**
Modifiche al codice richiedono sempre un nuovo deploy (Distribuisci → Gestisci distribuzioni → Nuova versione). Dimenticare questo passaggio è l'errore più comune.

## 3. Architettura proposta

Chiamata AI **lato backend** (Code.gs), non frontend. Motivazioni: nessuna chiave esposta, gestione centralizzata errori, CORS non pertinente, log in Apps Script.

```
[Frontend]  →  POST doPost {action:"transcribe",...}  →  [Code.gs]
                                                              │
                                                              ▼
                                                     [Gemini API via UrlFetchApp]
                                                              │
                                                              ▼
                                                     [Validazione schema]
                                                              │
                                                              ▼
                                                     JSON strutturato
                                                              │
                                                              ▼
                                                     [Frontend: anteprima + conferma]
                                                              │
                                                              ▼
                                                     POST doPost {action:"add",...}
```

## 4. Contratto API

**Request**

```json
{
  "action": "transcribe",
  "target": "ricettario",
  "text": "... testo libero incollato ...",
  "hints": {
    "category": "primo | dolce | ...",
    "source": "Artusi, 'La scienza in cucina', 1891",
    "fotoUrl": ""
  }
}
```

**Response — successo**

```json
{
  "ok": true,
  "status": "ok",
  "result": {
    "name": "...",
    "category": "...",
    "emoji": "...",
    "difficulty": "facile | media | impegnativa",
    "prep": "15 min",
    "cook": "30 min",
    "servings": 4,
    "ingredients": [{"qty":"200g","item":"farina"}, ...],
    "steps": ["...","..."],
    "notes": "...",
    "tags": ["..."],
    "sourceUrl": "..."
  },
  "confidence": 0.87,
  "warnings": []
}
```

**Response — errore**

```json
{ "ok": false, "status": "error", "error": "messaggio diagnostico" }
```

## 5. Prompt template (lato backend)

Il prompt deve essere rigoroso: schema JSON esplicito, esempio, istruzione "rispondi solo con JSON valido". Versione sintetica:

```
Sei un assistente che normalizza testi di cucina e pasticceria in record JSON.
Target: {{target}} (ricettario | medolce).
Schema richiesto: {{schema_json}}.
Regole:
- Rispondi SOLO con JSON valido, nessun testo prima o dopo.
- Se un campo non è deducibile dal testo, lascialo vuoto o [].
- Normalizza quantità (es. "due etti" → "200g", "un cucchiaio" → "1 cucchiaio").
- Stima difficulty su base: tecnica richiesta, tempi, strumenti.
- Per praline (target=medolce) aggiungi campi sinesthetic_note e literary_citation se desumibili.
Testo da trascrivere:
---
{{text}}
---
```

## 6. Gestione errori e fallback

| Caso                                    | Comportamento                                       |
|-----------------------------------------|-----------------------------------------------------|
| Chiave API mancante                     | Errore esplicito: "Configurare AI_API_KEY nelle Proprietà Script" |
| Quota superata                          | Errore: "Quota AI esaurita, riprovare tra X ore"    |
| Output non-JSON                         | Retry 1 volta con temperature più bassa; se fallisce, errore parsing |
| Campi obbligatori mancanti              | Warning non bloccante, frontend mostra alert        |
| Testo troppo lungo (>100k caratteri)    | Troncamento con alert utente                        |

## 7. Criteri di accettazione

1. Testo di 3 ricette campione (Artusi, libro moderno, articolo) produce 3 record JSON validi e salvabili.
2. Nessuna chiave API appare nel frontend o nei log pubblici.
3. Tempo medio di risposta < 8 secondi.
4. Campo `confidence` < 0.6 attiva un warning nel frontend.
5. Fallback a parser manuale (utente compila form) sempre disponibile se AI fallisce.

## 8. Test da predisporre

In `tests/prompts-nlm/` salvare tre testi di prova:
- `test-artusi.txt` — ricetta storica con linguaggio antico
- `test-contemporanea.txt` — ricetta di blog moderno
- `test-pralina.txt` — descrizione sinestetica pralina (per target=medolce)

Validare che l'output rispetti schema e riprodurre eventuali errori in `tests/gas/test-transcribe.log`.
