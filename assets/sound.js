/* Sound for every report page: quiet, paper-and-lab sound effects, off until the reader turns Sound on.
   Everything is synthesized with the Web Audio API (filtered noise for paper, soft tones for ticks), so there
   are no audio files and no requests. The page needs no changes to its other scripts: this file listens to
   clicks, typing, sliders and hovers on the elements the other scripts already build, and plays a sound for
   each. The choice is remembered on this device. Nothing plays while the tab is hidden. */
(() => {
const KEY = "biot-sound", MAX_VOICES = 60;
let on = false, ctx = null, master = null, noise = null, voices = 0;
const last = {};
try { on = localStorage.getItem(KEY) === "1"; } catch (e) {}

const ensure = () => {
  if (ctx) return true;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  try {
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    master = ctx.createGain(); master.gain.value = 0.28;
    master.connect(comp); comp.connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  } catch (e) { ctx = null; return false; }
  return true;
};
const ready = () => on && ctx && ctx.state === "running" && !document.hidden;
const gap = (k, ms) => { const n = performance.now(); if (n - (last[k] || 0) < ms) return true; last[k] = n; return false; };
const jit = (f, p = 0.05) => f * (1 + (Math.random() * 2 - 1) * p);

/* a soft note: o = {f, to, type, gain, dur, at, attack} */
const tone = o => {
  if (voices >= MAX_VOICES) return;
  const t0 = ctx.currentTime + (o.at || 0), dur = o.dur || 0.05, atk = o.attack || 0.004;
  const osc = ctx.createOscillator(), g = ctx.createGain();
  osc.type = o.type || "sine";
  osc.frequency.setValueAtTime(o.f, t0);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(o.gain || 0.05, t0 + atk);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g); g.connect(master);
  voices++; osc.onended = () => { voices--; };
  osc.start(t0); osc.stop(t0 + dur + 0.05);
};
/* a swish of filtered noise: o = {type, f, to, q, gain, dur, at, attack} */
const swish = o => {
  if (voices >= MAX_VOICES) return;
  const t0 = ctx.currentTime + (o.at || 0), dur = o.dur || 0.2, atk = o.attack || 0.02;
  const src = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = noise;
  fl.type = o.type || "bandpass"; fl.Q.value = o.q || 0.8;
  fl.frequency.setValueAtTime(o.f || 1500, t0);
  if (o.to) fl.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(o.gain || 0.06, t0 + atk);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(fl); fl.connect(g); g.connect(master);
  voices++; src.onended = () => { voices--; };
  src.start(t0, Math.random() * 0.5); src.stop(t0 + dur + 0.05);
};

/* paper is a texture, not a note: a pop of noise, many tiny crackles, a soft low thump. */
const R = (a, b) => a + Math.random() * (b - a);
const grain = (at, f, gain, dur = 0.01, q = 1.2, type = "bandpass") => swish({ at, f, q, gain, dur, type, attack: 0.001 });
const crackle = (at, n, span, f0, f1, gain) => {          // the fibres of the sheet: n tiny irregular clicks
  for (let i = 0; i < n; i++) grain(at + R(0, span), R(f0, f1), gain * R(0.35, 1), R(0.004, 0.014), R(0.8, 2.5), Math.random() < 0.3 ? "highpass" : "bandpass");
};
const thump = (at, gain, f = 110) => { swish({ at, type: "lowpass", f: 320, q: 0.7, gain, dur: 0.07, attack: 0.002 }); tone({ at, f, to: f * 0.6, dur: 0.1, gain: gain * 0.5, attack: 0.002 }); };

const FX = {
  slide() {                                                // a folder drags across the desk, then settles
    swish({ type: "lowpass", f: 900, to: 1900, q: 0.6, dur: 0.34, gain: 0.09, attack: 0.05 });
    swish({ f: 3200, to: 2200, q: 0.5, dur: 0.3, gain: 0.03, attack: 0.04 });
    crackle(0.02, 16, 0.28, 2200, 6500, 0.05);
    thump(0.3, 0.1);
  },
  cover() {                                                // the cover lifts and the sheets inside shift
    swish({ f: 1100, to: 3600, q: 0.5, dur: 0.5, gain: 0.06, attack: 0.08 });
    swish({ type: "lowpass", f: 260, to: 520, q: 0.7, dur: 0.4, gain: 0.04, attack: 0.1 });   // the card flexing
    crackle(0.05, 24, 0.5, 1800, 6000, 0.045);
    thump(0.52, 0.04, 140);
  },
  shut() {                                                 // the cover swings down onto the sheets
    swish({ f: 3600, to: 1100, q: 0.5, dur: 0.4, gain: 0.06, attack: 0.05 });
    crackle(0, 18, 0.35, 1800, 6000, 0.045);
    thump(0.36, 0.11, 100);
  },
  page() {                                                 // one sheet turned: a quick swoosh, fibres, a soft flap
    swish({ f: 1300, to: 4800, q: 0.5, dur: 0.15, gain: 0.1, attack: 0.025 });
    crackle(0.02, 9, 0.16, 2600, 7000, 0.06);
    swish({ at: 0.15, type: "lowpass", f: 1800, q: 0.7, dur: 0.05, gain: 0.05, attack: 0.003 });
  },
  tab() { grain(0, R(1400, 1800), 0.08, 0.02, 0.7, "lowpass"); grain(0.002, 700, 0.04, 0.012, 0.7, "lowpass"); },       // a finger on an index divider
  tick() { grain(0, R(3800, 5200), 0.04, 0.009, 2); },
  toggle(up) {                                             // two light taps on the page; the second is higher when it turns on
    grain(0, 1500, 0.07, 0.02, 0.7, "lowpass");
    grain(0.055, up ? 2400 : 1000, 0.06, 0.022, 0.7, "lowpass");
  },
  theme(i) {                                               // a page flipped over: the lower the mode, the lower the rustle
    const f = [2600, 3200, 2000][i] || 2600;
    swish({ f, to: f * 1.5, q: 0.6, dur: 0.12, gain: 0.07, attack: 0.02 });
    crackle(0.01, 7, 0.12, f * 0.8, f * 2, 0.05);
    grain(0.13, 1500, 0.05, 0.02, 0.7, "lowpass");
  },
  key() { const n = 2 + Math.floor(Math.random() * 2); for (let i = 0; i < n; i++) grain(i * R(0.006, 0.012), R(5000, 8500), R(0.018, 0.03), R(0.005, 0.01), 1.5, "highpass"); },   // a pencil's scratch
  blip(x) { grain(0, 2400 + x * 3600, 0.025, 0.012, 3); },
  range(v) { for (let i = 0; i < 3; i++) grain(i * R(0.008, 0.014), 3000 + v * 4200 + R(-300, 300), R(0.025, 0.04), R(0.006, 0.012), 1.5, "highpass"); },
  pin() { grain(0, 800, 0.1, 0.035, 0.8, "lowpass"); tone({ f: 190, to: 120, dur: 0.07, gain: 0.05, attack: 0.002 }); crackle(0.01, 3, 0.04, 2000, 5000, 0.03); },   // a knuckle on the desk
  click() { grain(0, 1800, 0.06, 0.016, 0.7, "lowpass"); },
  on() { swish({ f: 1500, to: 3500, q: 0.5, dur: 0.18, gain: 0.06, attack: 0.03 }); crackle(0.02, 8, 0.18, 2200, 6500, 0.05); grain(0.2, 1600, 0.05, 0.02, 0.7, "lowpass"); },
};
const play = (name, arg) => { if (!ready() || !FX[name]) return; try { FX[name](arg); } catch (e) {} };
window.Sfx = { play, get on() { return on; } };

/* ---------- the switch (a toolbar button on report pages, a small one on the folder desk) ---------- */
const buttons = [];
const paint = () => buttons.forEach(b => { b.setAttribute("aria-pressed", String(on)); b.textContent = on ? "♪ Sound on" : "♪ Sound off"; });
const toggle = () => {
  if (on) { play("click"); on = false; }
  else { if (!ensure()) return; on = true; ctx.resume().then(() => play("on")).catch(() => {}); }
  try { localStorage.setItem(KEY, on ? "1" : "0"); } catch (e) {}
  paint();
};
const wake = () => { if (on && ensure() && ctx.state === "suspended") ctx.resume().catch(() => {}); };
const addButton = (host, cls, before) => {
  if (!host) return;
  const b = document.createElement("button");
  b.type = "button"; b.className = cls; b.dataset.sfx = "switch"; b.setAttribute("aria-label", "Sound effects on or off");
  b.addEventListener("click", e => { e.stopPropagation(); toggle(); });
  before ? host.insertBefore(b, before) : host.appendChild(b);
  buttons.push(b);
};
/* this script runs before the toolbar is parsed, so the buttons are added once the page is ready */
const mount = () => {
  addButton(document.querySelector(".toolbar .in"), "", document.getElementById("theme-btn"));
  addButton(document.querySelector("#intro .desk"), "desk-sound");
  paint(); watchSections();
};
document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", mount) : mount();
if (on) ["pointerdown", "keydown"].forEach(n => addEventListener(n, wake, { once: true, capture: true }));  // a remembered choice starts at the first click
document.addEventListener("visibilitychange", () => { if (!document.hidden) wake(); });

/* ---------- what plays when ---------- */
document.addEventListener("click", e => {
  const t = e.target;
  if (t.closest("[data-sfx]")) return;                                                          // the Sound switch makes its own sound
  if (t.closest(".fold")) { play("slide"); setTimeout(() => play("cover"), 780); return; }       // the cover opens once the folder has grown
  if (t.closest(".book-close")) { play("shut"); return; }
  if (t.closest("#contents-btn")) { play("cover"); return; }
  if (t.closest("#intro .toc a, #intro .toc-start")) { play("page"); return; }
  if (t.closest("#intro .nb-tabs a")) { play("tab"); return; }
  if (t.closest("#theme-btn")) { setTimeout(() => play("theme", ["auto", "light", "dark"].indexOf(document.documentElement.dataset.theme || "auto")), 0); return; }  // after the click has changed the theme
  if (t.closest(".toolbar a[href^='#']")) { play("page"); return; }
  const seg = t.closest(".seg button, .chips button");
  if (seg) { setTimeout(() => play("toggle", seg.classList.contains("on")), 0); return; }   // higher when it turns on
  if (t.closest("#kg svg circle")) { play("pin"); return; }                                  // a graph node is pinned
  if (t.closest("button")) play("click");
}, true);
document.addEventListener("input", e => {
  const el = e.target;
  if (el.matches("input[type=range]")) { if (!gap("range", 55)) play("range", (el.value - (el.min || 0)) / ((el.max || 100) - (el.min || 0))); }
  else if (el.matches("input[type=search], input[type=text]")) { if (!gap("key", 35)) play("key"); }
});
/* hovering a mark in any figure: a faint blip whose pitch follows its place across the figure */
let over = null;
document.addEventListener("pointerover", e => {
  if (e.pointerType === "touch") return;
  const m = e.target.closest && e.target.closest("svg circle, svg rect, svg path, svg g[class], svg .node, svg .dot");
  if (!m || m === over || !m.closest("svg")) return;
  over = m;
  if (gap("blip", 70)) return;
  const svg = m.closest("svg"), b = m.getBoundingClientRect(), s = svg.getBoundingClientRect();
  if (!s.width || b.width > s.width * 0.6) return;                                   // skip backgrounds and big panels
  play("blip", Math.min(1, Math.max(0, (b.left + b.width / 2 - s.left) / s.width)));
});

/* the section being read changes: a quiet tick */
function watchSections() {
  const links = [...document.querySelectorAll(".toolbar a[href^='#']")];
  if (!window.IntersectionObserver || !links.length) return;
  let cur = null;
  const so = new IntersectionObserver(es => es.forEach(en => {
    if (en.isIntersecting && cur !== en.target.id) { if (cur !== null) play("tick"); cur = en.target.id; }
  }), { rootMargin: "-40% 0px -55% 0px" });
  links.forEach(a => { const s = document.querySelector(a.getAttribute("href")); if (s) so.observe(s); });
}
})();
