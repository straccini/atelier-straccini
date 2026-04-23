# M'è dolce — Atelier Sinestetico

**Progetto**: Atelier Sinestetico / M'è dolce
**Titolare**: Silvano Straccini — Duemilamusei (San Lorenzo in Campo / Fano)
**Stato backend**: Google Apps Script — baseline v3.2 (fix `status:"ok"` in `doGet` + routing `addMedolce` in `doPost`)
**Data setup workspace**: 17 aprile 2026

---

## 1. Obiettivi della sessione di lavoro

Tre linee di intervento parallele, tracciate nelle sottocartelle:

1. **Upgrade Code.gs a v3.3+** — refactor e nuove funzioni backend (Apps Script) mantenendo la compatibilità con le sezioni `medolce`, `gastronomia`, `ricettario`, `notizie`, `utenti`.
2. **Integrazione NotebookLM** — pipeline per generazione contenuti (ricette Leopardi, praline, testi sinestetici) a partire da fonti certificate; gestione prompt, sorgenti, output riusabili.
3. **Frontend webapp M'è dolce** — interfaccia utente HTML/CSS/JS che consuma gli endpoint `doGet`/`doPost` del backend.

---

## 2. Mappa delle cartelle

```
Me-dolce-webapp/
│
├── README.md                          ← questo file (indice generale)
│
├── src/
│   └── Code.gs                        ← Code.gs v3.3 — DA COPIARE in Apps Script
│
├── versions/
│   └── Code.gs_v3.2_BACKUP.txt        ← backup intangibile della baseline v3.2
│
├── docs/
│   ├── guida-archivio.md              ← come trovare Sheet, Apps Script, chiave Gemini
│   ├── guida-deploy.md                ← procedura passo-passo deploy Apps Script + GitHub
│   ├── changelog/
│   │   └── v3.3.md                    ← changelog upgrade v3.3
│   ├── frontend/
│   │   ├── trascrizione-ai-spec.md    ← specifica funzionale trascrizione AI
│   │   ├── redesign-concept.md        ← concept redesign (palette, tipografia, layout)
│   │   └── illustrazioni-concept.md   ← concept illustrazioni al tratto
│   └── notebooklm/
│       ├── pipeline-ricettario.md     ← pipeline import NLM → Ricettario
│       └── prompts-master.md          ← 5 prompt master NLM pronti all'uso
│
└── assets/
    └── mockups/
        ├── index.html                 ← mockup HTML navigabile della home
        └── illustrazioni/
            ├── medolce.svg            ← illustrazione pralina MeDolce
            ├── gastronomia.svg        ← illustrazione piatto + bottiglia
            └── ricettario.svg         ← illustrazione ingredienti cucina
```

---

## 3. Convenzioni di lavoro

**Versioning del backend**

- `versions/Code.gs_v3.2_BACKUP.txt` è la baseline: **non modificare mai**.
- Ogni upgrade si sviluppa in `src/Code.gs`. Quando una versione è stabile, copiarla in `versions/` con naming `Code.gs_vX.Y.txt` e annotare il delta in `docs/changelog/`.
- Il commento di intestazione in `src/Code.gs` deve sempre riportare numero di versione e fix principali introdotti (come in v3.2).

**Changelog**

In `docs/changelog/` si tiene un file per ogni versione (es. `v3.3.md`) con: obiettivo del rilascio, funzioni aggiunte/modificate, impatto sulle sezioni `SHEETS`, endpoint nuovi o deprecati, istruzioni di deploy.

**NotebookLM**

In `docs/notebooklm/` si documentano: elenco notebooks in uso, fonti caricate (titolo + provenienza certa), prompt master per ogni tipo di output (ricetta Leopardi, scheda pralina, testo sinestetico), criteri di validazione degli output.

**Frontend**

In `docs/frontend/` si raccolgono: wireframe, specifiche di interazione con gli endpoint Apps Script, mappa delle chiamate `doGet`/`doPost`, regole di rendering dei campi definiti in `HEADERS`.

**Dataset**

JSON/CSV esportati dal Google Sheet vanno in `assets/data/` con timestamp nel nome file (es. `ricettario_2026-04-17.json`).

---

## 4. Entità dati (sintesi dal backend v3.2)

| Sezione      | Sheet         | Campi principali                                                                 |
|--------------|---------------|----------------------------------------------------------------------------------|
| medolce      | MeDolce       | id, nome, codice, categoria, sottocategoria, ingredienti, procedimento, abbinamento, musica, citazione, fonte |
| gastronomia  | Gastronomia   | id, nome, tipo, regione, città, coordinate, vino, cantina, risorsa (tipo/autore/titolo/nota), fonte |
| ricettario   | Ricettario    | id, name, category, difficulty, prep, cook, servings, ingredients, steps, tags, fav |
| notizie      | Notizie       | id, titolo, categoria, fonte, testo, url, data                                   |
| utenti       | Utenti        | email, ruolo, nome, dataAggiunta, attivo                                         |

Admin: `s.straccini@gmail.com` — Sheet ID: `1MCw4jgfQnCFQhaNTVazZpz1r3V3uxl-7b1PDOZs5oXE`

---

## 5. Deliverable v3.3

### Codice (implementato)

| File                                            | Contenuto                                                        |
|-------------------------------------------------|------------------------------------------------------------------|
| `src/Code.gs`                                   | **Code.gs v3.3** — backend completo con Gemini, `addRicettario`, `bulkImportFromNlm` |
| `versions/Code.gs_v3.2_BACKUP.txt`              | Backup intangibile baseline v3.2                                  |

### Documentazione (specifiche e guide)

| Documento                                       | Contenuto                                                        |
|-------------------------------------------------|------------------------------------------------------------------|
| `docs/changelog/v3.3.md`                        | Changelog degli endpoint nuovi (`transcribe`, `addRicettario`, `bulkImportFromNlm`, `ping`) |
| `docs/frontend/trascrizione-ai-spec.md`         | Specifica funzionale trascrizione AI: diagnosi, architettura, prompt |
| `docs/notebooklm/pipeline-ricettario.md`        | Pipeline completa import NLM → Ricettario per fonti miste        |
| `docs/notebooklm/prompts-master.md`             | 5 prompt master pronti all'uso per NotebookLM M'è dolce           |
| `docs/frontend/redesign-concept.md`             | Concept frontend: principi, palette, tipografia, componenti UI    |
| `docs/frontend/illustrazioni-concept.md`        | Concept illustrazioni al tratto colorate per le tre categorie    |
| `docs/guida-archivio.md`                        | Guida per localizzare Sheet, Apps Script, Cloud Project, chiave Gemini |

### Design (asset)

| File                                            | Contenuto                                                        |
|-------------------------------------------------|------------------------------------------------------------------|
| `assets/mockups/index.html`                     | Mockup HTML navigabile della home (ora con SVG al posto delle foto) |
| `assets/mockups/illustrazioni/medolce.svg`      | Illustrazione al tratto — pralina MeDolce                        |
| `assets/mockups/illustrazioni/gastronomia.svg`  | Illustrazione al tratto — piatto regionale con bottiglia         |
| `assets/mockups/illustrazioni/ricettario.svg`   | Illustrazione al tratto — ingredienti di cucina di casa          |

## 6. Prossimi passi operativi

1. **Localizzare l'archivio** — seguire `docs/guida-archivio.md` per aprire lo Sheet e l'Apps Script associato.
2. **Configurare Gemini** — generare chiave su https://aistudio.google.com/app/apikey e impostarla come `GEMINI_API_KEY` nelle Script Properties.
3. **Deployare v3.3** — copiare `src/Code.gs` nel progetto Apps Script, salvare, nuova distribuzione.
4. **Testare** — eseguire `testConnessione()` (log "v3.3 | AI key: CONFIGURATA") e `testAi()` (log JSON ricetta test).
5. **Validare visivamente** il mockup (`assets/mockups/index.html`) e le tre illustrazioni SVG.
6. **Avviare import pilota NLM** con una sola fonte per verificare la pipeline (vedi `pipeline-ricettario.md` §4).
