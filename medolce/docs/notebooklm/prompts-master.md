# Prompt master NotebookLM M'è dolce

Prompt pronti all'uso per il notebook **NotebookLM M'è dolce**, organizzati per fase operativa. Copiare il prompt, incollarlo in NLM con le fonti selezionate, raccogliere l'output, inviarlo alla pipeline di import.

---

## Prompt 1 — Indice ricette da fonte mista

**Quando usarlo**: fonte NLM che contiene più ricette (libro, articolo, ricettario storico).
**Output atteso**: lista titoli ricetta (utile per il passo di splitting).

```
Analizza la fonte selezionata e restituisci SOLO una lista numerata dei titoli
delle ricette contenute, uno per riga, nel formato:

1. Nome ricetta — categoria (primo | secondo | contorno | dolce | antipasto | lievitato | bevanda | altro)
2. ...

Se un titolo non è esplicito, desumi un nome rappresentativo dal contenuto.
Non aggiungere commenti prima o dopo la lista.
Non inventare ricette non presenti nella fonte.
```

---

## Prompt 2 — Estrazione singola ricetta (formato Ricettario)

**Quando usarlo**: una volta individuata una ricetta nell'indice, per estrarla in formato JSON conforme allo schema `ricettario`.
**Output atteso**: un oggetto JSON valido, nessun testo prima o dopo.

```
Estrai la ricetta "{{nome_ricetta}}" dalla fonte selezionata e restituisci
SOLO un oggetto JSON conforme a questo schema:

{
  "name": "string - nome ricetta",
  "category": "primo | secondo | contorno | dolce | antipasto | lievitato | bevanda | altro",
  "emoji": "string - una emoji rappresentativa",
  "difficulty": "facile | media | impegnativa",
  "prep": "string - tempo preparazione (es. '15 min')",
  "cook": "string - tempo cottura",
  "servings": "number - numero porzioni",
  "ingredients": [
    {"qty": "200g", "item": "farina 00", "note": ""}
  ],
  "steps": ["passo 1", "passo 2", "..."],
  "notes": "string - note dell'autore, curiosità storiche, varianti",
  "tags": ["tradizionale","marchigiana","vegetariana"],
  "sourceUrl": "riferimento alla fonte originale"
}

REGOLE:
- Rispondi SOLO con JSON valido, senza testo prima o dopo.
- Se un campo non è deducibile, lascia "" o [].
- Normalizza quantità antiche: "due etti" → "200g", "mezzo litro" → "500ml".
- Stima difficulty in base a: tecnica richiesta, numero di passi, strumenti, tempi totali.
- Preserva il linguaggio originale dell'autore nei passi, ma normalizza le quantità negli ingredients.
- Se la fonte riporta l'autore o il libro, inseriscilo in notes con formato: "Fonte: Artusi, La scienza in cucina (1891)".
```

---

## Prompt 3 — Estrazione pralina (formato MeDolce)

**Quando usarlo**: fonte letteraria/poetica per generare una pralina del progetto Atelier Sinestetico.
**Output atteso**: oggetto JSON conforme allo schema `medolce`.

```
A partire dalla fonte selezionata ({{tipo_fonte: poesia | romanzo | articolo}}),
crea una scheda pralina per l'Atelier Sinestetico M'è dolce. Ispira la composizione
al testo senza citarlo letteralmente. Restituisci SOLO un oggetto JSON:

{
  "name": "string - nome della pralina (può riprendere un'immagine del testo)",
  "category": "A | B | C",
  "sottocategoria": "A1 | A2 | B1 | ...",
  "sinesthetic_note": "string - 2-3 frasi che collegano testo letterario e composizione sensoriale (colore, profumo, consistenza, suono)",
  "ingredients": [
    {"qty":"70%","item":"cioccolato fondente Valrhona","note":""},
    ...
  ],
  "steps": ["passo 1","passo 2","..."],
  "notes": "string - note tecniche di laboratorio",
  "music_qr": "string - riferimento musicale/brano in abbinamento (se desumibile)",
  "literary_citation": "string - citazione breve dal testo (max 1 riga)",
  "abbinamento": "string - vino, distillato, tè, infuso in abbinamento",
  "nlm_source_id": "id della fonte NLM"
}

REGOLE:
- JSON valido, nessun testo fuori dal JSON.
- La pralina deve essere realizzabile (no ingredienti impossibili).
- La citazione letteraria deve essere breve e testuale (max 15 parole).
- Non inventare la fonte: se l'id non è disponibile lascia "".
```

---

## Prompt 4 — Normalizzazione ricetta già estratta

**Quando usarlo**: correzione e standardizzazione di una ricetta già in bozza (es. trascritta a mano).
**Input aggiuntivo**: testo della ricetta come contesto.

```
Ti fornisco una ricetta in formato testo libero. Restituiscila in formato JSON
conforme allo schema Ricettario (vedi Prompt 2), normalizzando:

- Quantità in unità SI (g, ml, l) o unità culinarie standard (cucchiaio, cucchiaino).
- Tempi in minuti o ore (es. "15 min", "1 h 30 min").
- Ordine dei passi in sequenza logica.
- Ingredienti separati per gruppi se la ricetta ha componenti distinti (pasta, ripieno, salsa).

Testo da normalizzare:
---
{{testo}}
---

Rispondi SOLO con JSON valido.
```

---

## Prompt 5 — Verifica coerenza citazione letteraria

**Quando usarlo**: validare che la citazione inserita in una pralina sia effettivamente presente nella fonte.

```
Verifica se la seguente citazione è presente testualmente nella fonte selezionata:

"{{citazione}}"

Rispondi SOLO con JSON:
{
  "found": true | false,
  "exact_match": true | false,
  "location": "string - capitolo/pagina/verso se identificabile",
  "suggested_correction": "string - citazione corretta se 'found' ma non 'exact_match'"
}

Non inventare. Se non trovi la citazione, "found": false.
```

---

## Note operative

- Salvare ogni output NLM ricevuto in `tests/prompts-nlm/` con naming `<promptN>_<fonte>_<data>.json` per tracciabilità.
- Se un prompt restituisce testo non-JSON, rilanciarlo precedendolo da: `"Rispondi SOLO con JSON valido. Nessun testo prima o dopo. Nessun markdown. Nessuna spiegazione."`
- NotebookLM tende ad aggiungere marker `` ```json `` e code fence: rimuoverli prima del parsing.
- Per fonti in dialetto o lingua antica, aggiungere al prompt: `"Traduci in italiano moderno i termini arcaici ma conserva il nome originale della ricetta se storico."`
