# Alzheimer's Target Report (BIOT 6900 site)

The web page for my BIOT 6900 coursework: https://dhairyab0069.github.io/biot6900-io/

It is written up like a medical report: a summary of findings, one section per module with lab-style results tables and flags, interactive figures (including 3D AlphaFold structures), and the report PDFs. The code, notebooks and data sources are in the main repository: https://github.com/dhairyab0069/biot6900

| Path | What it is |
|---|---|
| `index.html` | Deliverable 1: Alzheimer's target discovery (Modules 1–4, 6 and Portfolio 1) |
| `deliverable2.html` | Deliverable 2: drug response and variant interpretation (Module 5, more to come) |
| `assets/report.css`, `assets/intro.js`, `assets/page.js` | Shared by every page: the e-ink styling, the folder opening (one folder per deliverable, set in `intro.js`), the theme switch |
| `assets/fig/` | Figures copied from the module folders in the main repository |
| `assets/reports/` | Report PDFs copied from the main repository |
| `assets/sound.js` | Sound effects, on by default: paper and tick sounds made live with the Web Audio API (no audio files), played for the folders, section links, toggles, sliders, typing and figure hovers. Browsers keep audio locked until the first click, key press or touch |
| `assets/controls.js` | The four symbol controls (Sound, Motion, Effects, Quiet everything) and the shared state the other scripts read (`window.BIOT`) |
| `assets/vendor/` | 3Dmol.js 2.4.2 and d3 7.9.0 with their licenses, served from here so the page makes no external requests and works offline |
| `assets/charts.js` | The interactive figures (plain SVG, plus 3Dmol.js for the 3D structures) |
| `assets/data/` | Gene-level and group-level numbers behind the charts, exported by `scripts/build_data.py` |
| `assets/structures/` | AlphaFold models of ITGAX (P20702) and APLNR (P35414) for the 3D viewer |
| `scripts/build_data.py` | Re-exports `assets/data/` and `assets/structures/` from a local copy of the main repository (needs each module's data folder) |

## Controls and defaults

Four icon buttons sit next to the theme switch in the toolbar and on the folder desk: Sound (speaker), Motion (waves), Effects (sparkle) and Quiet everything (circle with a bar). Sound, Motion and Effects all start on; Motion starts off only if your system asks for reduced motion. Quiet everything turns all three off and, pressed again, brings back exactly what was on before. Motion off makes the folder opening, figure transitions, graph layout and 3D spins instant; Effects covers the pointer lens, figure glow and the heading settle. The choices are kept on this device under `biot2-sound`, `biot2-motion` and `biot2-fx`. The first click on a folder is what unlocks audio, so the opening's own sounds begin from then. The page makes no external requests. Design notes are in `DESIGN.md`; `node tests/hygiene.js` checks the controls, defaults and external requests.

## Light, dark and auto

The icon switch in the toolbar (and on the folder desk) picks Light, Dark or Auto (follow the system). The choice is saved as `theme` in `localStorage`, which every site on dhairyab0069.github.io shares, so changing it here changes it on the other sites too, live in any open tab. A small script in the page head applies it before the first paint, so there is no flash. The charts and 3D viewer re-read their colours when it changes, the change animates as a short circle reveal (instant with reduced motion), and Sound adds a paper rustle. `node tests/hygiene.js` checks the wiring.

Dhairya Bhatia · Northeastern University
