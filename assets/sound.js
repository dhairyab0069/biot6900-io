/* Sound for every report page: quiet, paper-and-lab sound effects, off until the reader turns Sound on.
   Everything is synthesized with the Web Audio API (filtered noise for paper, soft tones for ticks), so there
   are no audio files and no requests. The page needs no changes to its other scripts: this file listens to
   clicks, typing, sliders and hovers on the elements the other scripts already build, and plays a sound for
   each. The choice is remembered on this device. Nothing plays while the tab is hidden. */
(() => {
const KEY = "biot-sound", MAX_VOICES = 20;
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

const FX = {
  slide() { swish({ f: 700, to: 2600, dur: 0.3, gain: 0.07 }); tone({ f: 110, to: 70, dur: 0.12, gain: 0.07, at: 0.24 }); },   // a folder slides off the shelf
  cover() { swish({ f: 400, to: 1800, q: 1.2, dur: 0.45, gain: 0.06 }); tone({ f: 170, to: 260, type: "triangle", dur: 0.3, gain: 0.025 }); }, // its cover swings open
  shut() { swish({ f: 1800, to: 400, q: 1.2, dur: 0.4, gain: 0.06 }); tone({ f: 120, to: 70, dur: 0.14, gain: 0.07, at: 0.34 }); },
  page() { swish({ type: "highpass", f: 3200, to: 1400, dur: 0.16, gain: 0.07, attack: 0.01 }); tone({ f: 900, type: "triangle", dur: 0.03, gain: 0.03, at: 0.1 }); }, // a page is turned
  tab() { tone({ f: jit(720), type: "triangle", dur: 0.03, gain: 0.05 }); },
  tick() { tone({ f: 1250, dur: 0.018, gain: 0.03 }); },
  toggle(up) { tone({ f: up ? 880 : 620, type: "triangle", dur: 0.04, gain: 0.05 }); tone({ f: up ? 1320 : 440, type: "triangle", dur: 0.05, gain: 0.04, at: 0.045 }); },
  theme(i) { [523, 659, 784].slice(0, 2).forEach((f, k) => tone({ f: f * [1, 1.26, 0.8][i], dur: 0.07, gain: 0.05, at: k * 0.06 })); },
  key() { tone({ f: jit(1500, 0.12), type: "triangle", dur: 0.014, gain: 0.03, attack: 0.002 }); },
  blip(x) { tone({ f: 420 + x * 560, dur: 0.035, gain: 0.025 }); },
  range(v) { tone({ f: 380 + v * 800, type: "triangle", dur: 0.03, gain: 0.04, attack: 0.002 }); },
  pin() { tone({ f: 660, dur: 0.14, gain: 0.06 }); tone({ f: 990, dur: 0.18, gain: 0.04, at: 0.05 }); },
  click() { tone({ f: 1100, type: "triangle", dur: 0.02, gain: 0.04 }); },
  on() { tone({ f: 523, dur: 0.14, gain: 0.05 }); tone({ f: 784, dur: 0.22, gain: 0.05, at: 0.1 }); },
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
