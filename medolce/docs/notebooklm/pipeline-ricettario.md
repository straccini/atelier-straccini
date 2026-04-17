# Pipeline NotebookLM M'è dolce → Ricettario

**Obiettivo**: trattare ogni fonte del notebook NLM "M'è dolce" come una o più ricette autonome e importarle nel foglio `Ricettario` del Google Sheet M'è dolce.
**Contesto risposte utente**: le fonti NLM sono **miste (testo libero + file PDF + immagini di ricettari)**, quindi serve pipeline di estrazione + normalizzazione + splitting prima dell'import.

---

## 1. Flusso end-to-end

```
[NotebookLM M'è dolce]
        │
        │  1. Selezione fonti
        ▼
[Estrazione]  ──────── testo libero  ─────────┐
        │                                     │
        │  PDF testuale  → estrazione testo   │
        │  PDF scansionato → OCR              │
        │  Immagine ricetta → OCR             │
        │  URL/HTML → fetch + pulizia         │
        │                                     │
        ▼                                     │
[Splitting]  ← se la fonte contiene più       │
        │     ricette (es. libro, articolo)   │
        │                                     │
        ▼                                     │
[Normalizzazione AI] ←────────────────────────┘
        │  Prompt master (vedi prompts-master.md)
        │  Output: array di oggetti JSON conformi allo schema ricettario
        │
        ▼
[Validazione schema]
        │  Campi obbligatori, tipi, enum
        │
        ▼
[Deduplica]
        │  Su (sourceUrl + hash(titolo normalizzato))
        │
        ▼
[Backend Code.gs v3.3]
        │  action: bulkImportFromNlm, target: ricettario
        │
        ▼
[Foglio Ricettario]
        │  Revisione admin (Silvano)
        │
        ▼
[Webapp M'è dolce]
        │  Ricetta disponibile pubblicamente
```

---

## 2. Fasi in dettaglio

### Fase 1 — Estrazione per tipologia di fonte

| Tipo fonte                  | Tecnica estrazione                                        |
|-----------------------------|-----------------------------------------------------------|
| Testo libero in NLM         | Copia diretta / export da NLM                             |
| PDF testuale (ricettario)   | `pdf-parse` (Node) o Apps Script `DriveApp` + `DocumentApp.openByUrl` per conversione a Doc |
| PDF scansionato             | OCR via Google Cloud Vision API oppure `Drive.Files.copy` con `ocr:true, ocrLanguage:'it'` |
| Immagine ricetta            | OCR via Vision API                                        |
| URL / pagina web            | `UrlFetchApp.fetch` + pulizia HTML (rimozione nav/footer) |

Convenzione di salvataggio: in `assets/data/nlm-raw/` conservare il testo estratto grezzo per ogni fonte, con naming `<nlm-source-id>_<YYYY-MM-DD>.txt`.

### Fase 2 — Splitting

Le fonti miste tipicamente contengono più ricette. Strategia:

- **Split per heading**: rilevare titoli di ricetta (linee brevi, maiuscole o corsivo, separate da spazi bianchi).
- **Split per struttura**: blocchi con ingredienti seguiti da procedimento.
- **Split AI-driven**: prompt specifico "elenca i titoli delle ricette contenute in questo testo" per produrre indice, poi estrarre ciascuna.

Output della fase: array di blocchi testuali, uno per ricetta candidata.

### Fase 3 — Normalizzazione AI

Ogni blocco testuale viene passato al prompt master (vedi `prompts-master.md`) che restituisce un record JSON conforme allo schema `ricettario`:

```json
{
  "id": "",
  "name": "...",
  "category": "primo | secondo | dolce | ...",
  "emoji": "🍝",
  "difficulty": "facile | media | impegnativa",
  "prep": "15 min",
  "cook": "30 min",
  "servings": 4,
  "ingredients": [{"qty":"200g","item":"farina","note":""}, ...],
  "steps": ["...","..."],
  "notes": "",
  "tags": ["tradizionale","marchigiana"],
  "fav": false,
  "fotoUrl": "",
  "audioUrl": "",
  "sourceUrl": "nlm://source/<id>",
  "createdAt": "2026-04-17T10:00:00Z"
}
```

### Fase 4 — Validazione

Checklist automatica:
- `name` non vuoto
- `ingredients` array con almeno 1 elemento
- `steps` array con almeno 2 elementi
- `servings` numerico
- `category` in lista ammessa (primo, secondo, contorno, dolce, antipasto, lievitato, bevanda, altro)

Record che falliscono validazione vanno in coda di revisione manuale (`assets/data/nlm-pending/`).

### Fase 5 — Deduplica

Chiave duplicato: `sourceUrl + normalize(name)` dove `normalize` rimuove accenti, minuscole, spazi multipli. Se già presente nel Ricettario:
- Se i campi differiscono → record va in coda aggiornamenti (modalità `update` con conferma)
- Se identici → skip

### Fase 6 — Import backend

Chiamata HTTP POST al backend v3.3 con `action: bulkImportFromNlm`, `target: ricettario`, `records: [...]`. Risposta con conteggi `added / updated / skipped / errors`.

### Fase 7 — Revisione admin

In `docs/notebooklm/import-log/` si tiene un log per ogni sessione di import (data, fonte, record importati, errori, azioni correttive).

---

## 3. Strumenti necessari

- **NotebookLM M'è dolce** — notebook operativo con le fonti già caricate
- **Google Cloud Project** — con Vision API abilitata per OCR
- **Google Apps Script** — per pipeline di import o, in alternativa, script Python/Node locale
- **PropertiesService** — per chiavi API (Gemini, Vision)
- **Drive** — cartella `nlm-raw/` per estrazioni, `nlm-pending/` per record da revisionare

---

## 4. Alternativa "manuale assistita" (MVP)

Per una prima versione senza sviluppare l'intera pipeline automatica:

1. Admin apre NotebookLM e chiede al notebook: "Estrai la ricetta X dalla fonte Y in formato JSON conforme a questo schema: ...".
2. Copia il JSON risultante.
3. Webapp M'è dolce ha un bottone "Importa da NLM" che apre una textarea.
4. Admin incolla il JSON, clicca "Importa".
5. Backend chiama `action: add` con `target: ricettario`.

Questa modalità è più semplice e permette di avere risultati immediati mentre si sviluppa la pipeline completa.

---

## 5. Criteri di accettazione

1. Una fonte testuale con 3 ricette viene correttamente splittata e produce 3 record JSON validi.
2. Una fonte PDF scansionato (ricettario) produce almeno l'80% delle ricette correttamente estratte.
3. La deduplica non introduce duplicati in Ricettario anche su import ripetuti.
4. Log di ogni import conserva traccia di fonte, record, esito.
