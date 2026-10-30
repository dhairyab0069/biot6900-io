/* Opening for every report page: a desk with one manila folder per deliverable. The picked folder grows to
   full size and opens to its contents page; picking a section closes it into that deliverable's report.
   "❮ Contents" in the toolbar reopens the current page's folder, and "Back to all folders" returns to the desk.
   Plays once per tab; skipped for reduced motion.

   To add a deliverable: give it a page like deliverable2.html (with <body data-book="dN">) and an entry below. */
(() => {
const BOOKS = [
  {id:"d1", page:"index.html", tab:"Deliverable 1", title:"Alzheimer's Disease Target Discovery",
   sub:"Modules 1–4, 6 · Portfolio 1", stamp:"✓ Done", done:true,
   card:`<span>Computational Biology Coursework Report</span><hr><b>Alzheimer's Disease Target Discovery</b><span>From genes to drug targets, one module at a time</span><hr><span>Dhairya Bhatia · BIOT 6900<br>Northeastern University · 29 October 2026</span>`,
   toc:[["#summary","","Summary of findings"],["#s1","1","Setup and first queries"],["#s2","2","Multi-omics evidence"],
        ["#s3","3","Druggability assessment"],["#s4","4","Structural assessment"],["#s5","5","Impression: target shortlist"],
        ["#s6","6","Polygenic risk across ancestries"]]},
  {id:"d2", page:"deliverable2.html", tab:"Deliverable 2", title:"Drug Response and Variant Interpretation",
   sub:"Module 5 · more to come", stamp:"In progress", done:true,
   card:`<span>Computational Biology Coursework Report</span><hr><b>Drug Response and Variant Interpretation</b><span>How a patient's DNA changes the way a drug works</span><hr><span>Dhairya Bhatia · BIOT 6900<br>Northeastern University</span>`,
   toc:[["#summary","","Summary of findings"],["#s1","1","Pharmacogenomics: CYP2C19"]]},
  {id:"d3", tab:"Deliverable 3", title:"Deliverable 3", sub:"Not started yet", stamp:"Placeholder", done:false,
   card:`<span>BIOT 6900</span><hr><b>Deliverable 3</b><span>Placeholder</span>`},
];

const body = document.body, here = body.dataset.book || "d1";
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const page = location.pathname.split("/").pop() || "index.html";

/* ---------- markup ---------- */
const intro = document.createElement("div");
intro.id = "intro"; intro.setAttribute("role", "dialog"); intro.setAttribute("aria-label", "Deliverables and contents");
intro.innerHTML = `
  <div class="stage">
    <div class="nb" tabindex="-1" aria-label="Open folder">
      <div class="nb-back"></div>
      <div class="nb-tabs"></div>
      <div class="nb-sheet d1-sheet">
        <div class="toc-h">Contents</div>
        <div class="toc-sub">Page numbers are screen pages on this device</div>
        <ol class="toc"></ol>
        <div class="toc-foot"><button class="book-close" type="button">← Back to all folders</button><a class="toc-start" href="#top">Start reading →</a></div>
      </div>
      <div class="nb-sheet ph-sheet">
        <div class="toc-h">Contents</div>
        <div class="toc-sub">Placeholder</div>
        <p>This folder is kept for <b class="ph-name">the next deliverable</b>. When I work on it, its report, contents page and page markers will go here, opening the same way as the others.</p>
        <ul><li>Report</li><li>Figures</li><li>Contents and page markers</li><li>Interactive figures</li></ul>
        <div class="toc-foot"><button class="book-close" type="button">← Back to all folders</button></div>
      </div>
      <div class="nb-cover"><div class="f"></div><div class="b"></div></div>
    </div>
  </div>
  <div class="desk">
    <h2>BIOT 6900 · Deliverables</h2>
    <div class="folders"></div>
    <div class="desk-note">Pick a folder to open it</div>
  </div>`;
body.prepend(intro);
const nb = intro.querySelector(".nb"), stage = intro.querySelector(".stage"), shelf = intro.querySelector(".folders");

BOOKS.forEach(b => shelf.insertAdjacentHTML("beforeend",
  `<button type="button" class="fold${b.toc ? "" : " ph"}" data-id="${b.id}" aria-label="${b.tab}: ${b.title}${b.toc ? "" : " (placeholder)"}">
     <span class="fold-back"></span><span class="fold-paper"></span>
     <span class="fold-front"><span class="fold-tab">${b.tab}</span><b>${b.title}</b><small>${b.sub}</small><span class="stamp${b.stamp === "✓ Done" ? "" : " soft"}">${b.stamp}</span></span>
   </button>`));
const thumb = id => shelf.querySelector(`.fold[data-id="${id}"]`);
const book = id => BOOKS.find(b => b.id === id);
const sameDoc = b => b.page === page || (b.page === "index.html" && page === "");

/* fill the big folder for one deliverable */
const select = id => {
  const b = book(id); intro.dataset.book = b.toc ? "d1" : "ph"; intro.dataset.id = id;
  intro.querySelector(".nb-cover .f").innerHTML =
    `<span class="ftab">${b.tab}</span><small>BIOT 6900 · Dhairya Bhatia</small><b>${b.title}</b><span>${b.sub}</span><span class="stamp">${b.stamp}</span>`;
  intro.querySelector(".nb-cover .b").innerHTML = `<div class="card">${b.card}</div>`;
  intro.querySelector(".ph-name").textContent = b.tab;
  if (!b.toc) return;
  const local = sameDoc(b);
  intro.querySelector(".toc").innerHTML = b.toc.map(([h, n, t]) =>
    `<li><a href="${h}" data-page="${b.page}"><span class="n">${n}</span><span>${t}</span><span class="lead"></span><span class="pg" data-for="${local ? h : ""}"></span></a></li>`).join("");
  intro.querySelector(".toc").classList.toggle("short", b.toc.length < 5);   // a short list sits at the top
  intro.querySelector(".toc-sub").textContent = local ? "Page numbers are screen pages on this device" : "Opens the " + b.tab + " report";
  intro.querySelector(".toc-start").dataset.page = b.page;
  const step = Math.min(9.6, 84 / b.toc.length);
  intro.querySelector(".nb-tabs").innerHTML = b.toc.map(([h, n, t], i) =>
    `<a href="${h}" data-page="${b.page}" style="top:${(8 + i * step).toFixed(1)}%" title="${t}">${n || "S"}</a>`).join("");
};

/* ---------- motion ---------- */
let state = "desk", fromReport = false;
const flip = (id, toThumb) => {                     // grow the folder from its spot on the desk, or shrink it back
  const t = thumb(id).getBoundingClientRect(), r = stage.getBoundingClientRect();
  const s = t.width / r.width, dx = (t.left + t.width / 2) - (r.left + r.width / 2), dy = (t.top + t.height / 2) - (r.top + r.height / 2);
  const small = `translate(${dx}px, ${dy}px) scale(${s})`;
  return stage.animate(toThumb ? [{transform:"none"}, {transform:small}] : [{transform:small}, {transform:"none"}],
    {duration: toThumb ? 600 : 750, easing: toThumb ? "cubic-bezier(.45,0,.55,1)" : "cubic-bezier(.22,1,.36,1)"}).finished;
};
const coverAnims = () => nb.getAnimations({subtree:true}).filter(a => ["cover-open","nb-shift","shade-front","shade-back"].includes(a.animationName));
const pages = () => intro.querySelectorAll(".toc .pg").forEach(p => {
  const t = p.dataset.for && document.querySelector(p.dataset.for);
  p.textContent = t ? Math.floor((t.getBoundingClientRect().top + scrollY) / innerHeight) + 1 : "→"; });
const markHere = () => {                            // the section being read, in the contents and on the tabs
  let at = null;
  intro.querySelectorAll(".toc .pg").forEach(p => { const t = p.dataset.for && document.querySelector(p.dataset.for);
    if (t && t.getBoundingClientRect().top < innerHeight * .4) at = p.dataset.for; });
  intro.querySelectorAll(".toc a, .nb-tabs a").forEach(a => a.classList.toggle("here", fromReport && sameDoc({page:a.dataset.page}) && a.getAttribute("href") === at));
};
const hide = hash => {
  state = "hidden"; intro.classList.add("done"); intro.classList.remove("leave","enter"); body.classList.remove("intro-on");
  try{ sessionStorage.setItem("intro", "1"); }catch(e){}
  if (hash){ const land = () => hash === "#top" ? scrollTo({top:0, behavior:"instant"})
      : document.querySelector(hash)?.scrollIntoView({behavior:"instant", block:"start"});
    land(); setTimeout(land, 700); }               // again once the page has settled into place
  setTimeout(() => { if (state === "hidden") intro.hidden = true; }, 550);
};
const open = () => { if (state !== "closed") return; state = "open"; pages(); markHere(); intro.classList.add("play");
  setTimeout(() => intro.querySelector(book(intro.dataset.id).toc ? ".toc a" : ".ph-sheet .book-close")?.focus({preventScroll:true}), 1450); };
const pick = id => {
  if (state !== "desk") return; state = "moving";
  select(id); intro.classList.add("picked"); thumb(id).classList.add("hide");
  flip(id, false).then(() => { state = "closed"; open(); });
};
const backToDesk = () => {                          // close the folder, then shrink it back onto the desk
  if (state !== "open") return; state = "closing";
  const anims = coverAnims(); anims.forEach(a => a.reverse());
  Promise.all(anims.map(a => a.finished)).then(() => { intro.classList.remove("play"); return flip(intro.dataset.id, true); })
    .then(() => { const id = intro.dataset.id; intro.classList.remove("picked"); thumb(id).classList.remove("hide");
      state = "desk"; thumb(id).focus({preventScroll:true}); });
};
const go = (hash, target) => {
  if (state !== "open") return; state = "leaving"; intro.classList.add("leave");
  if (target && !sameDoc({page:target})){          // another deliverable: open its page there
    try{ sessionStorage.setItem("intro", "1"); }catch(e){}
    setTimeout(() => { location.href = target + (hash === "#top" ? "" : hash); }, 480); return; }
  setTimeout(() => hide(hash), 560);
};
const showContents = () => {                        // from the report: straight to this page's open folder
  if (state !== "hidden") return;
  fromReport = true;
  select(here); shelf.querySelectorAll(".fold").forEach(f => f.classList.toggle("hide", f.dataset.id === here));
  intro.hidden = false; intro.classList.remove("done","leave"); intro.classList.add("picked"); body.classList.add("intro-on");
  intro.classList.add("play"); void nb.offsetWidth;   // let the browser start the animations, then jump them to the end
  coverAnims().forEach(a => a.finish());
  pages(); markHere(); intro.classList.remove("enter"); void intro.offsetWidth; intro.classList.add("enter");
  state = "open"; setTimeout(() => (intro.querySelector(".toc a.here") || intro.querySelector(".toc a"))?.focus({preventScroll:true}), 650);
};

intro.addEventListener("click", e => {
  const a = e.target.closest("a, button");
  if (a && a.classList.contains("fold")){ pick(a.dataset.id); return; }
  if (a && a.classList.contains("book-close")){ e.preventDefault(); backToDesk(); return; }
  if (a && a.getAttribute("href")?.startsWith("#")){ e.preventDefault(); go(a.getAttribute("href"), a.dataset.page); }
});
addEventListener("keydown", e => { if (e.key === "Escape" && ["desk","open"].includes(state)) hide(fromReport ? null : "#top"); });
addEventListener("resize", () => state === "open" && pages());
document.addEventListener("click", e => { if (e.target.closest("#contents-btn")) showContents(); });

select(here);
let seen = false; try{ seen = sessionStorage.getItem("intro") === "1"; }catch(e){}
if (seen || reduce){ state = "hidden"; intro.classList.add("done"); intro.hidden = true; }
else body.classList.add("intro-on");
})();
