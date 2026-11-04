/* Shared by every report page: toolbar highlight of the section being read, and the light/dark switch. */
/* highlight the section being read */
const links = [...document.querySelectorAll(".toolbar a[href^='#']")];
const so = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) links.forEach(a => a.classList.toggle("on", a.getAttribute("href") === "#" + e.target.id));
}), {rootMargin:"-40% 0px -55% 0px"});
links.forEach(a => so.observe(document.querySelector(a.getAttribute("href"))));


/* The shared light / dark / auto setting. localStorage "theme" is the same on every page of dhairyab0069.github.io;
   the inline script in <head> applied it before first paint. */
(() => {
  const root = document.documentElement, mq = matchMedia("(prefers-color-scheme: dark)");
  const valid = m => (m === "light" || m === "dark" ? m : "auto");
  const resolve = m => (m === "auto" ? (mq.matches ? "dark" : "light") : m);
  const read = () => { try { return valid(localStorage.getItem("theme")); } catch (e) { return "auto"; } };
  let mode = valid(root.dataset.themeMode), theme = root.dataset.theme || resolve(mode);
  const first = document.querySelector(".toolbar .theme-switch");
  const tools = document.querySelector("#intro .desk-tools");
  if (first && tools) { const c = first.cloneNode(true); tools.insertBefore(c, tools.firstChild); }   // the same control on the folder desk
  const switches = [...document.querySelectorAll(".theme-switch")];
  const apply = () => {
    root.dataset.themeMode = mode; root.dataset.theme = theme; root.style.colorScheme = theme;
    switches.forEach(sw => sw.querySelectorAll("[data-theme-mode]").forEach(b => b.setAttribute("aria-checked", String(b.dataset.themeMode === mode))));
    window.redrawCharts && window.redrawCharts();
    window.dispatchEvent(new CustomEvent("themechange", { detail: { mode, theme } }));
  };
  const reduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches || (window.BIOT && !window.BIOT.motion);
  /* a circle reveal from the control, or a short crossfade; instant when motion is reduced */
  const change = (commit, origin) => {
    if (reduce()) { commit(); return; }
    if (document.startViewTransition) {
      const r = (origin || document.body).getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
      const rad = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      const vt = document.startViewTransition(commit);
      vt.ready.then(() => root.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${rad}px at ${x}px ${y}px)`] },
        { duration: 550, easing: "cubic-bezier(.33,1,.68,1)", pseudoElement: "::view-transition-new(root)" })).catch(() => {});
      return;
    }
    root.classList.add("theme-fade"); commit(); setTimeout(() => root.classList.remove("theme-fade"), 450);
  };
  const set = (next, origin, store = true, quiet = false) => {
    if (next === mode) return;
    mode = next;
    if (store) { try { localStorage.setItem("theme", mode); } catch (e) {} }
    const t = resolve(mode);
    if (!quiet && window.Sfx) window.Sfx.play("theme", ["auto", "light", "dark"].indexOf(mode));
    if (t === theme) { apply(); return; }
    change(() => { theme = t; apply(); }, origin);
  };
  switches.forEach(sw => {
    sw.addEventListener("click", e => { const b = e.target.closest("[data-theme-mode]"); if (b) set(b.dataset.themeMode, b); });
    sw.addEventListener("keydown", e => {   // arrow keys move through the radio group
      const k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]; if (!k) return;
      const all = [...sw.querySelectorAll("[data-theme-mode]")], n = all[(all.indexOf(document.activeElement) + k + all.length) % all.length];
      n.focus(); set(n.dataset.themeMode, n); e.preventDefault();
    });
  });
  /* another page or tab changed the setting: follow it live */
  addEventListener("storage", e => { if (e.key === "theme" || e.key === null) set(read(), null, false, true); });
  /* in auto, follow the system */
  mq.addEventListener("change", () => { if (mode === "auto" && resolve("auto") !== theme) change(() => { theme = resolve("auto"); apply(); }, first); });
  apply();
})();
