/* The four global symbol controls: Sound, Motion, Effects, Quiet everything.
   Loaded in <head> so html[data-motion] and html[data-fx] are set before first paint.
   Defaults are ON. Motion starts off only when the system asks for reduced motion (then it stays off).
   Choices are kept under the versioned keys biot2-sound, biot2-motion, biot2-fx; the page works with storage blocked.
   Other scripts read window.BIOT.state (sound, motion, fx) and listen for the "ctlchange" event on window. */
(() => {
const P = "biot2", root = document.documentElement;
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const get = n => { try { return localStorage.getItem(P + "-" + n); } catch (e) { return null; } };
const put = (n, v) => { try { localStorage.setItem(P + "-" + n, v ? "on" : "off"); } catch (e) {} };
let state = { sound: get("sound") !== "off", motion: reduced ? false : get("motion") !== "off", fx: get("fx") !== "off" };
let prev = null;
const NAMES = { sound: "Sound", motion: "Motion", fx: "Effects" };

const apply = persist => {
  root.dataset.motion = state.motion ? "on" : "off";
  root.dataset.fx = state.fx ? "on" : "off";
  if (persist) Object.keys(NAMES).forEach(k => put(k, state[k]));
  paint();
  window.dispatchEvent(new CustomEvent("ctlchange", { detail: Object.assign({}, state) }));
};
const paint = () => {
  document.querySelectorAll("[data-ctl]").forEach(b => {
    const k = b.dataset.ctl;
    if (k === "quiet") { b.setAttribute("aria-pressed", String(!state.sound && !state.motion && !state.fx)); return; }
    const on = state[k], n = NAMES[k];
    b.setAttribute("aria-pressed", String(on));
    b.setAttribute("aria-label", n + (on ? " on" : " off"));
    b.title = n + (on ? " on. Press to turn off." : " off. Press to turn on.") + (k === "motion" && reduced ? " Your system asks for reduced motion, so motion stays off." : "");
  });
};
const say = m => { const l = document.getElementById("ctl-live"); if (l) l.textContent = m; };

const press = k => {
  if (k === "quiet") {
    const all = !state.sound && !state.motion && !state.fx;
    if (!all) { prev = Object.assign({}, state); state = { sound: false, motion: false, fx: false }; }
    else { const p = prev && (prev.sound || prev.motion || prev.fx) ? prev : { sound: true, motion: true, fx: true };
      state = { sound: p.sound, motion: reduced ? false : p.motion, fx: p.fx }; prev = null; }
    apply(true);
    say(state.sound || state.motion || state.fx ? "Sound, motion and effects are back." : "Everything is quiet: sound, motion and effects are off.");
    if (state.sound && window.Sfx) window.Sfx.play("on");
    return;
  }
  if (k === "motion" && reduced) { say("Your system asks for reduced motion, so motion stays off."); return; }
  state[k] = !state[k]; apply(true);
  say(NAMES[k] + (state[k] ? " on." : " off."));
  if (window.Sfx && state.sound) window.Sfx.play(k === "sound" || state[k] ? "on" : "toggle", false);
};

window.BIOT = { get state() { return state; }, get motion() { return state.motion; }, get fx() { return state.fx; } };
apply(false);

const mount = () => {
  /* the same group on the folder desk, beside the theme switch */
  const src = document.querySelector(".toolbar .sym-group"), tools = document.querySelector("#intro .desk-tools");
  if (src && tools) {
    const c = src.cloneNode(true); c.removeAttribute("id"); c.querySelectorAll("[id]").forEach(e => e.removeAttribute("id"));
    tools.appendChild(c);
  }
  document.querySelectorAll("[data-ctl]").forEach(b => b.addEventListener("click", e => { e.stopPropagation(); press(b.dataset.ctl); }));
  paint();
  setTimeout(() => root.classList.add("ctl-ready"), 80);      // no fade on the first paint of a saved "off"
  initRustle();
};

/* Effects: when a section is reached from the toolbar or a figure link, its heading settles like a sheet being laid down */
function initRustle() {
  document.addEventListener("click", e => {
    const a = e.target.closest(".toolbar a[href^='#'], a.fig-link"); if (!a || !state.fx || !state.motion) return;
    const t = document.querySelector(a.getAttribute("href")), h = t && t.querySelector("h2"); if (!h) return;
    h.classList.remove("rustle"); void h.offsetWidth; h.classList.add("rustle"); setTimeout(() => h.classList.remove("rustle"), 800);
  });
}
document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", mount) : mount();
})();
