/* Shared by every report page: toolbar highlight of the section being read, and the light/dark switch. */
/* highlight the section being read */
const links = [...document.querySelectorAll(".toolbar a[href^='#']")];
const so = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) links.forEach(a => a.classList.toggle("on", a.getAttribute("href") === "#" + e.target.id));
}), {rootMargin:"-40% 0px -55% 0px"});
links.forEach(a => so.observe(document.querySelector(a.getAttribute("href"))));


(() => {
  const btn = document.getElementById("theme-btn"), root = document.documentElement;
  const order = ["auto", "light", "dark"], label = {auto:"◐ Auto", light:"☀ Light", dark:"☾ Dark"};
  const cur = () => root.dataset.theme || "auto";
  const show = () => { btn.textContent = label[cur()]; btn.title = "Theme: " + cur() + " (click to change)"; };
  btn.addEventListener("click", () => {
    const next = order[(order.indexOf(cur()) + 1) % order.length];
    if (next === "auto") delete root.dataset.theme; else root.dataset.theme = next;
    try{ next === "auto" ? sessionStorage.removeItem("theme") : sessionStorage.setItem("theme", next); }catch(e){}
    show(); window.redrawCharts && window.redrawCharts();
  });
  show();
})();
