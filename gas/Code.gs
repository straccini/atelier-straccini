/**
 * ════════════════════════════════════════════════════════════════
 *  ATELIER SINESTETICO — Backend Google Apps Script
 *  Versione: 1.0 · Compatibile con index.html v7
 * ════════════════════════════════════════════════════════════════
 *
 *  COSA FA
 *  - Espone un'API REST minimale su Google Sheets
 *  - Gestisce 4 sezioni (medolce, gastronomia, ricettario, notizie)
 *  - Gestisce ruoli admin / editor / reader
 *  - Fa da proxy a Claude API per il wizard "✦ AI"
 *
 *  SETUP IN 5 MINUTI
 *  1. Apri https://sheets.google.com → crea un foglio nuovo
 *     (o usa un foglio esistente). Nome consigliato:
 *     "Atelier Sinestetico — Database"
 *
 *  2. Estensioni → Apps Script. Cancella il contenuto di Code.gs
 *     e incolla questo file intero. Salva (Ctrl/⌘ + S).
 *
 *  3. Lancia una volta `setup()` dal menù funzioni in alto.
 *     Acconsenti ai permessi quando richiesto.
 *     Crea i 5 fogli (medolce, gastronomia, ricettario,
 *     notizie, utenti) con le intestazioni.
 *
 *  4. (Opzionale, per il wizard AI) Imposta la chiave Claude:
 *     Project Settings (⚙ in alto a sx) → Script Properties →
 *     Add → key: CLAUDE_API_KEY · value: sk-ant-...
 *     In alternativa lancia `setClaudeApiKey('sk-ant-...')` una volta.
 *
 *  5. Distribuisci → Nuova distribuzione → Tipo: App Web
 *     - Esegui come: ME (il tuo account)
 *     - Chi può accedere: CHIUNQUE (anche anonimo)
 *     - Distribuisci → autorizza → copia l'URL `/exec`.
 *
 *  6. Nell'app: Menu → Impostazioni → incolla l'URL → Salva.
 *     Il puntino di sync diventa verde quando è connesso.
 *
 *  AGGIORNAMENTI DEL CODICE
 *  - Quando modifichi questo Code.gs, lancia di nuovo
 *    "Distribuisci → Gestisci distribuzioni → ✏ → Nuova versione".
 *  - L'URL `/exec` resta invariato.
 * ════════════════════════════════════════════════════════════════ */

// ─── CONFIGURAZIONE ─────────────────────────────────────────────
const ADMIN_EMAILS = ['s.straccini@gmail.com', 'gianlucabellucci22@gmail.com'];
const ADMIN_EMAIL  = ADMIN_EMAILS[0]; // retrocompat alias
const SECTIONS    = ['medolce', 'gastronomia', 'ricettario', 'notizie'];
const UTENTI      = 'utenti';
const CLAUDE_MODEL = 'claude-sonnet-4-6';
const CLAUDE_MAX_TOKENS = 2048;

// ─── ENTRY POINTS ──────────────────────────────────────────────
function doGet(e) {
  try {
    const p = (e && e.parameter) || {};

    // Auth: verifica email
    if (p.action === 'verifica') {
      return _ok({ utente: verifyEmail(p.email) });
    }
    // Lista editor (admin only nel client)
    if (p.action === 'getUtenti') {
      return _ok({ data: getUtenti() });
    }
    // Get di una sezione
    if (p.section) {
      return _ok({ data: getSection(p.section) });
    }
    // Health check
    return _ok({
      info: 'Atelier Sinestetico Backend',
      version: '1.0',
      sezioni: SECTIONS,
      ts: new Date().toISOString()
    });
  } catch (err) {
    return _err(err.message);
  }
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const action = body.action;

    if (action === 'add')      return _ok({ id: addRow(body.section, body.data) });
    if (action === 'update')   return _ok({ id: updateRow(body.section, body.id, body.data) });
    if (action === 'delete')   return _ok({ deleted: deleteRow(body.section, body.id) });
    if (action === 'bulkAdd')  return _ok({ count: bulkAdd(body.section, body.data) });

    if (action === 'aiProcess') {
      return _ok({ text: aiProcess(body.systemPrompt, body.userMessage) });
    }

    if (action === 'aggiungiEditor') return _ok({ added:   addEditor(body.email, body.nome) });
    if (action === 'rimuoviEditor')  return _ok({ removed: removeEditor(body.email) });

    throw new Error('Azione sconosciuta: ' + action);
  } catch (err) {
    return _err(err.message);
  }
}

// ─── HELPERS RISPOSTA ──────────────────────────────────────────
function _ok(extra) {
  const out = Object.assign({ ok: true }, extra || {});
  return ContentService.createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
}
function _err(msg) {
  return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(msg) }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── SHEET UTILS ───────────────────────────────────────────────
function _ss() { return SpreadsheetApp.getActiveSpreadsheet(); }

function _sheet(name) {
  const ss = _ss();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    if (name === UTENTI) {
      sh.getRange(1, 1, 1, 4).setValues([['email', 'nome', 'ruolo', 'attivo']]);
    } else {
      sh.getRange(1, 1, 1, 4).setValues([['id', 'nome', 'json', 'updatedAt']]);
    }
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, sh.getLastColumn()).setFontWeight('bold');
  }
  return sh;
}

function _findRow(sh, id) {
  const last = sh.getLastRow();
  if (last < 2) return 0;
  const ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 2;
  }
  return 0;
}

function _displayName(record) {
  return String(record.nome || record.name || record.titolo || '').slice(0, 200);
}

// ─── CRUD SEZIONI ──────────────────────────────────────────────
function getSection(name) {
  if (!SECTIONS.includes(name)) throw new Error('Sezione sconosciuta: ' + name);
  const sh = _sheet(name);
  const last = sh.getLastRow();
  if (last < 2) return [];
  const rows = sh.getRange(2, 1, last - 1, 4).getValues();
  const out = [];
  rows.forEach(r => {
    if (!r[0]) return;
    try {
      const obj = JSON.parse(r[2] || '{}');
      obj.id = String(r[0]);
      out.push(obj);
    } catch (e) {
      out.push({ id: String(r[0]), nome: String(r[1] || ''), _parseError: true });
    }
  });
  return out;
}

function addRow(section, data) {
  if (!SECTIONS.includes(section)) throw new Error('Sezione sconosciuta: ' + section);
  if (!data || typeof data !== 'object') throw new Error('Dati mancanti');
  const sh = _sheet(section);
  const id = String(data.id || _genId());
  data.id = id;
  const now = new Date().toISOString();
  const json = JSON.stringify(data);
  const row = _findRow(sh, id);
  if (row > 0) {
    sh.getRange(row, 1, 1, 4).setValues([[id, _displayName(data), json, now]]);
  } else {
    sh.appendRow([id, _displayName(data), json, now]);
  }
  return id;
}

function updateRow(section, id, data) {
  if (!SECTIONS.includes(section)) throw new Error('Sezione sconosciuta: ' + section);
  if (!id) throw new Error('id mancante');
  if (!data || typeof data !== 'object') throw new Error('Dati mancanti');
  const sh = _sheet(section);
  data.id = String(id);
  const now = new Date().toISOString();
  const json = JSON.stringify(data);
  const row = _findRow(sh, id);
  if (row > 0) {
    sh.getRange(row, 1, 1, 4).setValues([[String(id), _displayName(data), json, now]]);
  } else {
    sh.appendRow([String(id), _displayName(data), json, now]);
  }
  return String(id);
}

function deleteRow(section, id) {
  if (!SECTIONS.includes(section)) throw new Error('Sezione sconosciuta: ' + section);
  if (!id) throw new Error('id mancante');
  const sh = _sheet(section);
  const row = _findRow(sh, id);
  if (row > 0) {
    sh.deleteRow(row);
    return true;
  }
  return false;
}

function bulkAdd(section, arr) {
  if (!SECTIONS.includes(section)) throw new Error('Sezione sconosciuta: ' + section);
  if (!Array.isArray(arr)) throw new Error('data deve essere un array');
  if (!arr.length) return 0;

  const sh = _sheet(section);
  const last = sh.getLastRow();
  const indexById = {};
  if (last >= 2) {
    sh.getRange(2, 1, last - 1, 1).getValues().forEach((r, i) => {
      if (r[0]) indexById[String(r[0])] = i + 2;
    });
  }
  const now = new Date().toISOString();
  const toAppend = [];
  arr.forEach(d => {
    if (!d || typeof d !== 'object') return;
    const id = String(d.id || _genId());
    d.id = id;
    const tuple = [id, _displayName(d), JSON.stringify(d), now];
    if (indexById[id]) {
      sh.getRange(indexById[id], 1, 1, 4).setValues([tuple]);
    } else {
      toAppend.push(tuple);
    }
  });
  if (toAppend.length) {
    sh.getRange(sh.getLastRow() + 1, 1, toAppend.length, 4).setValues(toAppend);
  }
  return arr.length;
}

function _genId() {
  return Date.now().toString(36).toUpperCase()
       + Math.random().toString(36).substr(2, 5).toUpperCase();
}

// ─── UTENTI / AUTORIZZAZIONI ──────────────────────────────────
const ADMIN_NAMES = {
  's.straccini@gmail.com': 'Silvano Straccini',
  'gianlucabellucci22@gmail.com': 'Gianluca Bellucci'
};

function verifyEmail(email) {
  if (!email) return null;
  const norm = String(email).toLowerCase().trim();
  if (ADMIN_EMAILS.map(e => e.toLowerCase()).indexOf(norm) >= 0) {
    return { email: norm, nome: ADMIN_NAMES[norm] || norm.split('@')[0], ruolo: 'admin' };
  }
  const sh = _sheet(UTENTI);
  const last = sh.getLastRow();
  if (last < 2) return null;
  const rows = sh.getRange(2, 1, last - 1, 4).getValues();
  for (let i = 0; i < rows.length; i++) {
    const [em, no, ru, at] = rows[i];
    if (String(em).toLowerCase().trim() === norm && _truthy(at)) {
      return { email: String(em), nome: String(no || ''), ruolo: String(ru || 'editor') };
    }
  }
  return null;
}

function getUtenti() {
  const sh = _sheet(UTENTI);
  const last = sh.getLastRow();
  if (last < 2) return [];
  const rows = sh.getRange(2, 1, last - 1, 4).getValues();
  return rows
    .filter(r => r[0])
    .map(r => ({
      email:  String(r[0]),
      nome:   String(r[1] || ''),
      ruolo:  String(r[2] || 'editor'),
      attivo: _truthy(r[3])
    }));
}

function addEditor(email, nome) {
  if (!email) throw new Error('email mancante');
  const norm = String(email).toLowerCase().trim();
  const sh = _sheet(UTENTI);
  const last = sh.getLastRow();
  if (last >= 2) {
    const rows = sh.getRange(2, 1, last - 1, 4).getValues();
    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i][0]).toLowerCase().trim() === norm) {
        sh.getRange(i + 2, 1, 1, 4)
          .setValues([[norm, nome || rows[i][1] || '', 'editor', true]]);
        return true;
      }
    }
  }
  sh.appendRow([norm, nome || '', 'editor', true]);
  return true;
}

function removeEditor(email) {
  if (!email) throw new Error('email mancante');
  const norm = String(email).toLowerCase().trim();
  const sh = _sheet(UTENTI);
  const last = sh.getLastRow();
  if (last < 2) return false;
  const rows = sh.getRange(2, 1, last - 1, 1).getValues();
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][0]).toLowerCase().trim() === norm) {
      sh.getRange(i + 2, 4).setValue(false);
      return true;
    }
  }
  return false;
}

function _truthy(v) {
  if (v === true) return true;
  if (v === false) return false;
  const s = String(v).toLowerCase().trim();
  return s === 'true' || s === '1' || s === 'si' || s === 'sì' || s === 'yes' || s === '';
}

// ─── AI PROXY (Claude) ─────────────────────────────────────────
function aiProcess(systemPrompt, userMessage) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('CLAUDE_API_KEY');
  if (!apiKey) {
    throw new Error("CLAUDE_API_KEY non configurata. Vai in Project Settings → Script Properties.");
  }
  if (!userMessage) throw new Error('userMessage mancante');

  const payload = {
    model: CLAUDE_MODEL,
    max_tokens: CLAUDE_MAX_TOKENS,
    system: systemPrompt || '',
    messages: [{ role: 'user', content: String(userMessage) }]
  };

  const res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
    followRedirects: true
  });

  const code = res.getResponseCode();
  const body = res.getContentText();
  if (code < 200 || code >= 300) {
    throw new Error('Claude API ' + code + ': ' + body.slice(0, 300));
  }
  const j = JSON.parse(body);
  const block = (j.content && j.content[0]) || {};
  const text = block.text || '';
  if (!text) throw new Error('Risposta AI vuota');
  return text;
}

// ─── SETUP / UTILITY DA LANCIARE A MANO ────────────────────────
/**
 * Crea i 5 fogli con le intestazioni se non esistono.
 * Lanciare una volta dopo aver incollato il codice.
 */
function setup() {
  SECTIONS.forEach(s => _sheet(s));
  _sheet(UTENTI);
  SpreadsheetApp.getUi().alert('Setup completato.\nFogli creati: ' + SECTIONS.concat([UTENTI]).join(', '));
}

/**
 * Salva la chiave Claude nelle Proprietà script.
 * Esempio: setClaudeApiKey('sk-ant-…');
 */
function setClaudeApiKey(key) {
  if (!key || !String(key).startsWith('sk-')) {
    throw new Error('Chiave non valida (deve iniziare con "sk-")');
  }
  PropertiesService.getScriptProperties().setProperty('CLAUDE_API_KEY', String(key).trim());
  return 'OK · Chiave salvata.';
}

/**
 * Test rapido di connettività (lancia da editor per debug).
 */
function selfTest() {
  const out = {
    ok: true,
    sheets: SECTIONS.concat([UTENTI]).map(s => ({
      name: s,
      rows: Math.max(0, _sheet(s).getLastRow() - 1)
    })),
    claudeKey: !!PropertiesService.getScriptProperties().getProperty('CLAUDE_API_KEY'),
    admin: ADMIN_EMAIL
  };
  Logger.log(JSON.stringify(out, null, 2));
  return out;
}
