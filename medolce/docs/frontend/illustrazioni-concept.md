# Illustrazioni al tratto per le tre categorie

**Obiettivo**: sostituire le foto delle card categoria con illustrazioni al tratto, colorate, eleganti, derivate da fotografie reali ma stilizzate. Coerenti con la palette del redesign (avorio, navy, oro) e con l'estetica da "catalogo editoriale" del progetto M'è dolce.

---

## 1. Perché l'illustrazione al tratto

**Vantaggi rispetto alla foto diretta**:

- **Identità grafica propria** — il progetto riconoscibile anche senza vedere il testo, in ogni formato (social, stampa, pannelli museali).
- **Coerenza visiva** — tre soggetti diversi (pralina, piatto, ingredienti) trattati con la stessa mano grafica appaiono come una famiglia.
- **Leggerezza digitale** — SVG pesano pochi KB, scalano all'infinito, non hanno problemi di risoluzione.
- **Flessibilità cromatica** — colori modificabili al volo (tema chiaro/scuro, personalizzazioni stagionali, versioni monocromatiche per stampa).
- **Eleganza senza fotografia professionale** — evita l'effetto "banca immagini" finché non avrai shooting dedicato.

**Limite**: l'illustrazione è un'interpretazione, non un documento. Per le schede singole (ricetta, pralina, piatto del territorio) la foto resta insostituibile. Le illustrazioni vivono solo in home, sulle tre card categoria e su eventuali divisori di sezione.

---

## 2. Direzione stilistica

**Riferimenti visivi**:
- Illustrazioni editoriali di Javier Jaén (eleganti, essenziali, colorate con blocchi piatti).
- Manifesti di Jean Carlu, Adolphe Mouron Cassandre (modernismo francese, volumi semplici).
- Manuale della cucina italiana illustrato 1990-2000 (ma reinterpretato contemporaneo).

**Tratti distintivi**:

| Caratteristica     | Scelta                                                             |
|--------------------|--------------------------------------------------------------------|
| Outline            | Linea continua spessore 1.5px–2px, colore navy `#0C1B33`            |
| Riempimento        | Blocchi piatti di colore, 2-3 tonalità max per illustrazione       |
| Texture            | Assente (no tratteggio fitto, no rumore)                           |
| Ombre              | Una sola ombra piena, 20-30% di opacità, posizione coerente        |
| Stile              | Semplificazione geometrica, ma senza derive astratte               |
| Formato            | SVG vettoriale, ratio 4:5 (coerente con le card del mockup)        |

**Palette per illustrazioni** (sottoinsieme della palette generale):

- Contorno: navy `#0C1B33`
- Riempimento principale: avorio `#FAF6EF`
- Accento caldo: oro antico `#C9A96E`
- Accento freddo (per ingredienti verdi, cantina, territorio): verde oliva scuro `#5C6B3D`
- Rosso per ciliegie/pomodori/frutti: mattone `#A8453B`

Mai più di 4 colori per illustrazione, contorno incluso.

---

## 3. Le tre illustrazioni

### A) MeDolce — la pralina

**Soggetto**: una pralina appoggiata, sezionata per metà, che rivela la ganache interna. Sullo sfondo un cerchio pieno (piatto o sottopiatto).

**Dettagli**:
- Pralina lucida, navy scuro con piccolo highlight avorio in alto a sinistra.
- Taglio diagonale che scopre la ganache oro.
- Una goccia di ganache che cola (movimento).
- Sottopiatto circolare avorio con bordo oro sottile.

**Riferimento fotografico di partenza**: una pralina fondente fotografata dall'alto-laterale, con luce naturale morbida.

### B) Gastronomia — il piatto del territorio

**Soggetto**: piatto di ceramica con una preparazione semplice (es. brodetto di pesce marchigiano), bottiglia di vino accanto, due olive o un rametto di erba aromatica.

**Dettagli**:
- Piatto rotondo bianco-avorio, bordo sottile navy.
- Elemento principale del piatto reso con 2-3 forme geometriche (pesce stilizzato, salsa rossa mattone).
- Bottiglia di vino: silhouette scura con etichetta oro.
- Rametto di rosmarino o olivo in verde oliva.

**Riferimento fotografico di partenza**: composizione fotografica di un piatto regionale con abbinamento vino.

### C) Ricettario — gli ingredienti della cucina di casa

**Soggetto**: ingredienti basilari disposti come natura morta: un mattarello, due uova, una ciotola di farina, un ramo di basilico.

**Dettagli**:
- Mattarello diagonale in oro (accento caldo).
- Ciotola avorio con linea navy di contorno, farina resa con piccoli punti.
- Due uova come ovali avorio con ombra.
- Foglia di basilico in verde oliva.

**Riferimento fotografico di partenza**: still life di ingredienti di cucina su piano di lavoro in legno chiaro.

---

## 4. Produzione — percorso consigliato

**Fase 1 — selezione foto di partenza**
Sceglierne 3, una per categoria, con composizione pulita e soggetto centrato. Se non hai foto proprietarie, usare Unsplash per la fase di studio (non per la pubblicazione finale).

**Fase 2 — trasformazione in illustrazione**

Tre strade, in ordine crescente di qualità/costo:

*Via A — AI image-to-illustration (veloce)*
Tool: Midjourney, DALL-E, Firefly con prompt del tipo: "Editorial line illustration of [soggetto], flat colors, 2 tones, navy outline, ivory background, elegant, minimal, Cassandre style, SVG-ready". Output PNG → vettorializzazione con Adobe Illustrator o Inkscape (Traccia bitmap).

*Via B — Illustrazione manuale (controllata)*
Un'illustratore disegna a partire dalle 3 foto di riferimento. Tempi: 3-5 giorni. Costo: 300-800 € per il set di 3 illustrazioni.

*Via C — Ibrido (consigliato)*
Bozze AI per velocizzare la composizione, poi rifinitura manuale in SVG (Illustrator o Figma) per ottenere linee pulite e coerenza tra le 3 illustrazioni. Tempi: 2 giorni.

**Fase 3 — integrazione nel mockup**

Sostituire nel file `assets/mockups/index.html` i tag `<img src="https://images.unsplash.com/...">` delle tre `.categoria-media` con i file SVG delle illustrazioni. In alternativa, incollare l'SVG inline per zero richieste HTTP.

---

## 5. Esempio SVG immediato

In `assets/mockups/illustrazioni-demo.svg` trovi un primo prototipo di una delle tre illustrazioni (pralina MeDolce), per dare un'idea concreta del livello di semplicità e della palette. Da considerare come "sketch di riferimento" per chi produrrà le versioni definitive, non come arte finale.

---

## 6. Note di utilizzo

- Le illustrazioni sono per **uso istituzionale M'è dolce**: se commissioni, prendi la cessione diritti completa per stampa, web, merchandising.
- Mantieni le 3 illustrazioni come **set omogeneo**: non usarne una senza le altre due nella stessa composizione (rompe la coerenza).
- Prevedi versioni:
  - **Positivo colori** (primaria)
  - **Monocromatica navy** (per stampe economiche, timbri)
  - **Monocromatica oro su navy** (per versioni eleganti, carta intestata, copertine cataloghi)

Salvare tutte le varianti in `assets/mockups/illustrazioni/` con naming: `medolce_color.svg`, `medolce_mono-navy.svg`, ecc.
