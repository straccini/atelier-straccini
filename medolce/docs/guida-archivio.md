# Guida — Dove si trovano Google Sheet, Apps Script e Chiave AI

**Obiettivo**: localizzare in 5 minuti dove risiede attualmente l'archivio del progetto M'è dolce e capire quale account/progetto Cloud bisogna usare per l'integrazione Gemini.

---

## 1. Il Google Sheet principale

Dal `Code.gs` v3.2 lo Sheet ID è:

```
1MCw4jgfQnCFQhaNTVazZpz1r3V3uxl-7b1PDOZs5oXE
```

URL diretto (aprilo nel browser, con l'account che contiene il file):

```
https://docs.google.com/spreadsheets/d/1MCw4jgfQnCFQhaNTVazZpz1r3V3uxl-7b1PDOZs5oXE/edit
```

**Cosa verificare aprendolo**:
- In alto a destra, l'avatar dell'account indica **quale Google account possiede o ha accesso al file**.
- Menu `File → Dettagli` mostra proprietario, data creazione, dimensione.
- Nel menu `Estensioni → Apps Script` si apre **lo script associato**: è lì che vive `Code.gs`.

Se non riesci ad aprirlo con `s.straccini@gmail.com`, prova altri account che usi (es. account Duemilamusei, account di Pesaro Musei) o verifica che il file non sia stato spostato in un Drive condiviso.

---

## 2. Il progetto Apps Script

Da `Estensioni → Apps Script` nello Sheet, si entra nell'editor GAS. L'URL ha forma:

```
https://script.google.com/home/projects/<PROJECT_ID>/edit
```

**Cosa verificare nell'editor**:
- Pannello sinistro: elenco file del progetto (`Code.gs`, eventualmente `Index.html`, `AI.gs`, ecc.).
- Se esistono **file HTML** è lì che vive il frontend (non in un sito esterno).
- Se esiste un **secondo file .gs** (es. `AI.gs`, `Transcribe.gs`) è lì che viveva la funzione di trascrizione nelle versioni precedenti: recuperane il contenuto per confronto prima di sostituirlo con v3.3.
- Menu `Distribuisci → Gestisci distribuzioni`: mostra la webapp pubblicata (URL `https://script.google.com/macros/s/.../exec`). Quella URL è l'endpoint che il frontend chiama.

---

## 3. Il Cloud Project associato (per Gemini, OCR, quote)

Ogni progetto Apps Script è legato a un **Google Cloud Project** (standard o automatico). Per controllare:

1. Editor Apps Script → icona ingranaggio (Impostazioni progetto).
2. Voce **Progetto Google Cloud Platform (GCP)**: mostra numero progetto e link.

**Due scenari**:

**A) Progetto GCP "automatico" (default)**
Funziona per le chiamate base di Apps Script ma **non permette di configurare chiavi API Gemini custom né abilitare quote estese**. Per v3.3 è sufficiente se la chiave Gemini viene impostata come `PropertiesService.getScriptProperties().setProperty('GEMINI_API_KEY', '...')`: la chiave viene usata come "client API" esterno e le chiamate non passano dal tuo GCP.

**B) Progetto GCP "standard"**
Permette di abilitare API (Vision, Document AI, Gemini via Vertex) e gestire fatturazione. Serve solo se in futuro vorrai fare OCR di PDF scansionati tramite Vision API.

**Per la trascrizione AI v3.3 basta lo scenario A.**

---

## 4. La chiave API Gemini

Dal `Code.gs` v3.3, la chiave vive in **PropertiesService.getScriptProperties()** come `GEMINI_API_KEY`.

**Come generarla** (procedura ufficiale):

1. Vai su https://aistudio.google.com/app/apikey (accedi con l'account che vuoi usare per la fatturazione — di solito `s.straccini@gmail.com`).
2. Clicca **"Create API key"**.
3. Scegli un progetto GCP esistente (o lasciane creare uno nuovo).
4. Copia la chiave (formato: `AIza...`).

**Come inserirla nel progetto Apps Script**:

*Metodo 1 — dall'editor, una tantum*

Aggiungi temporaneamente in `Code.gs` la funzione:
```javascript
function setupAiKey() {
  setAiKey('AIza...la-tua-chiave...');
}
```
Eseguila una volta (Esegui → `setupAiKey`). Poi **cancellala** dal codice e salva (la chiave resta salvata nelle Script Properties).

*Metodo 2 — dalla UI*

Editor Apps Script → ingranaggio **Impostazioni progetto** → **Proprietà script** → **Aggiungi proprietà script**: nome `GEMINI_API_KEY`, valore la chiave. Salva.

**Verifica**:
```
Esegui → testAi
```
Nei log dovresti vedere il JSON della ricetta Spaghetti al pomodoro strutturato correttamente.

---

## 5. GitHub (eventuale)

Se una copia del progetto è su GitHub, non influisce sul deployment attuale (Apps Script non si collega automaticamente a GitHub): serve solo come backup del codice. Se vuoi trovarla:

1. Accedi al tuo account GitHub (o quello Duemilamusei se ne esiste uno).
2. Cerca repository con nomi tipici: `me-dolce`, `atelier-sinestetico`, `duemilamusei`, `medolce-webapp`.
3. Se la trovi, controlla l'ultimo commit — potrebbe contenere versioni del codice precedenti alla v3.2.

Per v3.3, la fonte autorevole è **Apps Script del Google Sheet**, non GitHub. Se vuoi sincronizzare con GitHub in futuro, Google fornisce `clasp` (tool da riga di comando) — ma è un secondo step.

---

## 6. Checklist operativa

Da completare **prima** del deploy v3.3:

- [ ] Apro lo Sheet col Sheet ID indicato e confermo l'account proprietario.
- [ ] Dall'Apps Script associato verifico se esistono file HTML/altri .gs.
- [ ] Controllo le distribuzioni attive (URL webapp in produzione).
- [ ] Genero una chiave Gemini su AI Studio.
- [ ] Imposto `GEMINI_API_KEY` nelle Script Properties.
- [ ] Eseguo `testConnessione()` → leggo log "v3.3 | AI key: CONFIGURATA".
- [ ] Eseguo `testAi()` → leggo JSON ricetta di test.
- [ ] Distribuisco nuova versione e testo da frontend con `action:"ping"`.

Quando questa checklist è verde, v3.3 è in produzione.
