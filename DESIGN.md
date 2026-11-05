# BIOT 6900 report: design

Keep this file current: every change to the page gets a line under "Decisions and trade-offs".

## Purpose
A student coursework report on Alzheimer's disease target discovery (BIOT 6900), written up like a medical report: a summary of findings, one section per module with lab-style tables and flags, interactive figures (including 3D AlphaFold structures and a knowledge graph) and the report PDFs. Readers are the course team and anyone following the work. Two pages: `index.html` (Deliverable 1) and `deliverable2.html` (Deliverable 2). The opening is a desk with one manila folder per deliverable.
Project type: report page.

## Theme choice and why
Theme: an e-ink medical report (paper, ink, hairline rules, one accent that is the ink itself). Chosen because the content is a report: a calm, high-contrast reading surface keeps attention on the numbers, and the same page reads well printed (`@media print` hides the toolbar and controls). The folder opening is the one place that borrows a physical metaphor, because choosing between deliverables is the one thing a reader does before reading.
Type: a system book-face stack, `Bookerly, Charter, Iowan Old Style, Palatino Linotype, Book Antiqua, Cambria, Georgia, Times New Roman, serif`. No web font is loaded (Literata was removed); Charter and Iowan cover Apple devices, Palatino and Cambria cover Windows, Georgia is the floor. Sans and mono roles reuse the serif on purpose so the report keeps one voice.

## Tokens
Defined once at the top of `assets/report.css`; components read roles, never raw values.

| Token | Light | Dark |
|---|---|---|
| `--desk` | `#dcdad3` | `#0c0c0b` |
| `--paper` | `#f4f2ec` | `#161614` |
| `--ink` / `--accent` / `--link` | `#1b1b19` | `#e4e2dc` |
| `--muted` | `#55544f` | `#a3a19a` |
| `--rule` / `--rule2` | `#b9b6ad` / `#e1ded6` | `#3d3c38` / `#272624` |
| `--accent-soft` | `#e7e4dc` | `#22211f` |
| `--manila` / `--manila-dark` / `--manila-in` / `--folder-ink` | `#dcc493` / `#c7ab73` / `#e9dbb8` / `#2b2418` | `#7a6744` / `#62522f` / `#86754f` / `#f3ead6` |
| flags `--flag-h`, `--flag-l`, `--ok`, `--warn` (+ `-soft`) | red, blue, green, amber on pale tints | lighter tints on dark tints |

Both colour sets are designed, not inverted. Figure colours (`--c1`, `--c2`, `--c3`, `--grey`) are re-read by the charts on every theme change.

## Theme
The theme always follows the system (`prefers-color-scheme`); there is no switch and no stored choice. An inline script in `<head>` sets `data-theme-mode="auto"` and `data-theme` on `<html>` before first paint, tokens live under `:root[data-theme="dark"]` with a `prefers-color-scheme` fallback for no-JS, and `assets/page.js` follows a system change live and dispatches `themechange` so the charts and 3D viewer re-read their colours (an instant change, no transition).

## The four symbol controls
Sound, Motion, Effects and Quiet everything: icon-only inline SVG buttons (24 px viewBox, stroke 1.8, round caps), each a real `<button>` with `aria-pressed`, an `aria-label` that states the state ("Sound on"), a `title`, a 44 px target and a visible focus ring. State is shown by glyph and fill, not colour alone: Sound is a speaker (waves on, slash off), Motion is flowing waves (pause bars off), Effects is a sparkle (four-point star plus two small sparkles on, star with a slash off), Quiet everything is a circle with a bar. No control shares a shape with the theme sun or moon. They sit in the toolbar and again on the folder desk. On a phone the toolbar scrolls sideways, so these controls come first and stay in view.
- Defaults: all three start ON. Motion starts off only when the system asks for reduced motion, and then stays off (the button explains why).
- Storage: `biot2-sound`, `biot2-motion`, `biot2-fx` (versioned, so an old saved "off" cannot carry over). Every read and write is in try/catch; the page works with storage blocked.
- Quiet everything turns all three off; pressed again it restores exactly the previous state.
- Logic lives in `assets/controls.js` (loaded in `<head>`, so `html[data-motion]` and `html[data-fx]` are set before first paint). Other scripts read `window.BIOT.state` and listen for `ctlchange` on `window`.

## Motion spec
- Personality: still and paper-like. There are no ambient loops; motion exists for orientation (a folder grows from its place on the desk, the cover opens, a sheet turns) and feedback.
- Folder opening: 600 to 750 ms grow/shrink (Web Animations), 1.4 s cover opening (CSS keyframes), 0.7 s sheet in/out. Plays once per tab on the first visit; skipped when the system asks for reduced motion.
- Other: the knowledge graph settles in a force simulation, the lead-target 3D model turns slowly, the structure viewer's Spin button turns the model, d3 zoom moves take 500 to 700 ms.
- Gate: Motion on AND the system not reduced. Otherwise `html[data-motion="off"]` (and `@media (prefers-reduced-motion)`) sets every CSS animation to 0 s and every transition to none, so everything lands in its final state at once. JS follows one gate, `window.BIOT.motion`: folder moves resolve immediately, d3 zoom durations are 0, the graph is laid out in one step (300 ticks) instead of animating, and 3D spins stop. The one exception is dragging a graph node, which is direct manipulation: it moves the node while you hold it and nothing more.
- Only transform, opacity and clip-path animate.

## Sound spec
- Palette: paper (all synthesized with Web Audio: filtered noise, tiny crackles, soft thumps and a few quiet tones; no files, no requests). Master gain 0.28 through a compressor; voice cap 60; per-cue minimum gaps (hover blips 70 ms, typing 35 ms, slider 55 ms).
- Cues: slide and cover (a folder dragged across the desk, its cover lifting), shut, page (a sheet turned), tab (an index divider), tick (the section being read changed), toggle (two taps, higher when a chip turns on), theme (a rustle that is lower for darker modes), key (a pencil's scratch), blip (a figure mark hovered, pitch follows its place across the figure), range (sliders), pin (a graph node pinned), click, on.
- Unlock: the audio context is created and resumed on the first pointer, key or touch, because browsers keep audio locked until a gesture. The folder opening plays on a first visit, so its sounds begin once the first click on a folder has unlocked audio. Turning Sound on from the button unlocks at once.
- Sound is on by default and the Sound button mutes it. Nothing plays while the tab is hidden. Every cue accompanies a visible change.

## Effects spec
Effects are decorative and can be switched off without losing any content:
- Paper-rustle: the heading of a section settles (a short, small movement) when it is reached from the toolbar or a figure link. Needs Motion on as well.

## Interaction inventory
| Where | Interaction | Feedback (motion, sound) |
|---|---|---|
| Folder desk | pick a folder, back to desk, Esc | folder grows and opens, slide + cover cues |
| Contents page | pick a section | sheets leave, page cue, jump to the section |
| Toolbar | section links, Contents, four controls, Print | page cue, heading settles (Effects), controls announce state |
| Tables and text | none beyond reading | section tick while scrolling |
| Figures | hover marks, sliders, chips, search, drag, zoom | tooltip, blip, toggle and key cues |
| Structure viewer (Fig 3) | pick ITGAX or APLNR, drag to rotate, Spin, hover residues | 3Dmol from `assets/vendor/`, tooltip, spin gated by Motion |
| Knowledge graph (Deliverable 2) | filter by kind, search, pin and drag nodes, zoom | force layout (instant with Motion off), pin cue |

## Accessibility notes
- Contrast: ink on paper is above 12:1 in both modes; muted text is at least 4.5:1; focus rings are 2 px ink.
- Keyboard: every control is a real button or link; the folder opening moves focus into the contents and Esc skips it.
- Reduced motion: the system setting starts Motion off, and the intro is skipped.
- Screen readers: control state is in `aria-pressed` and `aria-label`, changes are announced through a polite live region; figures keep their labels and tables carry the numbers; the 3D viewer has a static figure fallback when WebGL is off.
- Print: toolbar and controls are hidden.

## No external requests
Everything is served from this repo. Removed: Google Fonts (Literata) and the CDN copies of 3Dmol and d3. Vendored in `assets/vendor/`: `3Dmol-min.js` 2.4.2 (with its `3Dmol-min.js.LICENSE.txt`, BSD-3-Clause) and `d3.min.js` 7.9.0 (ISC; the license line is the first line of the file). The page works offline once loaded.

## Decisions and trade-offs
| Date | Decision | Why |
|---|---|---|
| 2026-11-04 | Joined the shared design language: four symbol controls, defaults on, versioned `biot2-*` keys | owner preference; older `biot-sound` (off) is ignored |
| 2026-11-04 | System serif stack instead of Literata | no external font request; Charter/Georgia keep the report feel |
| 2026-11-04 | Vendored 3Dmol 2.4.2 and d3 7.9.0 | no CDN requests, works offline; same pinned versions as before |
| 2026-11-04 | Motion off lays the graph out in one step | a force layout is a loop; the result is the same graph |
| 2026-11-04 | Kept the report's `document.write` cache-busting for its own scripts | an existing choice so updated figures never come from a stale cache; vendored libraries load plainly |
| 2026-11-04 | No ambient particle field | it would fight the e-ink report feel; Effects are small and local instead |

## How to extend
- A new deliverable: add a page like `deliverable2.html` (with `<body data-book="dN">`, the toolbar markup including the symbol group) and an entry in `BOOKS` in `assets/intro.js`.
- A new animation: wrap it in `window.BIOT.motion` (JS) or rely on the `html[data-motion="off"]` rule (CSS); never add a loop that ignores them.
- A new decorative effect: scope its CSS under `html[data-fx="on"]` or check `window.BIOT.fx`.
- A new sound: add a function to `FX` in `assets/sound.js` and call `Sfx.play("name")`; keep gains small.
- Tokens: change the top of `assets/report.css`; never hard-code a colour in a component.
- Tests: `node tests/hygiene.js`; audit: `node ~/.claude/skills/dynamic-web-design/scripts/check_site.js .`.
