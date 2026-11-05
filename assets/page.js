/* Shared by every report page: toolbar highlight of the section being read, and the light/dark switch. */
/* highlight the section being read */
const links = [...document.querySelectorAll(".toolbar a[href^='#']")];
const so = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) links.forEach(a => a.classList.toggle("on", a.getAttribute("href") === "#" + e.target.id));
}), {rootMargin:"-40% 0px -55% 0px"});
links.forEach(a => so.observe(document.querySelector(a.getAttribute("href"))));


/* The theme always follows the system (prefers-color-scheme); there is no switch. The inline script in <head> applied it before first paint;
   this keeps it in step if the system changes while the page is open. */
(() => {
  const root = document.documentElement, mq = matchMedia("(prefers-color-scheme: dark)");
  const apply = () => {
    const theme = mq.matches ? "dark" : "light";
    if (root.dataset.theme === theme) return;
    root.dataset.themeMode = "auto"; root.dataset.theme = theme; root.style.colorScheme = theme;
    window.redrawCharts && window.redrawCharts();
    window.dispatchEvent(new CustomEvent("themechange", { detail: { mode: "auto", theme } }));
  };
  mq.addEventListener("change", apply);
  apply();
})();
