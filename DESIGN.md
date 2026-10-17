---
name: The Fraud Zine
description: A hand-drawn technical zine for the paysim-fraud-detection case study, sketched in marker and highlighter on cream paper.
colors:
  zine-paper: "#fff8e8"
  paper-light: "#fffdf6"
  ink: "#111111"
  ink-soft: "#3b3630"
  ink-faint: "#6b6357"
  pencil-grey: "#b5ab9b"
  highlighter-yellow: "#ffe84d"
  highlighter-pink: "#ff6fae"
  pink-ink: "#c2185b"
  highlighter-teal: "#2dd4bf"
  teal-ink: "#0f766e"
typography:
  display:
    fontFamily: "Permanent Marker, Comic Sans MS, cursive"
    fontSize: "clamp(2.5rem, 4.6vw, 4.6rem)"
    fontWeight: 400
    lineHeight: 1.08
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Patrick Hand SC, Comic Sans MS, cursive"
    fontSize: "clamp(1.9rem, 3vw, 2.6rem)"
    fontWeight: 400
    lineHeight: 1.15
  title:
    fontFamily: "Patrick Hand SC, Comic Sans MS, cursive"
    fontSize: "1.3rem"
    fontWeight: 400
    lineHeight: 1.2
  body:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.65
  body-lead:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "1.2rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Patrick Hand SC, Comic Sans MS, cursive"
    fontSize: "1.12rem"
    fontWeight: 400
    lineHeight: 1.25
  mono:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "0.92em"
    fontWeight: 400
    fontFeature: "\"calt\" 0, \"liga\" 0"
rounded:
  hit: "3px"
  code: "4px"
  fill: "6px"
  card: "10px"
spacing:
  chapter: "5rem"
  figure: "2rem"
  gutter: "3rem"
  measure: "68ch"
  wide: "62rem"
  rail: "17rem"
components:
  button-primary:
    backgroundColor: "{colors.highlighter-yellow}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.fill}"
    padding: "0.55rem 1.15rem"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    padding: "0.55rem 1.15rem"
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.fill}"
    padding: "0.45rem 0.85rem"
  chip-pressed:
    backgroundColor: "{colors.highlighter-yellow}"
    textColor: "{colors.ink}"
  input:
    backgroundColor: "{colors.paper-light}"
    textColor: "{colors.ink}"
    typography: "{typography.mono}"
    rounded: "{rounded.fill}"
    padding: "0.55rem 0.7rem"
  toc-link:
    backgroundColor: "transparent"
    textColor: "{colors.ink-soft}"
    typography: "{typography.label}"
    rounded: "{rounded.fill}"
    padding: "0.3rem 0.55rem"
  toc-link-current:
    backgroundColor: "{colors.highlighter-yellow}"
    textColor: "{colors.ink}"
  code-card:
    backgroundColor: "{colors.paper-light}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "1.4rem 1.5rem 1.5rem"
---

# Design System: The Fraud Zine

## Overview

**Creative North Star: "The Zine a Friend Sketches for You"**

A technical argument drawn by hand on cream paper: a marker headline, small-caps handwriting for structure, a calm sans for reading, and monospace for every number and line of code. Nothing is ruled with a straight CSS border where a pen would have drawn it; outlines, underlines, arrows, chart axes, dots and the slider are rendered as wobbly rough.js strokes, and emphasis arrives as ragged highlighter swipes. A faint printed dot screen (14px grid) sits on the paper.

The page reads like an article, not a dashboard: one text measure (68ch), figures allowed wider (62rem), a sticky contents rail on the left. Colour is scarce and semantic. The three highlighters each carry one meaning, so the reader learns the code in the first viewport and can read every later chart by it. A small inline-SVG mascot in four moods (curious, gotcha, worried, happy) acts as the narrator's face.

Playfulness is in the drawing, never in the numbers: figures are always JetBrains Mono with ligatures off, tabular in tables, and the body face was chosen for an unslashed zero.

**Key Characteristics:**
- Cream paper (with a faint dot screen) and near-black ink; no gradients, no blur, no box-shadows.
- Every frame and mark is a rough.js stroke; CSS supplies only fills under them.
- Three highlighters with fixed meanings: yellow marks the one line that matters, pink the trick, teal the honest model.
- Four-face type system: marker display, hand-lettered small caps, Figtree body, JetBrains Mono figures.
- Marks draw themselves on when their chapter arrives; under reduced motion they are already drawn.

## Colors

Cream paper, warm near-black ink in three weights, and three highlighters each paired with a darker ink for text.

### Primary
- **Highlighter Yellow** (`highlighter-yellow`): the one line that matters. The `amount == oldbalanceOrg` hit in the code card, a key-sentence swipe, primary buttons, the pressed preset chip, the current contents entry, the slider knob, and text selection.

### Secondary
- **Highlighter Pink** (`highlighter-pink`): the trick and the review signal. The "one line" swipe in the headline, the one-line-rule series in charts, the dots the rule catches, the shortcut table row tint (16% alpha), SHAP bars pushing toward review, and the underline of the chapter about the trick.
- **Pink Ink** (`pink-ink`): pink when it must be read as text or line: the "review" verdict, set-aside note headings, the hand-lettered callout and its doodled arrow, rejected rows in charts, and the caret.

### Tertiary
- **Highlighter Teal** (`highlighter-teal`): the honest, served model. Its chart series, the served table row tint (18% alpha), hachured fills of what the served model catches, SHAP bars pushing toward approve, link underlines, and the underlines of the chapters about the honest model.
- **Teal Ink** (`teal-ink`): teal as text or line: the "approve" verdict, the served row label in charts, and the focus ring.

### Neutral
- **Zine Paper** (`zine-paper`): the page, the mobile top strip and dropdown contents.
- **Paper Light** (`paper-light`): a lifted sheet: the code card, form inputs, the mascot's face.
- **Ink** (`ink`): text, every sketched stroke, the mascot's line work, table header rules.
- **Ink Soft** (`ink-soft`): secondary text: the dek, captions, labels, contents entries, chart ticks.
- **Ink Faint** (`ink-faint`): tertiary marks: chapter numerals in the rail, code line numbers.
- **Pencil Grey** (`pencil-grey`): hachured background bars and dashed guide lines inside charts only.

### Named Rules
**The Fixed Meaning Rule.** In every mark that carries meaning (text swipes, chart series, verdicts, table rows, chapter underlines, SHAP bars) pink means the trick or "review", teal means the honest or served model or "approve", and yellow means the one thing to read. A new chart or component that needs a third category uses ink, pencil grey, or hatching, never a highlighter borrowed for decoration.

**The Ink Pairing Rule.** Highlighters are fills; they never set text. Text in a highlighter's meaning uses its ink partner (`pink-ink`, `teal-ink`); body text on a highlighter fill is always `ink`.

## Typography

**Display Font:** Permanent Marker (with Comic Sans MS, cursive)
**Heading/Label Font:** Patrick Hand SC (with Comic Sans MS, cursive)
**Body Font:** Figtree (with system-ui, sans-serif)
**Mono Font:** JetBrains Mono (with ui-monospace, monospace)

**Character:** A loud marker and a neat hand-lettered small-caps do the zine's talking; Figtree keeps long reading calm; JetBrains Mono makes every figure look checkable.

### Hierarchy
- **Display** (Permanent Marker 400, clamp(2.5rem, 4.6vw, 4.6rem), 1.08, -0.01em, balanced): the hero headline only. Marker also sets the brand name, chapter numerals, verdicts (2rem/1.1), the hand callout (1.45rem, pink ink, rotated -4deg) and big chart figures.
- **Headline** (Patrick Hand SC 400, clamp(1.9rem, 3vw, 2.6rem), 1.15): chapter titles, each with a sketched underline.
- **Title** (Patrick Hand SC 400, 1.3–1.35rem, 1.2): set-aside headings, field and closing-column headings.
- **Body** (Figtree 400/700, 1.0625rem, 1.65; 1rem under 520px): prose at a 68ch measure. The dek uses 1.2rem/1.55 at 46ch in ink soft; captions 1rem/1.55 in ink soft.
- **Label** (Patrick Hand SC 400, 1–1.25rem): buttons, chips, contents, form labels, table headers, chart text, byline.
- **Mono** (JetBrains Mono 400/700, 0.92em inline; tabular in tables): code, inputs, every figure, readout numbers.

### Named Rules
**The Every-Figure-Is-Mono Rule.** Any number a reader might check is set in JetBrains Mono, including inside the marker headline's spans and chart labels; table numbers are right-aligned and tabular.

**The No-Ligature Rule.** Code, inputs and figures disable `calt` and `liga`, so `==` reads as two characters and the code matches the repository.

## Layout

Two columns: a 17rem sticky contents rail and a main column padded clamp(1.25rem, 4vw, 4.5rem). A sketched vertical ink line divides them. Prose holds a 68ch measure; figures, tables, the scorer and the dot field may reach 62rem. Chapters open with 5rem of top space; figures sit 2rem above and 2.5rem below. Two-up groups (the trick's dot fields, the scorer's form and result) use 3rem column gutters.

The hero is a two-column grid (1.05fr / 0.95fr) filling up to one viewport (max 52rem): headline, dek and actions left, the tilted code card, callout and mascot right.

At 960px and below the rail becomes a sticky top strip (brand, a yellow "Contents" toggle, dropdown contents), the top bar hides, and every two-up grid stacks. At 600px the comparison table becomes one labelled block per model. At 520px the form goes single-column and the code card tightens.

## Elevation & Depth

Flat paper. There are no box-shadows, blurs or gradients. Depth is suggested by drawing: a sheet of lighter paper (`paper-light`) under a sketched outline, small rotations (code card 1.6deg, set-aside notes -0.6deg, callout -4deg), and a second rough ink stroke under the primary button's bottom edge.

### Named Rules
**The Drawn Not Lifted Rule.** Separation comes from a pen stroke, a paper tone or a slight tilt, never from a cast shadow.

## Shapes

Outlines are rough.js rectangles (stroke 2.2–2.4px for cards and buttons, 1.8px for chips and inputs, roughness about 1.1, bowing 1.2) with a fixed seed per element so they never re-wobble on resize. CSS radii (3–10px) only round the fills that sit under those strokes. Highlighter swipes are one ragged SVG marker path, stretched to the text and cloned across line breaks. Dots are rough circles; chart bars are hachured or cross-hatched; arrows are a rough line with a two-stroke head. The mascot is a lumpy hand-drawn head, not a circle.

## Components

### Buttons
Hand-lettered labels in sketched frames that tip slightly when you reach for them.
- **Shape:** rough ink rectangle over the fill (6px fill radius).
- **Primary:** yellow fill, ink label, 0.55rem 1.15rem padding, plus a second rough ink stroke under the bottom edge. Optional trailing arrow icon (inline SVG, 1.1em).
- **Secondary:** same frame, no fill.
- **Hover / Active:** translate(-1px, -2px) rotate(-0.6deg) over 0.25s; settles on press. Disabled shows a progress cursor at 60% opacity.
- **Focus:** 3px teal-ink outline, 3px offset (global).

### Chips
- **Style:** preset scenario chips in Patrick Hand SC, transparent, rough 1.8px frame.
- **State:** hover and `aria-pressed="true"` fill yellow.

### Cards / Containers
- **Code card:** paper-light sheet, 10px fill radius, rough 2.4px frame, tilted 1.6deg, a filename row in mono, line numbers in ink faint, the key expression in a yellow hit.
- **Set-aside note:** a rough-framed aside hanging under the chapter that rejected the idea, tilted -0.6deg, mascot face at left, pink-ink title.
- **Result panel:** rough frame, marker verdict (pink ink for review, teal ink for approve), mascot mood floated right, SHAP bars below.

### Inputs / Fields
- **Style:** paper-light fill, mono 1rem text, rough 1.8px frame, labels in Patrick Hand SC ink soft. Selects use a hand-drawn chevron.
- **Focus:** global teal-ink ring.
- **Slider:** native range input made transparent over a rough track and a yellow rough knob; value and readout figures in bold mono.

### Navigation
- **Contents rail:** numbered list in Patrick Hand SC ink soft with marker numerals in ink faint; hover gets a 45% yellow wash, the reader's current chapter a full yellow fill (`aria-current`).
- **Mobile:** sticky top strip on paper with an ink bottom rule and a yellow toggle; the list drops below it.
- **Links:** ink text with a 3px teal underline, offset 4px, turning pink on hover.

### Highlighter Swipe (signature)
Inline emphasis as a ragged marker shape: yellow at 90%, pink at 75%, teal at 70% opacity. It sweeps from 0 to full width over 0.9s when its chapter enters the viewport, and is already drawn in the hero and under reduced motion.

### Mascot (signature)
Four inline SVG moods, used as the narrator's reaction: curious (brand), gotcha (the trick), worried (set-asides, risky scores), happy (approve, sign-off). Accessible names state the mood when meaningful; otherwise hidden.

### Charts
Rough.js on SVG: ink axes, pencil-grey hachured context bars, ink-soft dashed guides, highlighter series by the Fixed Meaning Rule, Patrick Hand SC labels, mono numbers. Paths draw on over 1.2s when their chapter arrives.

## Do's and Don'ts

### Do:
- **Do** draw every new outline, underline, arrow, axis and mark with rough.js using a fixed seed, and let CSS supply only the fill beneath it.
- **Do** keep the highlighter meanings fixed: yellow for the one line that matters, pink for the trick or "review", teal for the honest model or "approve".
- **Do** set every checkable number in JetBrains Mono with `calt` and `liga` off.
- **Do** keep prose at the 68ch measure and let figures, tables and interactive pieces reach 62rem.
- **Do** draw marks on as their chapter arrives (ease cubic-bezier(0.16, 1, 0.3, 1)) and show them already drawn under reduced motion.

### Don't:
- **Don't** use box-shadows, blur, or gradients for depth; use a stroke, a paper tone or a tilt.
- **Don't** set text in a raw highlighter colour; use ink, or the pink-ink / teal-ink partner.
- **Don't** use a highlighter as decoration or for a meaning it doesn't already carry.
- **Don't** swap Figtree for a body face with a slashed or dotted zero; "100" must never read "1ØØ".
