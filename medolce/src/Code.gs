// ATELIER SINESTETICO — Code.gs v3.3
// ────────────────────────────────────────────────────────
// Novità v3.3:
//   1. Endpoint "transcribe" via Gemini (UrlFetchApp)
//   2. Routing "addRicettario" (speculare a addMedolce v3.2)
//   3. Endpoint "bulkImportFromNlm" con deduplica fonte+titolo
//   4. Helper PropertiesService per chiave AI
// Compatibilità: 100% con v3.2 (nessuna regressione)
// ────────────────────────────────────────────────────────

var SHEET_ID = '1MCw4jgfQnCFQhaNTVazZpz1r3V3uxl-7b1PDOZs5oXE';

var SHEETS = {
  medolce:     'MeDolce',
  gastronomia: 'Gastronomia',
  ricettario:  'Ricettario',
  notizie:     'Notizie',
  utenti:      'Utenti'
};

var ADMIN_EMAIL = 's.straccini@gmail.com';

var HEADERS = {
  medolce:     ['id','nome','codice','categoria','sottocategoria','descrizione','ingredienti','procedimento','note','abbinamento','musica','audioUrl','citazione','fonte','dataCreazione'],
  gastronomia: ['id','nome','tipo','regione','citta','cat','descrizione','ingredienti','procedimento','vino','cantina','lat','lng','fotoUrl','audioUrl','risorsa_tipo','risorsa_autore','risorsa_titolo','risorsa_nota','fonte','dataCreazione'],
  ricettario:  ['id','name','category','emoji','difficulty','prep','cook','servings','ingredients','steps','notes','tags','fav','fotoUrl','audioUrl','sourceUrl','createdAt'],
  notizie:     ['id','titolo','categoria','fonte','testo','url','data'],
  utenti:      ['email','ruolo','nome','dataAggiunta','attivo']
};

// Configurazione AI (Gemini)
var AI_CONFIG = {
  model:       'gemini-1.5-flash',
  apiBase:     'https://generativelanguage.googleapis.com/v1beta/models/',
  maxTokens:   4096,
  temperature: 0.2
};

// Dati codificati in base64 (evita problemi con apostrofi e caratteri speciali)
var DATI_B64 = 'eyJtZWRvbGNlIjogW3siaWQiOiAiQTEtSU5GMDAxIiwgIm5vbWUiOiAiTCdJbmZpbml0byIsICJjb2RpY2UiOiAiQ1BULVBSQS1JTkYwMDEiLCAiY2F0ZWdvcmlhIjogIkEiLCAic290dG9jYXRlZ29yaWEiOiAiQTEiLCAiZGVzY3JpemlvbmUiOiAiUHJhbGluYSBmb25kZW50ZSA3MCUgVmFscmhvbmEsIGdhbmFjaGUgYWwgY2FyZGFtb21vIGUgYmVyZ2Ftb3R0byBmcmVzY28ifV19';

// ═══════════════════════════════════════════
//  ENDPOINTS PRINCIPALI
// ═══════════════════════════════════════════

function doGet(e) {
  try {
    var section = e.parameter.section;
    var id      = e.parameter.id;
    var action  = e.parameter.action;
    var email   = e.parameter.email;

    if (action === 'verifica') {
      var utente = verificaUtente(email);
      if (utente) return jsonOut({ ok: true, status: 'ok', utente: utente });
      return jsonOut({ ok: false, status: 'error', error: 'Email non autorizzata' });
    }

    if (action === 'getUtenti') {
      return jsonOut({ ok: true, status: 'ok', data: getUtenti() });
    }

    if (action === 'ping') {
      return jsonOut({ ok: true, status: 'ok', version: '3.3', aiReady: !!getAiKey() });
    }

    if (!section) {
      return jsonOut({ ok: true, status: 'ok', sections: Object.keys(SHEETS) });
    }

    var data = id ? getById(section, id) : getAll(section);
    return jsonOut({ ok: true, status: 'ok', data: data, count: Array.isArray(data) ? data.length : 1 });

  } catch (err) {
    return jsonOut({ ok: false, status: 'error', error: err.message });
  }
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var result;

    if (body.action === 'add') {
      result = addRecord(body.section, body.data);

    } else if (body.action === 'update') {
      result = updateRecord(body.section, body.id, body.data);

    } else if (body.action === 'delete') {
      result = deleteRecord(body.section, body.id);

    } else if (body.action === 'bulkAdd') {
      result = bulkAdd(body.section, body.data);

    } else if (body.action === 'aggiungiEditor') {
      result = aggiungiEditor(body.email, body.nome);

    } else if (body.action === 'rimuoviEditor') {
      result = rimuoviEditor(body.email);

    // ── v3.2: pipeline NLM → sezione MeDolce ─────────────────
    } else if (body.action === 'addMedolce') {
      result = addMedolceMapped(body.data || {});

    // ── NUOVO v3.3: pipeline NLM → sezione Ricettario ────────
    } else if (body.action === 'addRicettario') {
      result = addRicettarioMapped(body.data || {});

    // ── NUOVO v3.3: trascrizione AI (Gemini) ─────────────────
    } else if (body.action === 'transcribe') {
      result = transcribeWithAi(body.target || 'ricettario', body.text || '', body.hints || {});

    // ── NUOVO v3.3: import massivo da NLM con deduplica ──────
    } else if (body.action === 'bulkImportFromNlm') {
      result = bulkImportFromNlm(body.target || 'ricettario', body.records || [], body.dedupe !== false);

    } else {
      throw new Error('Azione non riconosciuta: ' + body.action);
    }

    return jsonOut({ ok: true, status: 'ok', result: result });

  } catch (err) {
    return jsonOut({ ok: false, status: 'error', error: err.message });
  }
}

// ═══════════════════════════════════════════
//  v3.3 — TRASCRIZIONE AI (GEMINI)
// ═══════════════════════════════════════════

function getAiKey() {
  return PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY') || '';
}

function setAiKey(key) {
  PropertiesService.getScriptProperties().setProperty('GEMINI_API_KEY', key || '');
  return { ok: true };
}

function callGemini(systemPrompt, userText) {
  var apiKey = getAiKey();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY non configurata. Esegui setAiKey("la-tua-chiave") dall\'editor Apps Script.');
  }

  var url = AI_CONFIG.apiBase + AI_CONFIG.model + ':generateContent?key=' + apiKey;
  var payload = {
    contents: [{
      role: 'user',
      parts: [{ text: systemPrompt + '\n\n---\n' + userText + '\n---' }]
    }],
    generationConfig: {
      temperature: AI_CONFIG.temperature,
      maxOutputTokens: AI_CONFIG.maxTokens,
      responseMimeType: 'application/json'
    }
  };

  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  var response = UrlFetchApp.fetch(url, options);
  var code = response.getResponseCode();
  var text = response.getContentText();

  if (code !== 200) {
    throw new Error('Gemini HTTP ' + code + ': ' + text.substring(0, 400));
  }

  var parsed = JSON.parse(text);
  if (!parsed.candidates || !parsed.candidates[0] || !parsed.candidates[0].content) {
    throw new Error('Risposta Gemini vuota o malformata');
  }

  var rawText = parsed.candidates[0].content.parts.map(function(p){ return p.text || ''; }).join('');
  // Pulizia robusta: rimuove code fence ```json ... ``` se presenti
  var cleaned = rawText.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    throw new Error('Output AI non JSON-parseable: ' + cleaned.substring(0, 300));
  }
}

function buildPromptForTarget(target, hints) {
  hints = hints || {};
  var common =
    'Sei un assistente che normalizza testi di cucina in record JSON.\n' +
    'Rispondi SOLO con JSON valido conforme allo schema richiesto. Nessun testo prima o dopo.\n' +
    'Se un campo non è deducibile dal testo, lascialo vuoto ("") o [].\n' +
    'Normalizza quantità antiche: "due etti" → "200g", "mezzo litro" → "500ml".\n';

  if (target === 'ricettario') {
    return common +
      'Schema richiesto (oggetto JSON):\n' +
      '{ "name":"string","category":"primo|secondo|contorno|dolce|antipasto|lievitato|bevanda|altro",' +
      '"emoji":"string","difficulty":"facile|media|impegnativa","prep":"string","cook":"string",' +
      '"servings":number,"ingredients":[{"qty":"","item":"","note":""}],"steps":["..."],' +
      '"notes":"string","tags":["string"],"fotoUrl":"","sourceUrl":"" }\n' +
      (hints.category ? 'Suggerimento categoria: ' + hints.category + '\n' : '') +
      (hints.source ? 'Fonte: ' + hints.source + '\n' : '') +
      'Testo da trascrivere:';
  }

  if (target === 'medolce') {
    return common +
      'Target: scheda pralina per Atelier Sinestetico M\'è dolce.\n' +
      'Schema richiesto (oggetto JSON):\n' +
      '{ "name":"string","category":"A|B|C","sottocategoria":"A1|A2|...",' +
      '"sinesthetic_note":"string (2-3 frasi)","ingredients":[{"qty":"","item":"","note":""}],' +
      '"steps":["..."],"notes":"","music_qr":"","literary_citation":"string (max 15 parole)",' +
      '"abbinamento":"","nlm_source_id":"" }\n' +
      (hints.source ? 'Fonte letteraria: ' + hints.source + '\n' : '') +
      'Testo da elaborare:';
  }

  throw new Error('Target non supportato: ' + target);
}

function transcribeWithAi(target, text, hints) {
  if (!text || text.length < 20) {
    throw new Error('Testo troppo breve per la trascrizione');
  }
  if (text.length > 100000) {
    text = text.substring(0, 100000);
  }

  var prompt = buildPromptForTarget(target, hints);
  var obj = callGemini(prompt, text);

  // Validazione minima
  var warnings = [];
  if (target === 'ricettario') {
    if (!obj.name) warnings.push('Nome ricetta mancante');
    if (!obj.ingredients || !obj.ingredients.length) warnings.push('Ingredienti mancanti');
    if (!obj.steps || !obj.steps.length) warnings.push('Passi mancanti');
  } else if (target === 'medolce') {
    if (!obj.name) warnings.push('Nome pralina mancante');
    if (!obj.sinesthetic_note) warnings.push('Nota sinestetica mancante');
  }

  return {
    target: target,
    record: obj,
    warnings: warnings,
    saved: false  // frontend deve confermare con action:"add" o "addRicettario"/"addMedolce"
  };
}

// ═══════════════════════════════════════════
//  v3.3 — MAPPING NLM → MEDOLCE / RICETTARIO
// ═══════════════════════════════════════════

function addMedolceMapped(d) {
  var mapped = {
    id:             d.id             || genId(),
    nome:           d.name           || '',
    codice:         'NLM-' + (d.id   || genId()).toString().substring(0,6).toUpperCase(),
    categoria:      d.category       || '',
    sottocategoria: (d.tags && d.tags[0]) || d.sottocategoria || '',
    descrizione:    d.sinesthetic_note || d.notes || '',
    ingredienti:    d.ingredients    ? JSON.stringify(d.ingredients) : '[]',
    procedimento:   d.steps          ? JSON.stringify(d.steps)       : '[]',
    note:           d.notes          || '',
    abbinamento:    d.abbinamento    || '',
    musica:         d.music_qr       || '',
    audioUrl:       d.audioUrl       || '',
    citazione:      d.literary_citation || '',
    fonte:          d.nlm_source_id  ? 'NLM:' + d.nlm_source_id     : (d.fonte || ''),
    dataCreazione:  d.createdAt      || new Date().toISOString()
  };
  return addRecord('medolce', mapped);
}

function addRicettarioMapped(d) {
  var mapped = {
    id:         d.id          || genId(),
    name:       d.name        || '',
    category:   d.category    || '',
    emoji:      d.emoji       || '',
    difficulty: d.difficulty  || '',
    prep:       d.prep        || d.prep_time  || '',
    cook:       d.cook        || d.cook_time  || '',
    servings:   d.servings    || '',
    ingredients:d.ingredients ? JSON.stringify(d.ingredients) : '[]',
    steps:      d.steps       ? JSON.stringify(d.steps)       : '[]',
    notes:      d.notes       || '',
    tags:       d.tags        ? JSON.stringify(d.tags)        : '[]',
    fav:        d.fav         === true ? 'true' : 'false',
    fotoUrl:    d.fotoUrl     || d.photo_url  || '',
    audioUrl:   d.audioUrl    || d.audio_url  || '',
    sourceUrl:  d.sourceUrl   || d.nlm_source_url || (d.nlm_source_id ? 'nlm://' + d.nlm_source_id : ''),
    createdAt:  d.createdAt   || new Date().toISOString()
  };
  return addRecord('ricettario', mapped);
}

// ═══════════════════════════════════════════
//  v3.3 — BULK IMPORT DA NLM CON DEDUPLICA
// ═══════════════════════════════════════════

function normalizeTitle(s) {
  return String(s || '').toLowerCase()
    .replace(/[àáâãä]/g,'a').replace(/[èéêë]/g,'e').replace(/[ìíîï]/g,'i')
    .replace(/[òóôõö]/g,'o').replace(/[ùúûü]/g,'u')
    .replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
}

function dedupeKey(rec, target) {
  var title = target === 'medolce' ? (rec.nome || rec.name) : (rec.name || rec.nome);
  var source = rec.sourceUrl || rec.fonte || rec.nlm_source_url || '';
  return normalizeTitle(title) + '||' + String(source).toLowerCase();
}

function bulkImportFromNlm(target, records, dedupe) {
  if (!Array.isArray(records)) throw new Error('records deve essere un array');
  if (!SHEETS[target]) throw new Error('Target non valido: ' + target);

  var existing = getAll(target);
  var seen = {};
  if (dedupe) {
    for (var x = 0; x < existing.length; x++) {
      seen[dedupeKey(existing[x], target)] = existing[x].id;
    }
  }

  var added = 0, updated = 0, skipped = 0;
  var errors = [];

  for (var i = 0; i < records.length; i++) {
    try {
      var rec = records[i];
      if (!rec || typeof rec !== 'object') throw new Error('record #' + i + ' non valido');

      var key = dedupeKey(rec, target);
      if (dedupe && seen[key]) {
        // già presente: update per mantenere l'id esistente
        var existingId = seen[key];
        rec.id = existingId;
        if (target === 'medolce') {
          var mapped = buildMedolceRow(rec);
          updateRecord('medolce', existingId, mapped);
        } else if (target === 'ricettario') {
          var mappedR = buildRicettarioRow(rec);
          updateRecord('ricettario', existingId, mappedR);
        } else {
          updateRecord(target, existingId, rec);
        }
        updated++;
      } else {
        if (target === 'medolce') {
          addMedolceMapped(rec);
        } else if (target === 'ricettario') {
          addRicettarioMapped(rec);
        } else {
          addRecord(target, rec);
        }
        seen[key] = rec.id || 'new';
        added++;
      }
    } catch (e) {
      errors.push({ index: i, error: e.message, name: records[i] && (records[i].name || records[i].nome) });
    }
  }

  return { added: added, updated: updated, skipped: skipped, errors: errors, total: records.length };
}

// Helper usati sia da addMedolceMapped che da bulkImport (versione "row" senza scrittura)
function buildMedolceRow(d) {
  return {
    nome:           d.name || d.nome || '',
    codice:         d.codice || ('NLM-' + String(d.id || genId()).substring(0,6).toUpperCase()),
    categoria:      d.category || d.categoria || '',
    sottocategoria: d.sottocategoria || (d.tags && d.tags[0]) || '',
    descrizione:    d.sinesthetic_note || d.descrizione || d.notes || '',
    ingredienti:    typeof d.ingredients === 'object' ? JSON.stringify(d.ingredients || []) : (d.ingredienti || '[]'),
    procedimento:   typeof d.steps === 'object' ? JSON.stringify(d.steps || []) : (d.procedimento || '[]'),
    note:           d.notes || d.note || '',
    abbinamento:    d.abbinamento || '',
    musica:         d.music_qr || d.musica || '',
    audioUrl:       d.audioUrl || '',
    citazione:      d.literary_citation || d.citazione || '',
    fonte:          d.nlm_source_id ? 'NLM:' + d.nlm_source_id : (d.fonte || '')
  };
}

function buildRicettarioRow(d) {
  return {
    name:       d.name || d.nome || '',
    category:   d.category || d.categoria || '',
    emoji:      d.emoji || '',
    difficulty: d.difficulty || '',
    prep:       d.prep || d.prep_time || '',
    cook:       d.cook || d.cook_time || '',
    servings:   d.servings || '',
    ingredients:typeof d.ingredients === 'object' ? JSON.stringify(d.ingredients || []) : (d.ingredients || '[]'),
    steps:      typeof d.steps === 'object' ? JSON.stringify(d.steps || []) : (d.steps || '[]'),
    notes:      d.notes || '',
    tags:       typeof d.tags === 'object' ? JSON.stringify(d.tags || []) : (d.tags || '[]'),
    fav:        d.fav === true ? 'true' : 'false',
    fotoUrl:    d.fotoUrl || d.photo_url || '',
    audioUrl:   d.audioUrl || d.audio_url || '',
    sourceUrl:  d.sourceUrl || d.nlm_source_url || (d.nlm_source_id ? 'nlm://' + d.nlm_source_id : '')
  };
}

// ═══════════════════════════════════════════
//  GESTIONE UTENTI
// ═══════════════════════════════════════════

function verificaUtente(email) {
  if (!email) return { ruolo: 'reader', nome: 'Lettore' };
  var emailLower = email.toLowerCase().trim();
  if (emailLower === ADMIN_EMAIL.toLowerCase()) {
    return { ruolo: 'admin', nome: 'Silvano Straccini', email: emailLower };
  }
  var sh = getSheet('utenti');
  var last = sh.getLastRow();
  if (last < 2) return null;
  var vals = sh.getRange(1, 1, last, sh.getLastColumn()).getValues();
  var headers   = vals[0];
  var emailCol  = headers.indexOf('email');
  var ruoloCol  = headers.indexOf('ruolo');
  var nomeCol   = headers.indexOf('nome');
  var attivoCol = headers.indexOf('attivo');
  for (var i = 1; i < vals.length; i++) {
    if (String(vals[i][emailCol]).toLowerCase().trim() === emailLower) {
      if (String(vals[i][attivoCol]).toLowerCase() === 'false') return null;
      return {
        ruolo: vals[i][ruoloCol] || 'editor',
        nome:  vals[i][nomeCol]  || email,
        email: emailLower
      };
    }
  }
  return null;
}

function aggiungiEditor(email, nome) {
  if (!email) throw new Error('Email obbligatoria');
  var sh = getSheet('utenti');
  var last = sh.getLastRow();
  var emailLower = email.toLowerCase().trim();
  if (last > 1) {
    var vals = sh.getRange(1, 1, last, sh.getLastColumn()).getValues();
    var emailCol = vals[0].indexOf('email');
    for (var i = 1; i < vals.length; i++) {
      if (String(vals[i][emailCol]).toLowerCase().trim() === emailLower) {
        throw new Error('Email già presente: ' + email);
      }
    }
  }
  sh.appendRow([emailLower, 'editor', nome || email, new Date().toISOString(), 'true']);
  return { ok: true, email: emailLower };
}

function rimuoviEditor(email) {
  var sh = getSheet('utenti');
  var last = sh.getLastRow();
  if (last < 2) throw new Error('Nessun utente');
  var vals = sh.getRange(1, 1, last, sh.getLastColumn()).getValues();
  var emailCol  = vals[0].indexOf('email');
  var attivoCol = vals[0].indexOf('attivo');
  var emailLower = email.toLowerCase().trim();
  for (var i = 1; i < vals.length; i++) {
    if (String(vals[i][emailCol]).toLowerCase().trim() === emailLower) {
      sh.getRange(i + 1, attivoCol + 1).setValue('false');
      return { ok: true, disattivato: email };
    }
  }
  throw new Error('Email non trovata: ' + email);
}

function getUtenti() {
  var sh = getSheet('utenti');
  var last = sh.getLastRow();
  if (last < 2) return [];
  var vals = sh.getRange(1, 1, last, sh.getLastColumn()).getValues();
  var headers = vals[0];
  return vals.slice(1).filter(function(r){ return r[0] !== ''; }).map(function(row){
    var obj = {};
    headers.forEach(function(h,i){ obj[h] = row[i]; });
    return obj;
  });
}

// ═══════════════════════════════════════════
//  IMPORT DATI
// ═══════════════════════════════════════════

function importaDaJson() {
  try {
    var decoded = Utilities.newBlob(Utilities.base64Decode(DATI_B64)).getDataAsString();
    var data = JSON.parse(decoded);
    var secs = ['medolce','gastronomia','ricettario','notizie'];
    var totale = 0;
    for (var s = 0; s < secs.length; s++) {
      var key = secs[s];
      if (Array.isArray(data[key]) && data[key].length > 0) {
        var sh = getSheet(key);
        var last = sh.getLastRow();
        if (last > 1) sh.deleteRows(2, last - 1);
        for (var i = 0; i < data[key].length; i++) {
          addRecord(key, data[key][i]);
        }
        Logger.log(key + ': ' + data[key].length + ' record importati');
        totale += data[key].length;
      }
    }
    Logger.log('IMPORTAZIONE COMPLETATA: ' + totale + ' record totali');
  } catch(e) {
    Logger.log('ERRORE: ' + e.message);
  }
}

function svuotaTutto() {
  var secs = ['medolce','gastronomia','ricettario','notizie'];
  for (var s = 0; s < secs.length; s++) {
    var sh = getSheet(secs[s]);
    var last = sh.getLastRow();
    if (last > 1) sh.deleteRows(2, last - 1);
    Logger.log(secs[s] + ': svuotato');
  }
}

function testConnessione() {
  var secs = ['medolce','gastronomia','ricettario','notizie'];
  for (var s = 0; s < secs.length; s++) {
    var sh = getSheet(secs[s]);
    var rows = Math.max(0, sh.getLastRow() - 1);
    Logger.log(secs[s] + ': ' + rows + ' record');
  }
  Logger.log('Connessione OK — v3.3 | AI key: ' + (getAiKey() ? 'CONFIGURATA' : 'MANCANTE'));
}

function testAi() {
  try {
    var out = transcribeWithAi('ricettario',
      'Spaghetti al pomodoro: 320g di spaghetti, 400g di pomodori pelati, 2 spicchi d\'aglio, olio, basilico. Soffriggere l\'aglio, aggiungere i pelati schiacciati, salare. Cuocere 10 minuti. Cuocere la pasta al dente e saltare in padella.',
      { category: 'primo', source: 'test manuale' });
    Logger.log(JSON.stringify(out, null, 2));
  } catch(e) {
    Logger.log('ERRORE test AI: ' + e.message);
  }
}

// ═══════════════════════════════════════════
//  SHEET UTILS
// ═══════════════════════════════════════════

function getSheet(section) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var name = SHEETS[section];
  if (!name) throw new Error('Sezione non trovata: ' + section);
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    initHeaders(sh, section);
  }
  return sh;
}

function initHeaders(sh, section) {
  var h = HEADERS[section] || ['id'];
  var r = sh.getRange(1, 1, 1, h.length);
  r.setValues([h]);
  r.setFontWeight('bold');
  r.setBackground('#0C1B33');
  r.setFontColor('#C9A96E');
  sh.setFrozenRows(1);
}

function getAll(section) {
  var sh = getSheet(section);
  var last = sh.getLastRow();
  if (last < 2) return [];
  var vals = sh.getRange(1, 1, last, sh.getLastColumn()).getValues();
  var headers = vals[0];
  var result = [];
  for (var i = 1; i < vals.length; i++) {
    if (vals[i][0] === '') continue;
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var v = vals[i][j];
      if (typeof v === 'string' && v.length > 0 && (v.charAt(0) === '[' || v.charAt(0) === '{')) {
        try { v = JSON.parse(v); } catch (ex) {}
      }
      obj[headers[j]] = v;
    }
    result.push(obj);
  }
  return result;
}

function getById(section, id) {
  var all = getAll(section);
  for (var i = 0; i < all.length; i++) {
    if (String(all[i].id) === String(id)) return all[i];
  }
  return null;
}

function addRecord(section, data) {
  var sh = getSheet(section);
  var headers = HEADERS[section] || sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  if (!data.id) data.id = genId();
  var row = [];
  for (var i = 0; i < headers.length; i++) {
    var v = data[headers[i]];
    if (v === undefined || v === null) {
      row.push('');
    } else if (typeof v === 'object') {
      row.push(JSON.stringify(v));
    } else {
      row.push(v);
    }
  }
  sh.appendRow(row);
  return { id: data.id, action: 'added' };
}

function updateRecord(section, id, data) {
  var sh = getSheet(section);
  var last = sh.getLastRow();
  if (last < 2) throw new Error('Nessun dato in: ' + section);
  var vals = sh.getRange(1, 1, last, sh.getLastColumn()).getValues();
  var headers = vals[0];
  var idCol = headers.indexOf('id');
  for (var i = 1; i < vals.length; i++) {
    if (String(vals[i][idCol]) === String(id)) {
      var row = [];
      for (var j = 0; j < headers.length; j++) {
        if (headers[j] === 'id') {
          row.push(id);
        } else {
          var v = data[headers[j]] !== undefined ? data[headers[j]] : vals[i][j];
          if (typeof v === 'object' && v !== null) {
            row.push(JSON.stringify(v));
          } else {
            row.push(v !== undefined ? v : '');
          }
        }
      }
      sh.getRange(i + 1, 1, 1, row.length).setValues([row]);
      return { id: id, action: 'updated' };
    }
  }
  throw new Error('Record non trovato: ' + id);
}

function deleteRecord(section, id) {
  var sh = getSheet(section);
  var last = sh.getLastRow();
  if (last < 2) throw new Error('Nessun dato in: ' + section);
  var vals = sh.getRange(1, 1, last, sh.getLastColumn()).getValues();
  var idCol = vals[0].indexOf('id');
  for (var i = 1; i < vals.length; i++) {
    if (String(vals[i][idCol]) === String(id)) {
      sh.deleteRow(i + 1);
      return { id: id, action: 'deleted' };
    }
  }
  throw new Error('Record non trovato: ' + id);
}

function bulkAdd(section, records) {
  var added = 0, updated = 0;
  var errors = [];
  if (!Array.isArray(records)) return { added: 0, errors: ['records non validi'] };
  var existing = getAll(section);
  var existingIds = {};
  for (var x = 0; x < existing.length; x++) {
    existingIds[String(existing[x].id)] = true;
  }
  for (var i = 0; i < records.length; i++) {
    try {
      var rec = records[i];
      if (!rec.id) rec.id = genId();
      if (existingIds[String(rec.id)]) {
        updateRecord(section, rec.id, rec);
        updated++;
      } else {
        addRecord(section, rec);
        existingIds[String(rec.id)] = true;
        added++;
      }
    } catch (e) {
      errors.push({ error: e.message, id: records[i].id || i });
    }
  }
  return { added: added, updated: updated, errors: errors };
}

function deduplicateSheet(section) {
  var sh = getSheet(section);
  var last = sh.getLastRow();
  if (last < 2) return { removed: 0 };
  var vals = sh.getRange(1, 1, last, sh.getLastColumn()).getValues();
  var idCol = vals[0].indexOf('id');
  var seen = {}, rowsToDelete = [];
  for (var i = 1; i < vals.length; i++) {
    var id = String(vals[i][idCol]);
    if (id === '') continue;
    if (seen[id]) { rowsToDelete.push(i + 1); } else { seen[id] = true; }
  }
  for (var j = rowsToDelete.length - 1; j >= 0; j--) { sh.deleteRow(rowsToDelete[j]); }
  return { removed: rowsToDelete.length };
}

function deduplicateAll() {
  var result = {}, sections = Object.keys(SHEETS);
  for (var i = 0; i < sections.length; i++) {
    try { result[sections[i]] = deduplicateSheet(sections[i]); }
    catch(e) { result[sections[i]] = { error: e.message }; }
  }
  Logger.log(JSON.stringify(result));
  return result;
}

// ═══════════════════════════════════════════
//  UTILITY
// ═══════════════════════════════════════════

function genId() {
  return Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 5).toUpperCase();
}

function jsonOut(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/*
═══════════════════════════════════════════════
  CHANGELOG v3.3
═══════════════════════════════════════════════

  NUOVO 1 — Trascrizione AI via Gemini
    • Endpoint: POST action:"transcribe"
    • Target: "ricettario" | "medolce"
    • Motore: Gemini 1.5 Flash (configurabile in AI_CONFIG)
    • Chiave API: PropertiesService.getScriptProperties "GEMINI_API_KEY"
    • Setup: eseguire setAiKey("la-tua-chiave") una tantum dall'editor GAS
    • Output: { target, record, warnings, saved:false }
    • Il salvataggio è in 2 step: trascrizione → conferma → add

  NUOVO 2 — Routing addRicettario
    • Endpoint: POST action:"addRicettario"
    • Speculare a addMedolce (v3.2)
    • Mapping: name→name, category→category, prep_time→prep, cook_time→cook,
      ingredients[]→JSON, steps[]→JSON, photo_url→fotoUrl,
      nlm_source_url→sourceUrl, createdAt→createdAt

  NUOVO 3 — Bulk import da NLM con deduplica
    • Endpoint: POST action:"bulkImportFromNlm"
    • Target: "ricettario" | "medolce"
    • Deduplica chiave: normalize(titolo) + sourceUrl
    • Record duplicati → update (mantenendo id esistente)
    • Risposta: { added, updated, skipped, errors, total }

  NUOVO 4 — Helper diagnostici
    • GET action:"ping" → { ok, version:"3.3", aiReady:true|false }
    • testAi() → esegue trascrizione di prova (logga il risultato)

  ISTRUZIONI DEPLOY:
  1. In Apps Script: Impostazioni progetto → Proprietà script
     → Aggiungi proprietà: GEMINI_API_KEY = <la tua chiave>
     (alternativa: esegui setAiKey("...") una sola volta)
  2. Copia questo file in Codice.gs, salva
  3. Distribuisci → Gestisci distribuzioni → Matita → Nuova versione
  4. Testa: eseguire testConnessione() e testAi() dall'editor
  5. Da frontend: chiamare ping per verificare aiReady:true

═══════════════════════════════════════════════
*/
