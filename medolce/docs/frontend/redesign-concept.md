# Redesign frontend M'è dolce — concept

**Direzione creativa**: moderno, essenziale, molto elegante. Fotografia protagonista. Tipografia colta. Palette sobria.
**Tre categorie in prima pagina**: MeDolce (praline), Gastronomia (territorio), Ricettario (casa).
**Ispirazione**: editoria di cucina d'autore (Phaidon, Cappelletti), siti di ristoranti gastronomici di alto livello, logica "museale" da catalogo d'arte.

---

## 1. Principi guida

**Silenzio visivo**
Molto spazio bianco. Ogni elemento respira. Niente elementi decorativi fini a sé stessi. La foto e il testo bastano.

**Tipografia come elemento strutturale**
Una serif colta per i titoli (richiamo al libro di cucina, alla letteratura), un sans-serif neutro per il testo corrente. Corpo generoso, interlinea ariosa.

**Fotografia in primo piano**
Le tre categorie in home sono tre grandi immagini silenziose con titolo sovrapposto. Niente altro.

**Palette ereditata dal backend**
Il Code.gs v3.2 già usa `#0C1B33` (navy profondo) come sfondo header dei fogli e `#C9A96E` (oro antico) come accento. Riprendere questi due colori come identità coerente.

**Gestualità ridotta**
Menu minimale, nessun carosello, nessun popup invasivo. Navigazione a scroll + click su card.

---

## 2. Palette

| Ruolo                | Colore      | HEX       | Uso                                             |
|----------------------|-------------|-----------|-------------------------------------------------|
| Sfondo principale    | Avorio      | `#FAF6EF` | Body, card                                      |
| Testo primario       | Nero caldo  | `#1A1410` | Corpo testo, titoli                             |
| Accento primario     | Oro antico  | `#C9A96E` | Elementi interattivi, underline, separatori     |
| Accento scuro        | Navy M'è dolce | `#0C1B33` | Header, footer, hover su link                |
| Grigio neutro        | Pietra      | `#8A7F71` | Caption, metadata, testo secondario             |
| Bianco puro          | Latte       | `#FFFFFF` | Fondo card in hover, overlay                    |

Uso: mai più di 3 colori insieme sulla stessa vista. Oro e navy usati come accenti, mai come fondi estesi (eccetto header/footer).

---

## 3. Tipografia

| Ruolo            | Font                       | Peso           | Note                                  |
|------------------|----------------------------|----------------|---------------------------------------|
| Titoli/display   | **Cormorant Garamond**     | 300, 500       | Serif umanista, pensata per l'editoria |
| Corpo testo      | **Inter**                  | 400, 500       | Sans neutra, leggibile                |
| Caption/metadata | **Inter**                  | 400, uppercase tracking 0.1em | Per etichette categoria    |
| Eventuale mano   | **Caveat** o **Parisienne**| 400            | Solo per firma/citazione, uso parsimonioso |

Scala tipografica:
- H1 hero: 64–80px (clamp)
- H2 sezione: 40–48px
- H3 card: 24–28px
- Body: 17px / leading 1.7
- Caption: 13px / tracking 0.08em

Tutti i font disponibili su Google Fonts, caricamento via `<link>`.

---

## 4. Layout

**Griglia**
12 colonne, gutter 32px desktop / 16px mobile. Max-width content 1200px centrato. Padding verticale tra sezioni: 120px desktop, 72px mobile.

**Home**
1. Hero full-viewport: nome "M'è dolce" in Cormorant, sottotitolo, foto di sfondo fissa con overlay scuro 30%.
2. Sezione "Le tre vie" — tre card grandi affiancate (desktop) / in stack (mobile), una per categoria. Ogni card: foto 4:5, titolo, una riga di descrizione.
3. Sezione "Ultima pralina" — featured item con foto grande e citazione letteraria.
4. Sezione "Territorio" — mappa compatta delle ricette di gastronomia regionale.
5. Footer sobrio con crediti, contatti Duemilamusei, link al Museo delle Terre Marchigiane.

**Pagina categoria**
Hero ridotto, griglia di card (3 col desktop, 2 col tablet, 1 col mobile). Filtri sottili (non tag colorati ma testo inline).

**Scheda singola (ricetta / pralina)**
Colonna narrativa stretta (max 640px leggibile), foto grande in testa, ingredienti in sidebar destra (desktop) o in blocco sopra (mobile). Passi numerati con tipografia ampia.

---

## 5. Icone / emoji

Le emoji già previste nello schema `ricettario.emoji` sono accettabili ma rese in dimensione piccola, accanto al titolo o in card riepilogative. Nessuna icona colorata grossa. Se necessario, usare **Lucide icons** linea 1.5px, colore testo primario.

---

## 6. Fotografia — direttive

- **Formato**: prevalente 4:5 (stile editoriale cucina) e 3:2 (paesaggio territorio). 16:9 solo per hero.
- **Luce**: naturale, laterale, tonalità calde. Evitare flash diretti, still-life sterili.
- **Soggetto**: per MeDolce → singola pralina o serie di 3 massimo, fondo neutro materico (ardesia, legno, marmo). Per Gastronomia → piatto servito + ambiente/territorio in secondo scatto. Per Ricettario → gesto di preparazione + piatto finito.
- **Trattamento**: leggero viraggio caldo, contrasto morbido, niente filtri Instagram.
- **Placeholder**: in fase di sviluppo usare immagini Unsplash (royalty-free) con queste query consigliate:
  - MeDolce → `artisan chocolate praline dark elegant`
  - Gastronomia → `italian regional dish plated editorial`
  - Ricettario → `home cooking ingredients warm light`

---

## 7. Interazioni

- **Hover card**: lieve zoom foto (scale 1.03) + titolo che si sottolinea in oro. Transizione 400ms ease-out.
- **Click card**: transizione di pagina soft (fade-in), no animazioni acrobatiche.
- **Scroll**: lazy-load immagini, parallasse solo sul hero della home.
- **Mobile menu**: full-screen overlay navy, voci in Cormorant 32px.

---

## 8. Accessibilità

- Contrasti AAA testo/sfondo (avorio + nero caldo → contrast ratio 15+).
- Navigazione tastiera completa, focus ring in oro antico.
- `alt` descrittivo su tutte le foto.
- Rispetto `prefers-reduced-motion` per disattivare animazioni.
- Font minimo 16px, corpo testo 17px.

---

## 9. Componenti UI chiave

| Componente               | Descrizione                                                          |
|--------------------------|----------------------------------------------------------------------|
| `HeroTitle`              | Titolo display + sottotitolo, sfondo foto o avorio pieno             |
| `CategoryCard`           | Card grande 4:5, foto + titolo + descrizione, hover con underline oro |
| `RecipeCard`             | Card compatta per liste, 1:1 foto + 2 righe metadata                 |
| `SingleView`             | Layout scheda singola con colonna narrativa + sidebar                |
| `Citation`               | Blocco citazione letteraria in Cormorant corsivo, bordo oro a sinistra |
| `Metadata`               | Riga in Inter uppercase tracking per tempi/porzioni/difficoltà       |
| `MinimalFilter`          | Filtri testuali inline ("tutti · primi · dolci · lievitati")         |
| `FooterSobrio`           | Tre colonne: M'è dolce, Duemilamusei, Museo Terre Marchigiane         |

---

## 10. Riferimenti mockup

Il mockup HTML statico navigabile è in `assets/mockups/index.html`. Contiene la home con le tre categorie, palette, tipografia e componenti base per verifica visiva.
