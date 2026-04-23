# Guida deploy v3.3 — passo per passo

**Target**: sostituire il codice Apps Script del progetto M'è dolce con la v3.3 e, opzionalmente, sincronizzare tutti i file su GitHub.
**Durata stimata**: 15 minuti per Apps Script + 10 minuti per GitHub.
**Prerequisiti**: accesso all'account Google proprietario dello Sheet + account GitHub (se si vuole versionare).

---

## PARTE A — Sostituzione codice su Google Apps Script

### A.1 — Apri il Google Sheet

Incolla questo URL nel browser (devi essere loggato con l'account proprietario):

```
https://docs.google.com/spreadsheets/d/1MCw4jgfQnCFQhaNTVazZpz1r3V3uxl-7b1PDOZs5oXE/edit
```

Se non si apre, verifica l'account in alto a destra. Lo Sheet dovrebbe contenere i fogli: MeDolce, Gastronomia, Ricettario, Notizie, Utenti.

### A.2 — Apri l'editor Apps Script

Dal menu dello Sheet:

```
Estensioni → Apps Script
```

Si apre una nuova scheda con l'editor. Nel pannello sinistro troverai un file chiamato `Codice.gs` (o `Code.gs`).

### A.3 — Backup del codice attuale (sicurezza)

Prima di sostituire:

1. Clicca su `Codice.gs` per aprirlo.
2. Seleziona tutto il contenuto (`Ctrl+A` / `Cmd+A`).
3. Copia (`Ctrl+C` / `Cmd+C`).
4. Apri un editor di testo locale (Blocco note, TextEdit) e incolla.
5. Salva come `Code.gs_PRE_v3.3_BACKUP.txt` in una cartella a tua scelta.

Questo è il tuo paracadute: se qualcosa va storto, puoi sempre ri-incollarlo.

### A.4 — Incolla il nuovo codice v3.3

1. Apri il file locale `src/Code.gs` del workspace (usa il link in fondo a questa guida per aprirlo nel browser).
2. Seleziona tutto (`Ctrl+A`), copia (`Ctrl+C`).
3. Torna all'editor Apps Script.
4. Clicca su `Codice.gs`, seleziona tutto il contenuto esistente (`Ctrl+A`), cancella (`Delete`).
5. Incolla il nuovo codice (`Ctrl+V`).
6. Salva con `Ctrl+S` (o icona floppy disk).

Verifica che l'intestazione del file inizi con:

```javascript
// ATELIER SINESTETICO — Code.gs v3.3
```

Se vedi v3.3, sei a posto.

### A.5 — Configura la chiave Gemini

La trascrizione AI richiede una chiave Gemini. Se non ne hai ancora una:

1. Apri https://aistudio.google.com/app/apikey (login con `s.straccini@gmail.com` o l'account principale).
2. Clicca **Create API key** → scegli o crea un progetto Google Cloud.
3. Copia la chiave (inizia con `AIza…`).

Poi, nell'editor Apps Script:

1. Icona ingranaggio a sinistra → **Impostazioni progetto** (oppure "Project Settings").
2. Scorri fino a **Proprietà script** → clicca **Modifica proprietà script**.
3. Aggiungi una nuova proprietà:
   - Proprietà: `GEMINI_API_KEY`
   - Valore: `AIza…la-tua-chiave…`
4. Salva le proprietà.

### A.6 — Test funzionali

Torna all'editor del codice. Nella barra in alto, accanto a "Esegui", c'è un menu a tendina dei nomi di funzione.

**Test 1 — Connessione base**

1. Seleziona `testConnessione` dal menu a tendina.
2. Clicca **Esegui**.
3. Alla prima esecuzione Google chiede autorizzazioni: concedi tutto (è il tuo codice).
4. In basso si apre il pannello "Log di esecuzione".
5. Devi leggere qualcosa come:
   ```
   medolce: N record
   gastronomia: N record
   ricettario: N record
   notizie: N record
   Connessione OK — v3.3 | AI key: CONFIGURATA
   ```

Se leggi `AI key: MANCANTE`, torna a A.5 e verifica la chiave.

**Test 2 — Trascrizione AI**

1. Seleziona `testAi` dal menu a tendina.
2. Clicca **Esegui**.
3. Attendi 5-10 secondi.
4. Nel Log di esecuzione deve comparire un JSON simile a:
   ```json
   {
     "target": "ricettario",
     "record": {
       "name": "Spaghetti al pomodoro",
       "category": "primo",
       "difficulty": "facile",
       "prep": "5 min",
       "cook": "10 min",
       "servings": 4,
       "ingredients": [ ... ],
       "steps": [ ... ]
     },
     "warnings": [],
     "saved": false
   }
   ```

Se vedi un errore "GEMINI_API_KEY non configurata" → torna a A.5.
Se vedi "Gemini HTTP 403" → chiave non abilitata per l'API (ricrearla o verificare il progetto GCP associato).
Se vedi "Gemini HTTP 429" → quota esaurita, attendere 24h o passare a un piano a pagamento.

### A.7 — Ri-distribuisci la webapp

**Questo è il passaggio più dimenticato**: le modifiche al codice non sono visibili al frontend finché non ri-distribuisci.

1. In alto a destra: **Distribuisci** → **Gestisci distribuzioni**.
2. Si apre la lista delle distribuzioni esistenti. Trova quella web attiva.
3. Clicca l'icona **matita** (Modifica) accanto alla distribuzione.
4. Nel campo **Versione**, scegli **Nuova versione**.
5. Nel campo **Descrizione** scrivi: `v3.3 — trascrizione AI, addRicettario, bulkImportFromNlm`.
6. Clicca **Distribuisci**.

L'URL della webapp (`https://script.google.com/macros/s/.../exec`) rimane lo stesso: non serve aggiornare il frontend.

### A.8 — Test dalla webapp (opzionale)

Apri la URL della webapp aggiungendo `?action=ping`:

```
https://script.google.com/macros/s/<TUO_ID>/exec?action=ping
```

Risposta attesa:

```json
{"ok":true,"status":"ok","version":"3.3","aiReady":true}
```

Se leggi `"version":"3.3"` e `"aiReady":true`, il deploy è riuscito.

---

## PARTE B — Sincronizzazione su GitHub

Due scenari. Prima di tutto, verifica quale ti riguarda.

### B.0 — Verifica se hai già un repository

1. Vai su https://github.com (login).
2. Nella tua lista repository, cerca nomi come: `me-dolce`, `medolce`, `atelier-sinestetico`, `duemilamusei`, `medolce-webapp`.
3. Se ne trovi uno → **Scenario B1** (repo esistente).
4. Se non trovi nulla → **Scenario B2** (nuovo repo).

### B.1 — Scenario: repository esistente

**Cosa serve**: GitHub Desktop (più semplice) oppure terminale con git installato.

**Con GitHub Desktop** (consigliato se non usi la riga di comando):

1. Apri GitHub Desktop → `File → Clone repository` → seleziona il repo M'è dolce → scegli una cartella locale.
2. Apri la cartella locale del repository sul tuo computer.
3. **Elimina i file vecchi** dentro la cartella (conservando `.git/` invisibile).
4. Copia nella stessa cartella tutto il contenuto del workspace Me-dolce-webapp (cartella `src/`, `versions/`, `docs/`, `assets/`, file `README.md`).
5. Torna su GitHub Desktop: vedrai elencate tutte le modifiche.
6. In basso a sinistra, nella casella **Summary** scrivi: `chore: upgrade to v3.3 — AI transcription, addRicettario, NLM bulk import, frontend redesign concept`.
7. Clicca **Commit to main** (o `master` a seconda del repo).
8. In alto clicca **Push origin**.

Le modifiche sono ora su GitHub.

**Con terminale git**:

```bash
# Cloniamo il repo in una cartella temporanea
git clone https://github.com/<tuo-username>/<nome-repo>.git medolce-repo
cd medolce-repo

# Rimuoviamo i file vecchi (conservando .git/)
find . -mindepth 1 -not -path './.git*' -delete

# Copiamo il contenuto aggiornato dal workspace
cp -R /percorso/a/Me-dolce-webapp/* .
cp /percorso/a/Me-dolce-webapp/README.md .

# Commit e push
git add -A
git commit -m "chore: upgrade to v3.3 — AI transcription, addRicettario, NLM bulk import, frontend redesign concept"
git push origin main
```

### B.2 — Scenario: nuovo repository

**Con browser GitHub** (più semplice, niente terminale):

1. Su https://github.com, in alto a destra clicca **+** → **New repository**.
2. Compila:
   - Owner: il tuo account
   - Repository name: `medolce-webapp`
   - Description: `M'è dolce — Atelier Sinestetico. Webapp e documentazione progetto.`
   - Visibility: **Private** (consigliato finché il progetto non è pubblico)
   - **NON** spuntare "Add a README file" (ne abbiamo già uno)
3. Clicca **Create repository**.

Nella pagina vuota che si apre, clicca **uploading an existing file** (link nel testo).

4. Trascina nella pagina tutti i file e cartelle del workspace Me-dolce-webapp. **Attenzione**: GitHub web non accetta cartelle vuote e ha limiti di upload multiplo. Se l'upload si blocca, caricare a blocchi: prima la root (`README.md`), poi `src/`, poi `versions/`, poi `docs/` (tutte le sottocartelle si possono trascinare insieme), infine `assets/`.
5. Nella casella di commit in basso, scrivi: `initial: v3.3 baseline with docs and mockups`.
6. Clicca **Commit changes**.

**Con GitHub Desktop** (più robusto):

1. GitHub Desktop → `File → New repository`.
2. Name: `medolce-webapp`, Local path: scegli dove salvarlo.
3. Clicca **Create repository**.
4. Apri la cartella locale appena creata e copia dentro tutti i file del workspace Me-dolce-webapp.
5. Torna su GitHub Desktop: vedrai tutti i file nella lista.
6. Summary: `initial: v3.3 baseline with docs and mockups`.
7. **Commit to main**.
8. Clicca **Publish repository** in alto: scegli visibilità **Private**, conferma.

Il repository è ora su GitHub e sincronizzato.

### B.3 — Opzionale: sincronizzazione automatica Apps Script ↔ GitHub (`clasp`)

`clasp` è lo strumento ufficiale Google per versionare Apps Script con git. Setup complesso ma potente.

**Se ti interessa**, questi sono i passi sintetici (richiede Node.js installato):

```bash
npm install -g @google/clasp
clasp login
# Nel tuo repo, dentro la cartella src/
clasp clone <SCRIPT_ID>
# Da ora in poi:
clasp push     # porta Code.gs da locale ad Apps Script
clasp pull     # porta Code.gs da Apps Script a locale
```

Non lo attiviamo oggi — è una ottimizzazione per il futuro. Per ora deploy manuale + git manuale sono sufficienti.

---

## PARTE C — Checklist di verifica finale

Dopo aver completato parti A e B, verifica:

**Apps Script / webapp**

- [ ] Nell'editor Apps Script, l'header di `Codice.gs` riporta `v3.3`.
- [ ] `GEMINI_API_KEY` è presente nelle Script Properties.
- [ ] `testConnessione()` nei log riporta `AI key: CONFIGURATA`.
- [ ] `testAi()` nei log riporta un JSON ricetta strutturato.
- [ ] **Gestisci distribuzioni** mostra la nuova versione come attiva.
- [ ] L'URL webapp con `?action=ping` restituisce `"version":"3.3","aiReady":true`.

**GitHub**

- [ ] Il repository ha 14 file (oltre a README.md) distribuiti in `src/`, `versions/`, `docs/`, `assets/`.
- [ ] Il file `src/Code.gs` su GitHub coincide con quello appena incollato in Apps Script.
- [ ] Il README si visualizza correttamente nella home del repository (controlla che la mappa cartelle sia leggibile).

**Frontend**

- [ ] `assets/mockups/index.html` si apre nel browser e mostra le 3 illustrazioni SVG correttamente.
- [ ] Le tre illustrazioni SVG sono presenti in `assets/mockups/illustrazioni/`.

Se tutti i check sono verdi, v3.3 è in produzione e versionata.

---

## Se qualcosa va storto

**Problema**: dopo il deploy, il frontend M'è dolce mostra "undefined" o errore generico.
**Soluzione**: hai dimenticato il passaggio A.7 (distribuisci nuova versione). Esegui il deploy e riprova.

**Problema**: `testAi()` restituisce "Gemini HTTP 400" con messaggio "API key not valid".
**Soluzione**: la chiave è sbagliata. Ricreane una su aistudio.google.com e aggiornala in Script Properties.

**Problema**: ho sbagliato a incollare il codice e Apps Script dà errori rossi.
**Soluzione**: ripristina dal backup di A.3 (hai salvato il vecchio codice localmente). Incollalo di nuovo, salva, e riparti.

**Problema**: GitHub rifiuta il push per conflitti.
**Soluzione**: `git pull --rebase` prima del push (oppure in GitHub Desktop: `Pull origin` prima di `Push`).

---

## Riferimenti

- Codice da incollare: `src/Code.gs`
- Guida archivio (Sheet, Apps Script, chiave): `docs/guida-archivio.md`
- Changelog v3.3: `docs/changelog/v3.3.md`
