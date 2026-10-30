/* Interactive figures for the Alzheimer's target report.
   Plain SVG + one shared tooltip; 3Dmol.js for the structure viewer. Data: assets/data/*.json */
(() => {
const NS = "http://www.w3.org/2000/svg";
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const $ = s => document.querySelector(s);
function el(tag, attrs, parent, text){
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (tag === "text" && attrs.fill) e.style.fill = attrs.fill;   // the stylesheet's text colour would win otherwise
  if (text != null) e.textContent = text;
  if (parent) parent.appendChild(e);
  return e;
}
const lin = (d0, d1, r0, r1) => v => r0 + (v - d0) / (d1 - d0) * (r1 - r0);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmt = (v, d = 2) => (v > 0 ? "+" : "") + v.toFixed(d);
const json = f => fetch("assets/data/" + f, {cache:"no-store"}).then(r => r.json());

/* one tooltip for every chart */
const tt = document.createElement("div"); tt.className = "tt"; document.body.appendChild(tt);
function showTip(html, ev){
  tt.innerHTML = html; tt.style.display = "block";
  const w = tt.offsetWidth, h = tt.offsetHeight;
  let x = ev.clientX + 14, y = ev.clientY + 14;
  if (x + w > innerWidth - 8) x = ev.clientX - w - 14;
  if (y + h > innerHeight - 8) y = ev.clientY - h - 14;
  tt.style.left = x + "px"; tt.style.top = y + "px";
}
const hideTip = () => tt.style.display = "none";
function svgPoint(svg, ev){
  const p = svg.createSVGPoint(); p.x = ev.clientX; p.y = ev.clientY;
  return p.matrixTransform(svg.getScreenCTM().inverse());
}
function axis(svg, {x0, x1, y, ticks, sx, label, fmtT = v => v}){
  el("line", {x1:x0, x2:x1, y1:y, y2:y, stroke:css("--rule")}, svg);
  ticks.forEach(t => { el("line",{x1:sx(t),x2:sx(t),y1:y,y2:y+4,stroke:css("--rule")},svg);
    el("text",{x:sx(t),y:y+16,"text-anchor":"middle"},svg,fmtT(t)); });
  if (label) el("text",{x:(x0+x1)/2,y:y+32,"text-anchor":"middle"},svg,label);
}
function yaxis(svg, {y0, y1, x, ticks, sy, label, fmtT = v => v, grid}){
  ticks.forEach(t => {
    if (grid) el("line",{x1:x,x2:grid,y1:sy(t),y2:sy(t),stroke:css("--rule2")},svg);
    el("text",{x:x-6,y:sy(t)+4,"text-anchor":"end"},svg,fmtT(t)); });
  el("line",{x1:x,x2:x,y1:y0,y2:y1,stroke:css("--rule")},svg);
  if (label) el("text",{x:14,y:(y0+y1)/2,"text-anchor":"middle",transform:`rotate(-90 14 ${(y0+y1)/2})`},svg,label);
}
const redraws = [];
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => redraws.forEach(f => f()));
window.redrawCharts = () => redraws.forEach(f => f());

/* =================== Figure 2a: Venn =================== */
$("#venn") && json("m2_venn.json").then(V => {
  const svg = $("#venn"); let mode = "measured";
  const C = [{x:250,y:120,r:92,k:"a"},{x:350,y:120,r:92,k:"b"},{x:300,y:200,r:92,k:"c"}];
  const NAMES = {measured:["RNA measured","Protein measured","GWAS association"],
                 significant:["RNA adj. p < 0.05","Protein adj. p < 0.05","GWAS p < 5e-8"]};
  const POS = {a:[205,95],b:[395,95],c:[300,265],ab:[300,80],ac:[240,185],bc:[360,185],abc:[300,145]};
  const DESC = {a:"only RNA",b:"only protein",c:"only GWAS",ab:"RNA and protein, not GWAS",
    ac:"RNA and GWAS, not protein",bc:"protein and GWAS, not RNA",abc:"all three"};
  let labels = {}, active = null;
  function draw(){
    svg.innerHTML = ""; labels = {};
    const cols = [css("--c1"), css("--c3"), css("--warn")];
    C.forEach((c,i) => el("circle",{cx:c.x,cy:c.y,r:c.r,fill:cols[i],"fill-opacity":.13,stroke:cols[i],"stroke-width":1.5},svg));
    const v = V[mode], n = NAMES[mode];
    el("text",{x:150,y:24,"text-anchor":"middle",class:"lbl","font-weight":600},svg,`${n[0]} (${v.na.toLocaleString()})`);
    el("text",{x:450,y:24,"text-anchor":"middle",class:"lbl","font-weight":600},svg,`${n[1]} (${v.nb.toLocaleString()})`);
    el("text",{x:300,y:310,"text-anchor":"middle",class:"lbl","font-weight":600},svg,`${n[2]} (${v.nc.toLocaleString()})`);
    for (const k in POS) labels[k] = el("text",{x:POS[k][0],y:POS[k][1],"text-anchor":"middle",class:"lbl",
      "font-weight":k==="abc"?700:500,"font-size":k==="abc"?15:12.5},svg,v[k].toLocaleString());
    if (active) labels[active].style.fill = css("--accent");
  }
  function regionAt(p){
    const k = C.filter(c => (p.x-c.x)**2 + (p.y-c.y)**2 <= c.r**2).map(c => c.k).join("");
    return k || null;
  }
  svg.addEventListener("pointermove", ev => {
    const k = regionAt(svgPoint(svg, ev));
    if (k !== active){ if (active) labels[active].style.fill = ""; active = k; if (k) labels[k].style.fill = css("--accent"); }
    if (!k) return hideTip();
    const v = V[mode][k];
    showTip(`<b>${v.toLocaleString()} genes</b><br>${DESC[k]}${k==="abc" && mode==="measured" ? "<br><i>kept for scoring</i>" : ""}`, ev);
  });
  svg.addEventListener("pointerleave", () => { hideTip(); if (active) labels[active].style.fill = ""; active = null; });
  document.querySelectorAll("#venn-mode button").forEach(b => b.addEventListener("click", () => {
    document.querySelectorAll("#venn-mode button").forEach(x => x.classList.toggle("on", x === b));
    mode = b.dataset.k; draw();
  }));
  draw(); redraws.push(draw);
});

/* =================== Figure 2b: integration scatter =================== */
$("#scatter") && json("m2_genes.json").then(G => {
  const svg = $("#scatter"); const W = 640, H = 420, L = 56, R = 16, T = 14, B = 46;
  const sx = lin(-1.4, 1.5, L, W-R), sy = lin(-0.3, 0.4, H-B, T);
  const rr = n => 1.6 + Math.sqrt(Math.min(n, 60)) * 0.55;
  let filter = "all", pinned = null, pts = [];
  const pass = g => filter === "all" || (filter === "conc" && g[5]) || (filter === "disc" && !g[5]) || (filter === "top" && g[4] <= 15);
  function tip(g){ return `<b>${g[0]}</b> · rank ${g[4].toLocaleString()} of 1,115<br>RNA change ${fmt(g[1])}<br>Protein change ${fmt(g[2])}<br>GWAS −log10 p ${g[3]}<br>${g[5] ? "same direction" : "opposite directions"}`; }
  function draw(){
    svg.innerHTML = "";
    yaxis(svg,{y0:H-B,y1:T,x:L,ticks:[-0.3,-0.2,-0.1,0,0.1,0.2,0.3,0.4],sy,grid:W-R,label:"Protein change (log2 fold change)"});
    axis(svg,{x0:L,x1:W-R,y:H-B,ticks:[-1,-0.5,0,0.5,1,1.5],sx,label:"RNA change (log2 fold change, strongest region)"});
    el("line",{x1:sx(0),x2:sx(0),y1:T,y2:H-B,stroke:css("--rule")},svg);
    el("line",{x1:L,x2:W-R,y1:sy(0),y2:sy(0),stroke:css("--rule")},svg);
    const gpts = el("g",{},svg); pts = [];
    [...G].sort((a,b) => b[4]-a[4]).forEach(g => {
      const out = g[2] > 0.4, x = sx(g[1]), y = out ? sy(0.4) : sy(g[2]);
      const on = pass(g);
      const c = el("circle",{cx:x,cy:y,r:rr(g[3]),fill:g[5]?css("--c1"):css("--c3"),"fill-opacity":on?.5:.06,
        stroke:g[4]<=15&&on?css("--ink"):"none","stroke-width":1.2},gpts);
      pts.push({g,x,y,c,on});
      if (g[4] <= 15 && on) el("text",{x:x+6,y:y-5,"font-size":10.5,class:"lbl"},svg,g[0]);
    });
    if (pinned) mark(pinned);
  }
  let ring = null;
  function mark(g){
    if (ring) ring.remove();
    const p = pts.find(p => p.g === g); if (!p) return;
    ring = el("circle",{cx:p.x,cy:p.y,r:rr(g[3])+5,fill:"none",stroke:css("--accent"),"stroke-width":2.5},svg);
  }
  svg.addEventListener("pointermove", ev => {
    const q = svgPoint(svg, ev); let best = null, bd = 144;
    for (const p of pts){ if (!p.on) continue; const d = (p.x-q.x)**2 + (p.y-q.y)**2; if (d < bd){ bd = d; best = p; } }
    if (!best){ hideTip(); if (!pinned && ring){ ring.remove(); ring = null; } return; }
    mark(best.g); showTip(tip(best.g), ev);
  });
  svg.addEventListener("pointerleave", () => { hideTip(); if (pinned) mark(pinned); else if (ring){ ring.remove(); ring = null; } });
  const box = $("#gene-search"), msg = $("#gene-msg");
  box.addEventListener("input", () => {
    const q = box.value.trim().toUpperCase();
    if (!q){ pinned = null; msg.textContent = ""; if (ring){ ring.remove(); ring = null; } return; }
    const g = G.find(g => g[0] === q) || G.find(g => g[0].startsWith(q));
    if (!g){ pinned = null; msg.textContent = "not among the 1,115 genes"; if (ring){ ring.remove(); ring = null; } return; }
    pinned = g; mark(g);
    msg.innerHTML = `<b>${g[0]}</b>: rank ${g[4]}, RNA ${fmt(g[1])}, protein ${fmt(g[2])}, GWAS −log10 p ${g[3]}`;
  });
  document.querySelectorAll("#scatter-filter button").forEach(b => b.addEventListener("click", () => {
    document.querySelectorAll("#scatter-filter button").forEach(x => x.classList.toggle("on", x === b));
    filter = b.dataset.k; draw();
  }));
  draw(); redraws.push(draw);
});

/* =================== Figure 3: re-rank slope + modality map, linked =================== */
const GENES = [ // gene, Module 2 rank, final rank, p_sm, p_ab
  ["HLA-DRA",1,3,0.0095,0.1841],["HLA-DRB1",2,2,0.0142,0.2686],["APOC1",3,5,0.0006,0.2526],
  ["PECAM1",4,1,0.0214,0.8831],["MTSS2",5,8,0.1172,0.0095],["ITGAX",6,4,0.2136,0.5896],
  ["GMPR",7,9,0.1719,0.0004],["RPH3A",8,12,0.0915,0.0001],["NRXN3",9,7,0.4401,0.1217],
  ["APLNR",10,6,0.6753,0.0347],["APOE",11,13,0.0020,0.0145],["SHANK2",12,10,0.3334,0.0004],
  ["APOB",13,14,0.1495,0.1043],["MOG",14,11,0.0023,0.5038],["PLEC",15,15,0.0133,0.0008]];
const rrRows = {}, mmDots = {};
function focusGene(g){
  for (const k in rrRows) rrRows[k].style.opacity = !g || k === g ? 1 : .13;
  for (const k in mmDots) mmDots[k].style.opacity = !g || k === g ? 1 : .15;
  const tip = $("#rr-tip");
  if (!g){ tip.textContent = "Teal moved up, red moved down, grey stayed. Hover a gene in either chart."; return; }
  const [n,a,b,sm,ab] = GENES.find(x => x[0] === g), mv = a - b;
  tip.innerHTML = `<b style="color:var(--ink)">${n}</b>: rank ${a} → ${b} (${mv>0?"up "+mv:mv<0?"down "+(-mv):"no change"}) · small molecule ${sm.toFixed(2)} · antibody ${ab.toFixed(2)} · suits ${sm>ab&&sm>.1?"a small molecule":ab>.1?"an antibody":"neither"}`;
}
function drawRerank(){
  const svg = $("#rerank"); svg.innerHTML = "";
  const L = 150, R = 490, top = 36, step = 24, y = r => top + (r-1)*step;
  el("text",{x:L,y:18,"text-anchor":"middle","font-weight":600},svg,"Module 2 rank");
  el("text",{x:R,y:18,"text-anchor":"middle","font-weight":600},svg,"Final rank");
  GENES.forEach(([g,a,b]) => {
    const col = b < a ? css("--c1") : b > a ? css("--c3") : css("--grey");
    const grp = el("g",{class:"hot",tabindex:0},svg);
    el("line",{x1:L,y1:y(a),x2:R,y2:y(b),stroke:col,"stroke-width":2,"stroke-linecap":"round"},grp);
    el("line",{x1:L,y1:y(a),x2:R,y2:y(b),stroke:"transparent","stroke-width":12},grp);
    el("circle",{cx:L,cy:y(a),r:3.5,fill:col},grp); el("circle",{cx:R,cy:y(b),r:3.5,fill:col},grp);
    el("text",{x:L-10,y:y(a)+4,"text-anchor":"end",class:"lbl"},grp,`${g}  ${a}`);
    el("text",{x:R+10,y:y(b)+4,class:"lbl"},grp,`${b}  ${g}`);
    ["mouseenter","focus","click"].forEach(e => grp.addEventListener(e, () => focusGene(g)));
    ["mouseleave","blur"].forEach(e => grp.addEventListener(e, () => focusGene(null)));
    rrRows[g] = grp;
  });
}
function drawModality(){
  const svg = $("#modality"); svg.innerHTML = "";
  const W = 640, H = 400, L = 56, R = 20, T = 34, B = 46;
  // square-root axes spread out the many scores close to zero; the diagonal stays a diagonal
  const sx = v => L + Math.sqrt(v) * (W-R-L), sy = v => H-B - Math.sqrt(v) * (H-B-T);
  const kind = (sm, ab) => sm > ab && sm > .1 ? "sm" : ab > .1 ? "ab" : "none";
  const COL = {sm:css("--warn"), ab:css("--c1"), none:css("--grey")};
  el("path",{d:`M${sx(0)},${sy(0)} L${sx(1)},${sy(1)} L${sx(0)},${sy(1)} Z`,fill:COL.ab,"fill-opacity":.06},svg);
  el("path",{d:`M${sx(0)},${sy(0)} L${sx(1)},${sy(1)} L${sx(1)},${sy(0)} Z`,fill:COL.sm,"fill-opacity":.07},svg);
  const ticks = [0,.05,.2,.4,.6,.8,1];
  yaxis(svg,{y0:H-B,y1:T,x:L,ticks,sy,grid:W-R,label:"Antibody score (p_ab, √ scale)",fmtT:v=>v});
  axis(svg,{x0:L,x1:W-R,y:H-B,ticks,sx,label:"Small-molecule score (p_sm, √ scale)",fmtT:v=>v});
  ticks.forEach(t => t && el("line",{x1:sx(t),x2:sx(t),y1:T,y2:H-B,stroke:css("--rule2")},svg));
  el("line",{x1:sx(0),y1:sy(0),x2:sx(1),y2:sy(1),stroke:css("--grey"),"stroke-dasharray":"4 4"},svg);
  el("text",{x:sx(0)+8,y:T-12,fill:COL.ab,"font-weight":600},svg,"● Leans antibody");
  el("text",{x:sx(0)+125,y:T-12,fill:COL.sm,"font-weight":600},svg,"● Leans small molecule");
  el("text",{x:sx(0)+282,y:T-12,fill:COL.none,"font-weight":600},svg,"● Neither (both < 0.1)");
  // dots first, then labels placed greedily so none overlap a dot, another label or the frame
  const dots = GENES.map(([g,a,b,sm,ab]) => ({g, x:sx(sm), y:sy(ab), k:kind(sm,ab)}));
  const boxes = dots.map(d => ({x0:d.x-8, x1:d.x+8, y0:d.y-8, y1:d.y+8}));
  const hit = b => b.x0 < L+2 || b.x1 > W-R || b.y0 < T || b.y1 > H-B-2 ||
    boxes.some(o => b.x0 < o.x1 && b.x1 > o.x0 && b.y0 < o.y1 && b.y1 > o.y0);
  const place = d => {
    const w = d.g.length * 7 + 4, h = 14;
    const tries = [[10,4,"start"],[-10,4,"end"],[0,-12,"middle"],[0,20,"middle"],[10,-10,"start"],[-10,-10,"end"],[10,18,"start"],[-10,18,"end"],[14,-22,"start"],[-14,-22,"end"],[14,30,"start"]];
    for (const [dx,dy,anc] of tries){
      const x0 = anc === "start" ? d.x+dx : anc === "end" ? d.x+dx-w : d.x-w/2;
      const b = {x0, x1:x0+w, y0:d.y+dy-11, y1:d.y+dy-11+h};
      if (!hit(b)){ boxes.push(b); return {x:d.x+dx, y:d.y+dy, anc, lead: Math.abs(dy) > 16}; }
    }
    return null;
  };
  dots.sort((a,b) => (a.k === "none") - (b.k === "none"));
  dots.forEach(d => {
    const grp = el("g",{class:"hot",tabindex:0},svg);
    el("circle",{cx:d.x,cy:d.y,r:6.5,fill:COL[d.k],"fill-opacity":.9,stroke:css("--paper"),"stroke-width":1.5},grp);
    const lp = place(d);
    if (lp){
      if (lp.lead) el("line",{x1:d.x,y1:d.y,x2:lp.x,y2:lp.y-4,stroke:css("--rule")},grp);
      el("text",{x:lp.x,y:lp.y,"text-anchor":lp.anc,class:"lbl","font-size":12},grp,d.g);
    }
    ["mouseenter","focus","click"].forEach(e => grp.addEventListener(e, () => focusGene(d.g)));
    ["mouseleave","blur"].forEach(e => grp.addEventListener(e, () => focusGene(null)));
    mmDots[d.g] = grp;
  });
}
function drawM3(){ drawRerank(); drawModality(); focusGene(null); }
if ($("#rerank")){ drawM3(); redraws.push(drawM3); }

/* =================== Figure 4: 3D structure + pLDDT track =================== */
const PLDDT_COL = p => p > 90 ? "#0053d6" : p > 70 ? "#65cbf3" : p > 50 ? "#ffdb13" : "#ff7d45";
const POCKET_COL = ["#9a5fc0", "#e34948"];
const PROT = {P20702:{name:"ITGAX",note:"mean pLDDT 88.0 · compared with 4NEH (0.86 Å)"},
              P35414:{name:"APLNR",note:"mean pLDDT 81.7 · compared with 7SUS (1.11 Å, insert removed)"}};
$("#viewer") && json("m4_structures.json").then(S => {
  let cur = "P20702", viewer = null, hoverShape = null, spin = false, pocketRes = [], setCursor = () => {}, home = null;
  const holder = $("#viewer"), scroller = $("#track-scroll");
  const PX = 3;                                     // pixels per residue on the track
  function trackDraw(){
    const pl = S[cur].plddt, H = 150, T = 10, B = 30, W = pl.length * PX + 12;
    const sy = lin(0, 100, H-B, T), xr = i => 6 + (i-1) * PX;          // left edge of residue i
    const ysvg = $("#track-y"); ysvg.innerHTML = "";
    ysvg.setAttribute("viewBox", `0 0 44 ${H}`); ysvg.style.height = H + "px";
    [50,70,90].forEach(t => el("text",{x:38,y:sy(t)+4,"text-anchor":"end"},ysvg,t));
    el("text",{x:10,y:(T+H-B)/2,"text-anchor":"middle",transform:`rotate(-90 10 ${(T+H-B)/2})`,"font-size":11},ysvg,"pLDDT");
    const svg = $("#track"); svg.innerHTML = "";
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.style.width = W + "px"; svg.style.height = H + "px";
    [50,70,90].forEach(t => el("line",{x1:0,x2:W,y1:sy(t),y2:sy(t),stroke:css("--rule2")},svg));
    pl.forEach((p,i) => el("rect",{x:xr(i+1),y:sy(p),width:PX-0.7,height:sy(0)-sy(p),fill:PLDDT_COL(p)},svg));
    pocketRes.forEach((set,k) => set.forEach(r => el("rect",{x:xr(r),y:H-B+3+k*5,width:PX-0.7,height:4,fill:POCKET_COL[k]},svg)));
    el("line",{x1:0,x2:W,y1:H-B,y2:H-B,stroke:css("--rule")},svg);
    for (let r = 50; r <= pl.length; r += 50){
      el("line",{x1:xr(r)+PX/2,x2:xr(r)+PX/2,y1:H-B,y2:H-B+(pocketRes.length?13:4),stroke:css("--rule")},svg);
      el("text",{x:xr(r)+PX/2,y:H-4,"text-anchor":"middle"},svg,r);
    }
    el("text",{x:xr(1),y:H-4},svg,"1");
    const cursor = el("rect",{y:T-4,width:PX+2,height:H-B-T+4,fill:"none",stroke:css("--ink"),"stroke-width":1.2,visibility:"hidden"},svg);
    setCursor = (i, scroll) => {
      if (!i){ cursor.setAttribute("visibility","hidden"); return; }
      cursor.setAttribute("x", xr(i)-1); cursor.setAttribute("visibility","visible");
      if (scroll){ const x = xr(i), v = scroller.scrollLeft;
        if (x < v + 20 || x > v + scroller.clientWidth - 20) scroller.scrollTo({left: x - scroller.clientWidth/2, behavior:"smooth"}); }
    };
    svg.onpointermove = ev => {
      const q = svgPoint(svg, ev), i = clamp(Math.floor((q.x - 6)/PX) + 1, 1, pl.length), p = pl[i-1];
      setCursor(i);
      const inPk = pocketRes.map((set,k) => set.has(i) ? S[cur].pockets[k].label : null).filter(Boolean);
      showTip(`<b>${PROT[cur].name} residue ${i}</b><br>pLDDT ${p} · ${p>90?"very high":p>70?"confident":p>50?"low":"very low"}${inPk.length ? "<br>lines " + inPk.join(", ") : ""}`, ev);
      if (viewer){
        if (hoverShape) viewer.removeShape(hoverShape);
        const a = viewer.selectedAtoms({resi:i, atom:"CA"})[0];
        if (a) hoverShape = viewer.addSphere({center:{x:a.x,y:a.y,z:a.z},radius:2.6,color:dark()?"#fff":"#111",alpha:.85});
        viewer.render();
      }
    };
    svg.onpointerleave = () => { hideTip(); setCursor(null);
      if (viewer && hoverShape){ viewer.removeShape(hoverShape); hoverShape = null; viewer.render(); } };
  }
  const dark = () => { const t = document.documentElement.dataset.theme; return t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches; };
  function pocketChips(){
    const box = $("#pockets"); box.innerHTML = "";
    S[cur].pockets.forEach((p,i) => {
      const b = document.createElement("button"); b.className = "on";
      b.innerHTML = `<span style="background:${POCKET_COL[i]}"></span>${p.label}`;
      b.onclick = () => { if (!viewer || !pocketRes[i]) return;
        viewer.zoomTo({resi:[...pocketRes[i]]}, 700);
        const first = Math.min(...pocketRes[i]); setCursor(first, true); };
      box.appendChild(b);
    });
    const reset = document.createElement("button"); reset.textContent = "Reset view";
    reset.onclick = () => { if (viewer && home){ viewer.setView(home); viewer.render(); } }; box.appendChild(reset);
  }
  function load(){
    $("#prot-note").textContent = `${PROT[cur].name} (AlphaFold AF-${cur}) · ${PROT[cur].note}`;
    pocketRes = []; trackDraw(); pocketChips(); scroller.scrollLeft = 0;
    if (!window.$3Dmol || !webgl()){ fallback(); return; }
    fetch(`assets/structures/AF-${cur}.pdb`, {cache:"no-store"}).then(r => r.text()).then(pdb => {
      if (!viewer){
        try{ viewer = $3Dmol.createViewer(holder, {backgroundColor:css("--paper"), antialias:true}); }catch(e){ fallback(); return; }
        // if the browser drops the 3D context (sleep, GPU switch, too many tabs), rebuild the viewer
        holder.querySelector("canvas")?.addEventListener("webglcontextlost", ev => { ev.preventDefault();
          holder.innerHTML = ""; viewer = null; setTimeout(load, 300); });
      }
      viewer.setBackgroundColor(css("--paper"));
      viewer.clear(); hoverShape = null;
      viewer.addModel(pdb, "pdb");
      viewer.setStyle({}, {cartoon:{colorfunc: a => PLDDT_COL(a.b)}});
      const ca = viewer.selectedAtoms({atom:"CA"});
      pocketRes = S[cur].pockets.map(p => {
        const c = p.xyz.reduce((s,v) => [s[0]+v[0],s[1]+v[1],s[2]+v[2]],[0,0,0]).map(v => v/p.xyz.length);
        return new Set(ca.filter(a => (a.x-c[0])**2 + (a.y-c[1])**2 + (a.z-c[2])**2 < 100).map(a => a.resi));
      });
      S[cur].pockets.forEach((p,i) => p.xyz.forEach(v => viewer.addSphere({center:{x:v[0],y:v[1],z:v[2]},radius:1.5,color:POCKET_COL[i],alpha:.95})));
      viewer.setHoverable({atom:"CA"}, true, (a,v,ev) => {
        if (a && ev){ showTip(`<b>${PROT[cur].name} ${a.resn} ${a.resi}</b><br>pLDDT ${a.b.toFixed(1)}`, ev); setCursor(a.resi, true); }
      }, () => { hideTip(); setCursor(null); });
      viewer.zoomTo(); viewer.rotate(-35, "y"); viewer.rotate(22, "x"); viewer.zoom(1.15);
      home = viewer.getView(); viewer.render(); viewer.spin(spin ? "y" : false);
      trackDraw();
    });
  }
  document.querySelectorAll("#prot-pick button").forEach(b => b.addEventListener("click", () => {
    document.querySelectorAll("#prot-pick button").forEach(x => x.classList.toggle("on", x === b));
    cur = b.dataset.k; load();
  }));
  $("#spin").addEventListener("click", e => { spin = !spin; e.target.classList.toggle("on", spin); viewer && viewer.spin(spin ? "y" : false); });
  function webgl(){ try{ const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); }catch(e){ return false; } }
  function fallback(){                            // no 3D graphics in this browser: show the static figure instead
    holder.innerHTML = `<img src="assets/fig/m4_structures.png" alt="AlphaFold models of ITGAX and APLNR coloured by pLDDT, with pockets" style="width:100%;height:100%;object-fit:contain;background:#fff">`;
    holder.insertAdjacentHTML("beforeend", `<p class="tip" style="position:absolute;left:10px;bottom:6px;margin:0">3D view unavailable in this browser (WebGL is off), so this is the static figure.</p>`);
  }
  // build the 3D view when the figure first comes into view, so it gets its real size and a fresh context
  const io4 = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)){ io4.disconnect(); load(); } }, {rootMargin:"300px"});
  trackDraw(); pocketChips(); $("#prot-note").textContent = `${PROT[cur].name} (AlphaFold AF-${cur}) · ${PROT[cur].note}`;
  io4.observe(holder);
  redraws.push(() => viewer ? load() : trackDraw());
  addEventListener("pageshow", e => { if (e.persisted && viewer){ holder.innerHTML = ""; viewer = null; load(); } });
});

/* =================== Figure 6: CADD calibration with a movable threshold =================== */
$("#cadd") && json("m5_variants.json").then(P => {
  const svg = $("#cadd"), slider = $("#cadd-cut"), out = $("#cadd-out");
  const W = 640, H = 300, L = 172, R = 14, T = 26, B = 40, sx = lin(0, 50, L, W-R);
  const ROWS = [["benign","Benign (both genes)",css("--c1")],["pathogenic","Pathogenic (DPYD)",css("--c3")],
                ["vus","CYP2C19 VUS",css("--grey")],["star","CYP2C19 no-function",css("--ink")]];
  const rowY = i => T + 22 + i * ((H - T - B - 22) / 3.2);
  let jit = {}; let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  P.forEach((p,i) => jit[i] = (rnd() - .5) * 22);
  let pts = [];
  function draw(){
    svg.innerHTML = ""; pts = [];
    const ROWC = [css("--c1"), css("--c3"), css("--grey"), css("--ink")];
    [[0,20,"strong, benign"],[20,25,"none"],[25,30,"moderate"],[30,50,"strong, pathogenic"]].forEach(([a,b,n],i) => {
      el("rect",{x:sx(a),y:T,width:sx(b)-sx(a),height:H-T-B,fill:i===0?css("--c1"):i===1?css("--grey"):css("--c3"),"fill-opacity":i===0?.08:i===1?.06:i===2?.07:.13},svg);
      el("text",{x:(sx(a)+sx(b))/2,y:T-8,"text-anchor":"middle","font-size":11},svg,n);
    });
    axis(svg,{x0:L,x1:W-R,y:H-B,ticks:[0,10,20,30,40,50],sx,label:"CADD phred score"});
    ROWS.forEach(([k,name],i) => {
      const n = P.filter(p => p.g === k).length;
      el("text",{x:L-8,y:rowY(i)+4,"text-anchor":"end",class:"lbl","font-size":11.5},svg,`${name} (${n})`);
    });
    P.forEach((p,i) => {
      const r = ROWS.findIndex(x => x[0] === p.g), x = sx(p.cadd), y = rowY(r) + (p.g === "star" ? 0 : jit[i]);
      const c = p.g === "star"
        ? el("rect",{x:x-5,y:y-5,width:10,height:10,transform:`rotate(45 ${x} ${y})`,fill:ROWC[r]},svg)
        : el("circle",{cx:x,cy:y,r:3.6,fill:ROWC[r],"fill-opacity":.75},svg);
      if (p.g === "star") el("text",{x,y:y+(p.star==="*4"||p.star==="*8"||p.star==="*3"?18:-10),"text-anchor":"middle",class:"lbl","font-size":11},svg,p.star);
      pts.push({p,x,y});
    });
    const t = +slider.value, lx = sx(t);
    el("line",{x1:lx,x2:lx,y1:T,y2:H-B,stroke:css("--ink"),"stroke-width":2,"stroke-dasharray":"5 3"},svg);
    el("text",{x:lx+4,y:T+12,class:"lbl","font-weight":600,"font-size":11},svg,`cut-off ${t}`);
    const ben = P.filter(p => p.g === "benign"), pat = P.filter(p => p.g === "pathogenic"), st = P.filter(p => p.g === "star");
    const sens = pat.filter(p => p.cadd >= t).length / pat.length, spec = ben.filter(p => p.cadd < t).length / ben.length;
    const caught = st.filter(p => p.cadd >= t).map(p => p.star);
    out.innerHTML = `At CADD ≥ ${t}: <b>${(sens*100).toFixed(0)}%</b> of pathogenic variants called damaging, <b>${(spec*100).toFixed(0)}%</b> of benign variants called benign. ` +
      `CYP2C19 no-function alleles called damaging: <b>${caught.length ? caught.join(", ") : "none"}</b>${caught.length < st.length ? ` (missed ${st.filter(p => p.cadd < t).map(p => p.star).join(", ")})` : ""}.`;
  }
  svg.addEventListener("pointermove", ev => {
    const q = svgPoint(svg, ev); let best = null, bd = 100;
    pts.forEach(o => { const d = (o.x-q.x)**2 + (o.y-q.y)**2; if (d < bd){ bd = d; best = o; } });
    if (!best) return hideTip();
    const p = best.p;
    showTip(`<b>${p.star ? p.star + " · " : ""}${p.gene}${p.aa ? " " + p.aa : ""}</b><br>${p.rsid || "no rsID"}${p.cons ? " · " + p.cons.replace(/_/g," ") : ""}<br>CADD ${p.cadd}`, ev);
  });
  svg.addEventListener("pointerleave", hideTip);
  slider.addEventListener("input", draw);
  draw(); redraws.push(draw);
});

/* =================== Figure 7: AUC bars, PRS histogram and calibration =================== */
const POPS = ["EUR","SAS","EAS","AMR","AFR"];
const POP_NAMES = {EUR:"European",SAS:"South Asian",EAS:"East Asian",AMR:"Admixed American",AFR:"African"};
const popCol = p => ({EUR:css("--ink"),SAS:"#a4804a",EAS:"#6e7178",AMR:"#2f7d9a",AFR:css("--c3")})[p];
const AUC = {full:[0.672,0.611,0.575,0.555,0.493], noapoe:[0.588,0.582,0.588,0.557,0.580], e4:[0.645,0.605,0.561,0.555,0.491]};
const AUC_NOTE = {
  full:"The score works best in the group it was built in, and is at chance in the African-ancestry group.",
  noapoe:"Without the two APOE SNPs every group sits near 0.58, so the AFR drop comes from APOE.",
  e4:"APOE e4 alone does most of the work in Europeans and nothing in AFR, where the simulation linked e4 to almost nothing."};
let aucKey = "full";
function drawAuc(){
  const svg = $("#auc"); svg.innerHTML = "";
  const W = 640, H = 260, l = 48, r = 16, t = 14, b = 40, lo = 0.4, hi = 0.7;
  const bw = (W-l-r)/POPS.length, y = lin(lo, hi, H-b, t);
  yaxis(svg,{y0:H-b,y1:t,x:l,ticks:[.4,.5,.6,.7],sy:y,grid:W-r,fmtT:v=>v.toFixed(1)});
  el("line",{x1:l,x2:W-r,y1:y(.5),y2:y(.5),stroke:css("--grey"),"stroke-dasharray":"5 4"},svg);
  POPS.forEach((p,i) => {
    const v = AUC[aucKey][i], cx = l + bw*i + bw/2;
    el("text",{x:cx,y:H-14,"text-anchor":"middle",class:"lbl"},svg,p);
    const rect = el("rect",{x:cx-bw*.28,y:y(v),width:bw*.56,height:y(lo)-y(v),fill:v<.52?css("--c3"):aucKey==="noapoe"?css("--c2"):css("--c1")},svg);
    el("text",{x:cx,y:y(v)-6,"text-anchor":"middle",class:"lbl","font-weight":600},svg,v.toFixed(3));
    rect.addEventListener("pointermove", ev => showTip(`<b>${POP_NAMES[p]}</b><br>full ${AUC.full[i]} · without APOE ${AUC.noapoe[i]} · e4 alone ${AUC.e4[i]}`, ev));
    rect.addEventListener("pointerleave", hideTip);
  });
  $("#auc-tip").textContent = AUC_NOTE[aucKey] + " Dashed line: chance (0.5).";
}
if ($("#auc")) document.querySelectorAll("#auc-toggle button").forEach(b => b.addEventListener("click", () => {
  document.querySelectorAll("#auc-toggle button").forEach(x => x.classList.toggle("on", x === b));
  aucKey = b.dataset.k; drawAuc();
}));
if ($("#auc")){ drawAuc(); redraws.push(drawAuc); }

$("#prs-hist") && json("m6_prs.json").then(D => {
  const shown = new Set(POPS); let cut = D.cutoff, moved = false;
  const legend = $("#pop-legend");
  POPS.forEach(p => {
    const b = document.createElement("button"); b.className = "on"; b.dataset.p = p;
    b.innerHTML = `<span style="background:${popCol(p)}"></span>${p}`;
    b.onclick = () => { shown.has(p) ? shown.delete(p) : shown.add(p); b.classList.toggle("on", shown.has(p)); drawAll6(); };
    legend.appendChild(b);
  });
  const E = D.edges;
  function hist(){
    const svg = $("#prs-hist"); svg.innerHTML = "";
    const W = 640, H = 280, L = 48, R = 14, T = 14, B = 44;
    const sx = lin(E[0], E[E.length-1], L, W-R);
    const dens = p => D.groups[p].hist.map(c => c / D.groups[p].n / (E[1]-E[0]));
    const ymax = Math.max(...POPS.flatMap(dens)) * 1.08, sy = lin(0, ymax, H-B, T);
    yaxis(svg,{y0:H-B,y1:T,x:L,ticks:[0,.2,.4,.6,.8,1].filter(v => v <= ymax),sy,grid:W-R,label:"Density",fmtT:v=>v.toFixed(1)});
    axis(svg,{x0:L,x1:W-R,y:H-B,ticks:[-2,-1,0,1,2,3,4],sx,label:"PRS (standardised across everyone)"});
    POPS.filter(p => shown.has(p)).forEach(p => {
      const d = dens(p); let path = `M${sx(E[0])},${sy(0)}`;
      d.forEach((v,i) => path += ` L${sx(E[i])},${sy(v)} L${sx(E[i+1])},${sy(v)}`);
      path += ` L${sx(E[E.length-1])},${sy(0)}`;
      el("path",{d:path,fill:popCol(p),"fill-opacity":.08,stroke:popCol(p),"stroke-width":1.8},svg);
    });
    const cx = sx(cut);
    el("rect",{x:cx,y:T,width:W-R-cx,height:H-B-T,fill:css("--c3"),"fill-opacity":.05},svg);
    const line = el("line",{x1:cx,x2:cx,y1:T,y2:H-B,stroke:css("--c3"),"stroke-width":2.5,"stroke-dasharray":"6 3"},svg);
    const handle = el("g",{class:"drag"},svg);
    el("rect",{x:cx-9,y:T,width:18,height:H-B-T,fill:"transparent"},handle);
    el("rect",{x:cx-26,y:T,width:52,height:18,rx:3,fill:css("--c3")},handle);
    el("text",{x:cx,y:T+13,"text-anchor":"middle",fill:"#fff","font-size":11,"font-weight":600},handle,"cut-off");
    let drag = false;
    handle.addEventListener("pointerdown", ev => { drag = true; handle.setPointerCapture(ev.pointerId); });
    handle.addEventListener("pointermove", ev => {
      if (!drag) return;
      const q = svgPoint(svg, ev), v = (q.x - L) / (W - R - L) * (E[E.length-1] - E[0]) + E[0];
      const i = clamp(Math.round((v - E[0]) / (E[1]-E[0])), 1, E.length - 2);
      if (E[i] !== cut){ cut = E[i]; moved = true; drawAll6(); }
    });
    handle.addEventListener("pointerup", () => drag = false);
    svg.onpointermove = ev => {
      if (drag) return;
      const q = svgPoint(svg, ev); if (q.x < L || q.x > W-R) return hideTip();
      const v = (q.x - L) / (W - R - L) * (E[E.length-1] - E[0]) + E[0], i = clamp(Math.floor((v - E[0]) / (E[1]-E[0])), 0, E.length-2);
      showTip(`<b>PRS ${E[i].toFixed(1)} to ${E[i+1].toFixed(1)}</b><br>` + POPS.filter(p => shown.has(p))
        .map(p => `${p}: ${D.groups[p].hist[i]} people`).join("<br>"), ev);
    };
    svg.onpointerleave = hideTip;
  }
  function above(){
    const rows = POPS.map(p => {
      const g = D.groups[p];
      const pct = moved ? 100 * g.hist.reduce((s,c,i) => s + (E[i] >= cut ? c : 0), 0) / g.n : g.above;
      return {p, pct};
    });
    const max = Math.max(30, ...rows.map(r => r.pct));
    $("#above").innerHTML = rows.map(r => `<div class="bar-row${shown.has(r.p)?"":" off"}"><span>${POP_NAMES[r.p]}</span>
      <div class="bar"><i style="width:${r.pct/max*100}%;background:${popCol(r.p)}"></i></div><b>${r.pct.toFixed(1)}%</b></div>`).join("");
    $("#cut-note").textContent = moved
      ? `Cut-off at PRS ${cut.toFixed(1)}. Drag the red handle to move it.`
      : `Cut-off at the pooled top 10% (PRS ${D.cutoff.toFixed(2)}). Drag the red handle to move it.`;
  }
  function cal(){
    const svg = $("#prs-cal"); svg.innerHTML = "";
    const W = 560, H = 300, L = 52, R = 14, T = 30, B = 44, sx = lin(0, .7, L, W-R), sy = lin(0, .7, H-B, T);
    POPS.forEach((p,i) => el("text",{x:L+6+i*64,y:14,fill:popCol(p),"font-weight":600,opacity:shown.has(p)?1:.3},svg,"● "+p));
    yaxis(svg,{y0:H-B,y1:T,x:L,ticks:[0,.2,.4,.6],sy,grid:W-R,label:"Observed risk",fmtT:v=>v.toFixed(1)});
    axis(svg,{x0:L,x1:W-R,y:H-B,ticks:[0,.2,.4,.6],sx,label:"Predicted risk (EUR model)",fmtT:v=>v.toFixed(1)});
    el("line",{x1:sx(0),y1:sy(0),x2:sx(.7),y2:sy(.7),stroke:css("--grey"),"stroke-dasharray":"4 4"},svg);
    POPS.filter(p => shown.has(p)).forEach(p => {
      const c = D.groups[p].cal;
      el("polyline",{points:c.map(([x,y]) => `${sx(x)},${sy(y)}`).join(" "),fill:"none",stroke:popCol(p),"stroke-width":1.8},svg);
      c.forEach(([x,y,n]) => {
        const d = el("circle",{cx:sx(x),cy:sy(y),r:4.5,fill:popCol(p),stroke:css("--paper"),"stroke-width":1.2},svg);
        d.addEventListener("pointermove", ev => showTip(`<b>${POP_NAMES[p]}</b><br>predicted ${(x*100).toFixed(0)}% · observed ${(y*100).toFixed(0)}%<br>${n} people in this fifth`, ev));
        d.addEventListener("pointerleave", hideTip);
      });
    });
  }
  function drawAll6(){ hist(); above(); cal(); }
  drawAll6(); redraws.push(drawAll6);
});

/* =================== Opening: mini 3D lead target, reading progress =================== */
(function opening(){
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const holder = $("#mini");
  const gl = (() => { try{ const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); }catch(e){ return false; } })();
  if (holder && window.$3Dmol && gl){
    Promise.all([fetch("assets/structures/AF-P35414.pdb", {cache:"no-store"}).then(r => r.text()), json("m4_structures.json")]).then(([pdb, S]) => {
      const v = $3Dmol.createViewer(holder, {backgroundColor:css("--paper"), antialias:true});
      v.addModel(pdb, "pdb");
      v.setStyle({}, {cartoon:{colorfunc: a => PLDDT_COL(a.b)}});
      const drug = S.P35414.pockets.find(p => p.id === 2);
      drug.xyz.forEach(q => v.addSphere({center:{x:q[0],y:q[1],z:q[2]},radius:1.5,color:"#9a5fc0",alpha:.95}));
      v.zoomTo({resi:[...Array(310).keys()].map(i => i + 19)}); v.rotate(-30, "y"); v.zoom(1.05); v.render();
      if (!reduce) v.spin("y", 0.4);
      redraws.push(() => { v.setBackgroundColor(css("--paper")); v.render(); });
    });
  } else if (holder){ holder.innerHTML = '<p class="tip" style="padding:12px">3D viewer unavailable.</p>'; }

  const bar = $("#progress");
  const onScroll = () => { const h = document.documentElement; bar.style.width = (h.scrollTop / (h.scrollHeight - h.clientHeight) * 100) + "%"; };
  addEventListener("scroll", onScroll, {passive:true}); onScroll();
})();

/* =================== Signature: drawn on a canvas, not served as an image file =================== */
(function signature(){
  const box = $(".sig"); if (!box) return;
  const SHAPE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAdwAAADACAAAAACLq419AABSs0lEQVR42u29d3Rk53En+qvv3tu50UAjZ2ACJuecM+MwiqKCg5x3vX7rp7f26snnvePnXXsVnNa73vUer6W115KsYIuZnCEnJw6HHJKTc0DOqXO49/vq/dHdQDfQmAHAGZKi5lJHPEdqAH1v3fqq6le/+hXw4HpwPbgeXA+uT9FFDx7Bp8EKRFB8z3+t/uDJfhouDWDwA8/9zB6g/OAxPLimdB48uD7heAt45jQVU0KB6IFxP1OX0Bhz/vA354fbY9Du7dksHjzdT4Hn+pbNKVD3PgF64LmfuOeC4Z/Z/p0jQSZ+YNyfSROKO52RFH77rWEp7nXC/KAU+pgSVwFrAtMRw+Y1gwA9qIZ+hkPrnfOqB3722bTs5D7y4Fj+lF4lNVZzeMKDl8T9gJYfXB+H1xKcv3DsxSUgXUzYOHjgZT+TxhWAPu873Pc4yBAfc5X14Lr/8bZgxXyOuog/5rP3gXHvc1IDEMHVWEbD0MFMD4z7ifXd7tOz19xekKk+7vT1QbN+9Lp/Z6YwDHBIgoR64Lmf2KF8Hw5mIkDz2GCG8XHnxA88d/RMZoABug8OrDl1qOTHfk8PjDsabw0fD8n7Yl1yiE8CN35g3JGIy+VbtRM3mPjeW1c4tE8CDHxg3JTfMkEs/9c22RFlpntuXeEQnwQBTv/MEYCZp/EUidlo2LHGmuuP8X04l4X9EyE3is8c2KdNM6P1P7xNi9j9xn35VgbADzz3owZOqablIkKxf/1sDMfs2v3Cl+9B7y7Fbuaf35jL03t4xM56O2Q8Ie/LAcr3Dj6bQr73mTKuYFFWnmwNT52wQgxTAzgWtT7pwYPxICgzT+/10D9TpapR9rkvNX/jHGnTaL+YCpDRiPoUwGRjrauyYw39PB7LgiTb1n1xzYzvAgJqaqmy0ux1dsDqD0Lwx9uooBwP5XzsGAaEpgkhhLDiyZ9HzyUh4X96BSKJaRznlm/Vo6VAsiMCodTH6qci20M5b4AWLo/T5XTabE4j2tYakD+PMdcwlq4VzW+1A1OzDwkLRTt2FjHJCOh+eS5nBnEzjskKDJDK/ggZdsNmMwxdIxJEggQRHOWlPpfL6bTZbIj3vfdKD9HkTib9M4NeKBQsebqm+x/+uRNTZDwQEfvXzBEAafcrZABJlSFLUcaUYxMlchX7y4rL/CXFfpcmBAkhhNCE5nDYdU0QAEW04L0eaOrnynMFWdLYsMMIHb0EXaqpV0JFhmIy9PtQCJGQTOAIQxNm1kQQA3aHzWGzG4KEEET2soqy4tLiEr/XZss6q00rERu2mJkV2QzusyYNiOifoVzZuboOySBhGtgwm9b9I/oShIA5xEKInCFrvbiquqKyqrrQRprQNE13upz2ka+gEolgcDg4FAiGgwO9cZBi9jaIto4WQP68xVy7c9W85K2jgakPZbDUnXU2AAiZ986gmeNXsIQQ6L3QC8skl8vhtOmaEJpRUFZTVVNWUeTKpFRWNDpkSiWlYqWSoYGBocBQYCgQDEfjmVsq4NAUxk70z0zE9W/85bq2bx3rEiyn+LOsfOueKAfJ/huxe8S2IQJBABDMYPidaLs5pICKpvq6xkqfrmm6YXd6nWk/NeNDvYN9A92dHXHFSrFixdI0Tcu0TFOOHuUcBGjyAKT+mYm42sat9v53bsEmear1MXw7dhaBEtfOBsFqOqjD2LNAZeXB7Jy9tRBi7o4AlSyfU1tb6kh9Ph7uTVjKUtKKDnf39PT3DfQGrAlOAS1zxkAj6+cNfiTANs+L8HQYjETsW94IptDZs8Gpd29oPKIEQI2eANryX9lVomb84nOa5ipxpf7fUFdbd0frzYiCslhJM5lMJpNJa8wv4pF/yTSuzFD0cwZiEODwrJ2ZuHzEEjxVDILBpBUKBQTOXI1PLWITwDLf28TC6XA6HYYQwt6wZXcpuLQUQKgvalmWsoZuNbd2dXXFx+XVYsw3y/wXj/xB9XOGLZNgVf7IL9e2/sXhQaHkFH+aFcMtACB6pQva1N4NgfxdJEdlbW1jY6NbI91dUGBnEFTr1bab54ZZSamsWCyWjOc4Iae+ytj/6SNlAPpnYmrdhLZpnd53qh22KZZBREo5ata6AECFeWr4FLFi8jjtdsMQKfCJCJpgcs9oqKupL3UCQHJo2GsXkZZb71xquzWYO5KbBSunQA2+p63Dz8qxrNXqGGCa8ptOgrnyF56pUkrQVFvqRMyoWthYUV5aagcEgYhIE0LYPB4nACDa13rqTMMvzkXzNz6IxCNRyrZS9gQC3482sv6ZIBw7fWtrEuePWIKtKXu9hHP9YkpCR2JK7wYBbK+YvWlxfZnPkfsYVTzSG0taSkZvNre+c2PRw3PR93YzAMqMzzODGeoBzebuzEVV9uyX6lr/86Hh6XV0qIiSIQ8Ct6JTOfiIFBc/9cQqX8ailpQyEQ+HA0MDvV09QwnJ0oolkwMsBSAcBIAVZSVLjAfGvdtD1kylb16FrlNdsE35gSlo9hleqyM4y7jxQWBqVS4DlGzvsEwFqeLRaCwai8fCoaHh/r7BRFbOZdcBpw+6blnqAUFuqp4LKgV3qKlzUolYFi7bXTP0oWiInH5naCpVLjMw8PIJO8sUpCSVUlJJS5pWMjlabROgGCDJ6W7tz5Jx6e7DU/fzCCIwu4rWlCY+PGppU65xBVlwbtrlCTZ7RPjMpdhUqlwGkGhunuBbpYMrayIBQUAgAaU+bnarfi944DSJ9J3vV42rVMXzn69r/ev9ITF13yBiz+pGKGnYe64Pk6bUR9WLSRenUoz2bL02BK/FPgHRXf2jyXuDFYMmU5ylul33/N0VQrK+ZTnaTvZOI+IyExqazI7rJbNtZmjqLAzK7e6n6xkGI9O9UIKdlW60XwlPJZ6n3OUjl0cfybgindRPSps0lb7w/aCv+JC8ZU3nSbAyqjbWdPzP3i8uQcKa1i+44yFFYDZq5xaaV29EpuC56bOQPqor6NNuaCkFBYDtXo/bICIx2pjK2JwZbFpmIpGIZqhfJO6liVMRd3VJ4sRROY2IKyx2bt7m6H8j/BUv+sypvx58t7a5kGyvm1M49P71xGRh4Zx1B4JYfdyeSwKg1JvubVqwaF4xQRuJvZxJoRQzJYeGBvo62ls74pkHmmqZ3MOI+8Xnalv/9kB46hGXiFD6+HLEepXJA2dD936ehwA462fZBt67rSYdz7PobyRIfoyeSxBgJRXAtrJCm/AtWLSgyX+HqCuTiaHOjtu3boYslQj0JxXApN2j6JuKuMvQ8t4AjFG/y/T9cphoeQ90rlzoCl6NV7vo/NvD07MtEU18N0TsmlWNcI81yXhOxJLY5rWxVDIRs4g/gtynPvXnmcmL5jy2pURzlBYLALASZtwylSISmtA0XRdC0zQCNKezsBGxYCCWNDvefeuSlfodLHGvIm4BYtfHHKmUHszIUJZ4AnoN3PP88f0vaUsqw8ffCU3zCKSJ74YIcM0pwRRAUSHBzrnzy81oItR7s5fxEZQD9aluv5EK4OJKG1U8/NgMAnpvxizLigYGgzHTshQJoQuh6za7zeF0OuwaCSE0w+mZTYC5pP7tW/FY35ACQ9BH9V4Cs8u/pjhx9JjU0nRWIsowW7NBekHjnpAAK9fmbb7BfSdrt1V0n+1mTU1dJoqEkgp3mte2lRrQclmVE04RE1hSeeXM5WsrrWB/f2/z1Z7OAKat5KBP7U4IkgH/rs/XCne9E+g+euxqkE22pCmlgkolW0REgoQmhCASgoStrH7uinkOo6lu92D0+hsvmymK8EccuiKhVNUvPl3b9t0DkZE+rhg5JDkHrVD5GKdVv7jL0XN66NHN9uFOJppOeipSf01M6F7CGHt0EATlv3ciyYXPPlpbWgUgFExa8ev/+2CYpmtdfQpuq6QC+0ucvuVPbtJhtQSt4VOH3w1N6sd9s1eua3Dq/roGrKgWNzjSmgD4o8XeVMRdglvvD8IY8SMArNsMQzc0jQQxm4lIyCIWY/4SM1C23J84c8u7rB4yCRKcqsYnX5GSUBYXVdgGu6wJOYnMQMwal2PzBBWjc/kTOwy09pG/3gtgdhQnBkhToGlkBPpUQotkGNsfn+WtKAf69v20VclAfzirJ0k8EfeXAxfaDzk0x8yHHyty7moMqPf++2UA2kdUQ2SwC6FLiZFnJVgBcFeXFhX7fG6Pw04yGei8fKaLoY8hlrFSosaJs68NzpxvQ4rHTinjysk6ijCSyvHQ58oO/F03dDmRvWB2JSfTcydi5V/7+BID1//8fVr2+02Q5Hi8hA5FCWI6p4o+ea6QoppiMfs3NjoRuRIKvr/nSCqyaTS23UzjkTml4t3dAE43Dy63eWcamBl+NRa+bYJJm2YlR2B2F6/xJw4ftzSlGCBSltZYJArmNZQVFfkKXHahgVWi5/K777a2msj2XUFK2Zdv8UYPn4THj2RbHMxCWTQFqJQ0lRR1q39zs+H+4O1wPgkrBqBpGLgVHSmziEH2suJ42/gpYkGW1DfuKgneePGnA2gu/9xsZ0Iv2tifPJjkaWnk65M9AZXkgucf9xbNAlr/+UCPGepP8R5GWpScc0tjvovilLWTH3a7tLov7/AX/8ZD8uy3bgBCk9MLKCSUqvq1x2ta//FATEASIPQEF391vbCXFGYrW7iK5m7ofu9PrwnD5BwGRu1vP1R4+3g37A7cODEEZi3jHpN7kpotrsp+f9csgcZn7UcG8hU7DBTYcfNqZORQJYZ91rOPXf/T8+OniAmwLWyky98+Nqxj8LvXfm+1bmmeJ8TZzukFXX2StZdy+bwrv7IYuDEUPPlPl9M7GcCThYUohXGo8HXgTLR9SWnjMjS1vpEY6lAMMZ0KUwjJxoZFuPnBMAyACWw5qrc/XQOzv9WUSqnURDoJ2BoX17f+4LapRn2XAZSuKpfnrrCoKjSPHglqQkpUldmgop3Dd8cGmUjFRfXjXyxuC9T41re/N4BxdHhSxM5qr7xyNZp5+YVQKNjw7JKSQoyZBCYwO32rGwmB97s0N4e69tXZF2kW+TY/fqjLKFHd0am676SMq0nG7O2b5zUhdvw712W4A5TKOqbQymMwAQogqFM3XLVPPl5b8G+eHH7juwHompTTi7jKgeClePqsEErWf31HlXn76LvNEShmZmYCNPY+9au+f1P5Rz3QRuIiK0a5DZf39aJ2Q0XXWxdMhxbmol953Mni1vcOBe8gWJSC1KHrMVX8754ubvvzyP+xtNyr5w1mymiY5x+6djM+EjKJ2L9jHocT+Vyo6tnd1YDNSZxUEIF/HPhGhZ4U5V/f+HfaU+o7V0jwPTYuEVvsn7Xz2WWi+fbtN19KAqQTmKdkER55cwkIBHBxuGttXVM5SntOB4aSwFQjbyriripMHMpEXJBC486G0Om9h86NfXK9jm2zd5/cO6zS774gKW1Ltnrjh45GvWvW2QduJ0QConr7L88BMCfOh4Kg8dUTCCIFzwHMpqh59EvlLT/+XtkvQ8urgS4ku2YtcnffHhypoQmAq9GGQGxsaCdhsWvrZt0SlpNhSmFL9L65dkeNnnDOKOijz/X9M3DPRV+FTvB++X9fkNzzWwuaSokIoBT6ND2dKI1ABE/dvKdfCzNffeG3ZwFiqhJBQhfa7G+ei137nM9uaOlj3//VXuvAr820gwRlXUI4Gn71ljz925UgTQCAZhBm/EMX33zSQNPfDPKppdCB8v96g63OlhgP/cvc/PsISBj66H2X/3Ur9/xODZae4sh3ZoMMbXwnrOr3bvLZDaO/TTMIK99jPrFk7Od1G2HRSZax9u/OBRmCdCGMGb92gy1LmS3tfG7V+L/wET2XACbPsice9UVa3nqhH9AJSk0fPGQGoBEhHMZNvatxZtOs6qK3m9uSnAdEmkzE/TAAI1X+o2DrRmf/vrfaIYyc3oROseajzY0rmg92Zd59AurXVcQ/vGLCO68ILCC9pbu+VNJy+rx71+LC+eMiYqbQYhZlPl1obElt7VO1Ha++2EleO6BTfnUr99wKJGJZnWICEvF0extjBlCE3wGKXz0zCFZgS7fFb8nnGsiEXgfErSkj3ZMxrnfDE+t86r3//u6QgLoXS8lSiQ2ZR84aW/7Ev7ry84e/2QsbJz9CxIVQXPHcdnfzO+0QufAPk2DS40CVY+QLkOad55Hv7R0CNA8waEKs+YVNJQN/ti/a1DTPllT56iESihnVu9cVGY5Ar6ieUdn13R/3CpWQ+Vc+EQDXLBcsmZsw5gU5iaVet9QLCp07k+5PscUUP11fbwdUKp5Nboh/xPX0uwPZXLz9seroe9/fExF2ZSp5L3TeAEECfX0YWLihuLa2/NKB7hh40vhfClXOjrgEwDe/CB1d0Awr9yW3hIDWNVxoM0b6uJZzw/bC0MGjcaGg4+aJYc+8L33BefvVF7pg65UUNfNSWSX7/cWbvjTf0GANCz9w/aeXNFvcsiaQiCOAXDmTBWAFzWcbD/UIkijasaOAKXLuWiKVGSgFXR7zf8mNuOUQkxtwY5lVlep3PUZZn7O6Rlz8q6NRAfPeNTwZSoGo/89/uuGJ5ZVfX/u376YEaaaGKn/vYFyMNMwJHLmeyKeIwRy4uLowE7GIgJLnd7m6Tt4khs+TPHZEbPvSLmfvt/b0E2TIhK7ln01wbd21oLEGAPQSJaHJQHpclvL7FTGrHL0aYqlXL3LnAfKIuOLJTXYgdr2XdaUAMDQKnnQ+4gcLmo5WnX6XOSclbWuenM/nfnh4WLMnrXspbwwITY/fvt3e37JsZnlAtA1FGZNL9jOocibipn+lRV3NFtQ4HJAZkZbeUfcim33lhoK+41ckCe9srznsWPfkU65br77UK2xJEUtgfDJFAAvP4sef9uNWrzSKSzwEwXU7j7YmoYn8nstKwQEgbGX7p2vFBv94QVUSErb6AmaS2RNLbCYvnC91aZMSYCUw3LUeBNtiqapAv5uHoOLXnihu+8s9QYGkxL29WJkgtL64f9uflH6p6fih9xRpkxydZsCF4MVE9quq2dDRHsvzWQJUOJxOYoiUKFzxXHX/T37YDfasXuPl2U/NW+bq/faeQQ0WJ4eGysY7CgFcsPmxrX58+F/Oyoonds4yWGn1f7D+P7ZAF/kQdQJLeBrdiDWPMh+J2L92XSHnZYyaZgp1GcONfknbUMSTnYGo/78Xmcf+5lYK/dLv4l5CLNxc3Ld3T6+4p347EiBIF1Z3d2DB7hmP1Dj52rA1Cd8lsHL6V/kTh46bWha5RujoH5ggK1PKRBpZ0k1L27DdNnjgHdZk0bbV9kTTomrt9usv9wiXmUByYDCfnwjJxdseq46e/cHLwxjeYeiDFwdK58/0vP3ioFJ5N1+Qgm32ilL0tiUyzCIioGBeva7GfJyYFdlLQQzoWb1fpUhLHClY4MdkOs1CS8K9ah4GHOnvo9+5VykdM7ZWDP3kH/qJzfvDupVSEQ3++bn/r3ahVr13T4TEXSsiEoorv/hcTWtOxAWIEAya45lQlKPDTJrJxuIKhNokEQrXzNRQ7NP6vv3GgECCgURvX55ChQGjaWW1OPcXx0K2skc2VuPd/3Gt8peeKf7t2AvxxEQsjMLV64rjrV2J0eOF2F6uj2+eCZauhVtLAIKpcgNQsuVsaPIFijTReyaUfj30O7MD4d681dV14AMYpnWfNguADD3e9sqc3Q0LKvSuc5G7N0CEkGxsWYaWM9kRFyChzISaSKvcBmaANCthVG9ZmLxxoF8ICc1vSMPON998uVs4kiYB8a4eNmy5qYkgaWlrnprPZ354aBCVz3xxtTj9L4dCV/3Lli5f+889obyNTqG4cMU8I9jWn8hW5UxgvPRBSsNuRyET4r2JsRltIDnpuSe91h5+bc9wqlNzR+MSCeV/aBESXUpMOpGdhn0tBTH01+//u9UlG4Pet8OToIQx4EPsenJsNcoTyotpbneqAQdLlf37XQ3N3z7ca5AEKyhNdP/pm/2ZnMLs7Ig6/Lk5NwmJ0l992t/xV3tChOpdy/Xb/2VPWKirtxaLGhFK5o+5xO45fkQ6uhLZp4nMU0MTEZdsW6opYbZcjow9eyaXKhOx9CzcXdv26vvJNJir37kMQvFsR+D8AO7rKKlSui3etqdMW9DwePRa8G5rs0jB4V3hjx89Zo4lj008YKsX+KAUoECu1Y/Vx0/t74QDIKeCZrXve6VbOJIWCERqoDXsrnJHeFS1mgC7Z9t2f+sbb/UKY+7Ta+03X3xrUNOt3n1Vyxp3xsvyroMiBjuBWHuXmarfiVkJe7UjD/hFgCh1KKLErWuRsXFlcqumBFlwb9nuirdEyZB3LYVYsdbos478uPs+zIGM4b9ChH7Y8/8sblh3rCN5579FgmX5Y1+pa/lf+yNarqeysNnFBFo3JSWQDFjsWfdsWeLk3hBgklE23wXR/c39ab9lCMFWa7huRs0tc6T5ToJV6c5fqW77by/3kyr618+Udn7zzSGhlBh6IfAf5vxJcOZEBpAKiLd3y7R2lGCrYNmukvxwRNIEEaK3W6JjhhYmy34k4sINDdnfRL9TjcvOZZu8QwePRATL+2pctnRbon/fbH3OwifDJ5N31EsWwmL7lrXawNlB2HKcXFko9jsSeW/bXumDUtCUKt6+xdm2921pkxIFm3cWxocOvtIrHOlagITicNxorOkwR3owQpgwNq03eg9dI3vFrqcqbr/6ai/ZTambvaf7Zy9N0SvzTJoILwBzIAoNKn24+7bv9HNc2Ck3V5aaUeOQAVGY7GpPZJ+TrFgU6JNFL/wNYvhqfOR10O/I66v9ld3ey2cGacpSmdPwXRaB73b8x9rnjJvtd1YlJcCo0RAYF+isOOoaLgTHdWIJgL3GBWlBCG3+mip0v3MLdpLwP73D0/bii/3g0RyVwRbqGs6GR2kzBOiNdgRM4uJ//2hV57f2DgpYSgBkFynKJ+XDiqsXeQEVzjgTEVC0YZ4t3FFUponchoRn2eM1oQ8ca7mvw8zSiCOWWtV892SYP6xgbypMHPpR58ixLu44MuJaWik6ez+O1fZsCTt1v/FGj3/bCqfGdxgdZKU5myrjHxxJCsqlgQgbN84ihshzU4Zfg7DD1Nc8uVhdeuOGUkrYPPMX+23Rg6dgGy1AUkok5XWu0fONlc2/vC5x9nDQaHj8mcael19sVXZhMZjYY4OMmeMRKiGY3Ss3+wGS2bQyo9Rm9XZGc74jCUbRth2FkfOXEjQYghh5O4Vgdi1a67t7TiU0lrYNO/2ho4cDlHku+l3aNwhdjnw8g6XKVNT/N9FfrN7ddy4yoRh9Kid8sr71rw4M5dBaCGBB/nm2/HtMhQ0wDXDRLzxd1PZn+/p1WFrBkl0FAPfLMbWAtFBc58iYhIilf/uv1rf/9ZtdVV/dXd73/e8P0IinK0b+TUYEFG/c6M/FoogFof281The73nDLIRbSpI8yJTNcCcuWrO6SNLdHIyERMVXHnW1nxscnTIWd3BzzTXDEz9yJEb4OJThlQUD5/YNGJu3+XhCpFwIZveW7fbImc5YNvWKFTB4plfNWuxmC+MbcCSQuNyG6id3lzS/vKcjaRgqKTZtdSZjXdGxtQADznIj8zSFALu3brL1v91u2/TETOv0C+dgwFLpnSYKgmg805lIwDWv1sZZTs1KocBuvne8X89NkggQpYbZFdZ1mciO3yQA74JGg5IqTVG6AxdKm7feH3y/OSu5E3fISV0rn65v+97BgEYfj5qDIKA/gRkbCu+waZYIvg2NEPqYTyhG+9/9dKDuCxucksa2zgmahsD7Le7f+VpF1zf+bECQRYB95QJP5IMjg2NLD2WBspIYIrianAjEacsvV5tXjjWrke3klFk4wfmKG8OfE/2JJRUuLO85eKRHH38Warj+rqhwmWrs1JOj2oFEcz/uvOpRsWP2+uLogX/uzarQxcTzXuzdutURvjKcFDQdjZlp8HAUEG6L6xWOie+DGShppMHLCeS8ckoRxY7vH3Jte2SObiWRnbAwGELHgDX7yS81NP/45Vbl0My4MXNHk6EHDh4MjT2ZzGHGKCeKmVFUgt4z8cqHNtj79x0Jaum5SlYKHj1/KcqKQTlJvyBm59L1voHzVwNa7oC21JyNBZEDB1WdZo2rlaWOxLk3P5QuHyYcUhU6TG39joLA4aMxbTQT0e9UNa2tnSw8kq+SmnppzIyhIw0LNe2Otbd9TlF83/faxyHIQsrbnU1l2wbleSZDZh/ZjAIbokt3LW4Y+PbrgwKWgKr4+tYqpuGjZ83syVkGEG+JeDLfgcCKHbOK4/v20ppVHrTs+SCpKUnpro+v3pF/kIeZUajnvKNCoXjbOoQHQkkeQ97xLn6i+uqr7zxVijxiRhpu/ujEtpWFjcdNNQF6R5qEZ9cqLXJ+gPRRtF2/AxPVUSlirRZP41Am4mmIEChihE4snW94JircBRR71m72DR88FB0/qU7o3Vs0f4EUnqsDyaywTQRnpR2OTfO0llde7BGOhKU7XOseqWGpWz1xMjj3eI+3DHhG+wyKtYZlRV0vv7PhuUXmlZcvxCmz/kdBq6h3pCZFaZwqpFG1xD0WzPUurUZSkrTG4Mq+bVuMQHOIfDlnCDErMhoKzWN7bpSHKmsK+zg/QwewjJLtq+nGwZYcrQX9DlqmPgfOvN47HcI4i+kgWgxQ7PK53b46Y6J3VDBX/9IjrtuXouP4+iyF6PvHrj+uW+xd9uqPI9DTCbeAgnfuQheq7NrAt18bEDABVbb96UJmyruPJNHRUZ9p1xMBhSvXOHsuiqcf97X/xZsDmT4UAXA11DtTnsvjJgj9u3aVMOeGPXuZwGCCLDPrZUjlynVQTG4neGxXbt5DVZ37b8iQdFRWBZJ5TwkSSlV85Qu1Lf/pWKeWXUHoE+qRGuVrfOFDh4ZoysO/BJb2Gfb2ganukGYSMnAzWFRX2K/yRl0SEs6FZejoHx/mGCySXW+u3FXf1FgSPD80ZI5+HW39WjuK1I29L/QIR8LUldQ2bXMBAqY+/nkl+nogeLQSKlzXBNvStQ/5ml/f20O2zMlJgKuuzgXQuAk8IVj5NqwuyL4JBkPY0HU2bEe2cVO5sia74i6fnvOLSFgo2r7VHmyVIEmNDc0TGFdTqHx4Ma4dahn9dhMbl4Tkkt2fL71+dApaDtmCfaj/hu/P92CqK8KJiPvizrLyYXNCxj8DQ+ci+c4TtogG/vL472ww1vqvvrGvZfQH3FtXCCX6/mzvgEBSCU2yaCwEiEMtsdyxCQaQ7B9t1xMB3oVFqP2qb1b3t/YOiKyoSOyob3BONDzrnuUHKw2jQw4Mn4dPHQwUYFwbSaD1cH+BNzeLJiL2b50JyYCZxJw5pwN5/5hizTOvHMNXrDGhSp9o7os9GxbqoS459Q1ZRLC7dzymSniKO/VSyK5paYWFhpmfbiY12wx3/OCRaL7zhKEZyeY+/2D1jPlzaqtODipYCoaurGULXGy273u1SziSFsGyV22ZYbYkGlzX3hscU6MyYPX3J+ze0ZLCKIQqKcXwW690jWDQqQTJWV+pMyiP6AaTKMBQ2FeAuMr0srSChYWBE2elDYlR9UBmqRmNBYkjx+LlBSL3yxBgVNhUvwKUQvkcVz4KoRAyaVv3aGXy0HGpW3ISBDkidtQZiExjm2yqh/KLtludk+xVja10GC6XlnfSTrDyrnimvu1Hx2L5zxNlMkVePFr63K87V854Pi7NmEkOuyBPGaj3W/v6BJJSCKnqv76tvu37tq/o7x4eyC1SmUCyvyvsqbcnVObcUQBx8NV/GszGoAmAo8EHS6Nx6mkMhtttHe/bXqCCVvosVL71O4qvnw1DyEQW0MDKu/iJms7Xr8LlFfn4Xx3vDgNmEs4Z+ViTIF2i6AuPFbT+8EBc5NpenzCd8hZy+4exqTf7hDBhbF3J3b2YhnUBAdhsYqKde4XbtjnC14Kw5denkUKTPT2IFc61Fy/IIoCrSPjwaym/EwTM2NkYO3u2SQ98eDk55iViEjLSFS2qKexJ5abE0oRicfPVk9Jm5p4ohgfMTJL0nFkhUjB8ywu79vYvabAiMjUTSFy4aZWWCAKwzDG58lZ7sMWE4cqtH1kJo8GbOHxgCIj1WLpH5GXEJvWKXTt8t/aeCMBgTMq4tqaS2Fs/7ZpGm54Ao8GGYXN6mLRi6AZNFJGL1lSDtDu1FRhCnf8Tj2fxo2uLRrZFi4GX/6Uv5XcKevFSX+LIsZK1/hs3ouP0HomI+xKOYv+AlVmCSmAZvXI5KMTYiMdpMCPnLSZi5d/5lP/q8WgQMj0GQoBveUUqs06Oem4mV2YAlPNOE7F0L9pd2/bSqSRx+PyyGi0PMV1oJpd/9cnalm8c6BvXmNUnqCYdyzcWDh0/nRRTn3tnm3NJTfzi4emKdvGEDk8gKqXwbXPiBjZL0oSIXQXOtV1d4CUAMIrLHZEDbyubaUIIS7o2bSvoeO3CkxsMMzxe75GERNzUfX7DSoERZDH0wLH9vZSrF0eAZaUoAsIMW7lYlHfTSor3yCRkKuYSAcJPsZY4YCWSo7eYypWT3RKAnj2qI0iyd8tWR/hWhIiHTy2vcbjHEu4JYOFcvXtW4u09nWQ35SQGwYRC1bMPO29cS06Ci5hHP3zjL9W1/NXBAW1682J0B8ERJh3vv9R1x7cmrTU6dPicSychLG745YeQ6LIECZmaNnhms95/bKihDHnb1Aywgt9vi4GYGewm0MD3DwbHjpmm8AJmInTeimadU0TsmeuBYl3AiqiUgChAOs7v6QWsaCzn/WWBm4cHABgih4NBXLSxIWV+Cp9asq5o1qm4zEmXCSw9Gz5fnXz/UCTPC69PcPy5ltcgMA0dU0EW2zZuswff74RNWdMlVXH+XFl3zfdFjhwcvlPtnRplAMvhzHx85xM2hOOpAMMs0LTSM/T29aJCWF3x/K8JKRQW6oAgy7LP2VFkDp18e4CMnFOPFcOhg0mLtvaceTc06lUMJqMIoWuJUjtUItU/UsJo9MUOHxwmtqLx0XVhUjNmFqTiKms0Nimr1UK3koBAsufCYNXas+cTuapLmsVlO7a5W/e8rQzLnIxxQYBwQ7bHp3GuErFjQQGs6WLSoAmMC8HKt+XLVTffbr+rLjJLSvf7CWBvtWHeiqbCGktbzYby0Ot/H5vhwq0jg/kTRqXgL7YBApKr/+1D5b2vvzyAnIiWwpyrbIAmWr9xJhoOjzodK0axB+++GKi3IWkyGEJK16LHKluO3gCxGY5w+rsJVt6lT9W07T0vaQy2yIpR7uFTL3aBmYi7g41br3e353gugxzzV1fg5uFrShtfJekT6MyWuOWlExFMY7+WbsxrTLacNKfdBSaYJudHp4q2bzbCPbjrXnlOzWYRoAmLFsyxTh4IEZQSJOHZutXTsf8MZpWaRw4F858BSqGgUAdYANXr6hA4eSpntiGNOVfNdIGAwbdvZhMviZWtfJ0veOQUHDZYSgECFgq3bbFHuyUJsgJB03ACioWw4Nu+xR5qTQhiypo1EFDKMXNjQfDQwQAxE3EiiYblL2VTEYRmmfqqpxbxmVev5QV99LyToqJ0ddXQi6/105R3SLPyLnqqvuvvXuqgaQ57EiEeV3nmBgjwLvBi0lQ9JZhgkl6zrqLj7/aENKVYCFYlj68QgevsX1/Ttfecqal8y/FYwVNogCTrvll2JisYlFqOYxEAz4L5XhBDOCiLU0tCcsmTnyu+/l4Iup4ue4i4eFNjCj4XcnAg7igXilkQsX9dbbpgI1vWXQtG9VeeK7p2qpM0yQwkB6FX2bODtTAk+3/hqcL2//zmYN78RuTlOhRs2VI4fLIlKaYIDgvB0rZhpz36zvUoTVMLmtPGzTvtWsDhW4nJkT2ZpZRKWq5Nmx2BcwNJQSmh4MLZruiHbbb1G+xDtxMs8vYnmGG4BaBMY/MWmwTH1Fjgjwi+pYvcKmrCUQDNRqPPgODesEAL9wFCwLI4vU+qXIs2J8BCINQVdVW4oVgQIEpEsssE56ICJAD72katszOF2ykE3rnFRYWjYCnpKi5qn9pdfPvFN3ukPqKylMVzEHldp+KpdRTum2jq9M5u51nbAI7fdfPBxALFpMKRiZxepzNv9U0+ExCaQPkTy6BEWl9IMYodeP8nHRW7l8C8U1KmuTSAUfL848WAHJJjngUR4F44xxFuGYbgnMBNBHuNhmDqHszUlD4zazjzajcAguyIuCvLtVTNxxquHxjIDE5T9ndwIHIllYUroPeF1wKlC70jDVjNBuX/vT+o6vzmn/eLrAkjGl0KKvKyHu2zfRhI5N0depdLc8yZa3WcDk5PFYsV4NCtWMTKVx+RUV8YO3Y0SDTZaM5gcs9yRpsthmIiVlr54oLQoeOqcKEH0QkHFJihF+gQrrIN60rcApwYB/wR4KzyUKgzAMHZNRUrRlER3zoVBhSnkkOlbCWLfdHDh4IEBiGcsFVX2gGlNG9TQfzwoeGxsq/MtsIFvviRoykGG5NIXHg7VLxzo92CLgChq7ioe+r5xuZ/frmV7UIxkRCaJjhrCcpE2DJCl8NTzZWJFNxzH6nr+/6PW6c3f8LMVGpLhsJq3LshWDqbdlW1nWjmyfepWDG8Dnz4Wk+qQpJcsGFH8e13h+FwIXZz4r0DDK3QACoeebJsoo21xIYHiY6+wjG8VpbsXVQeeu2n3cTp7agkufzhX626dbSFNakEoEw01F+KQnHh2s9Xte69ZBmUBETWGK8s2fRLtS3/sD+SulshWLWGandEL7UIjQHNiKuS33uisvObewZECvEmSjP1aGIOFSvSqjyJowdDmGK+KwRLY/1DzsjRD2OCppErEyu4yl3R7hDGvslCMHu3bTGGO9WkmT8kmJ2zNhREDh0eJlJKEKFw0zIt2At4HXz5xNBEcIlSgNMOZd+6xT5wow+6kW8SyGL0XuwI5xxSQjAXbNpSOHz8TJhGPJfZuXW9LdSlIIhTCt918zwgTvHU2pNKF1lUbSbByrZxqzN8aSiZYjgTEQYuhX1r52vKgq5ZcVH75HON/a++1Aa3TQmNWElpWRZsGk+YLQuWtsbtdZ0/OBidsuQmAZ5NcyAHQNOhYhDAWlmlp6MlTuO28hFx0ebZmMrCNBJA9a8/W3zz2O2UtxPgWVQM04I+rzS47+DwRMg5WwBpYK3WEXn/2pxdE6hkGbh4CrNzPVcwV31phzHcmt4slJZiczQYiI4wGy0TFQvdALFvWSkyuXYW5kOAfa43SwGJlULfa75NxVtbL0vdrmJc8vuPVw3/8/cGiSS0FCbPACrLI72ZqKbnmckt3L7VGbgUyMyKTeFp2mzLFlnNxwZpelqdQsJWWWuPB/NXsu5aGxI0+WguhISxvgnNzWokvTN8QNSkuesL295tZpGflAS2gHiY6jdUJY69HCoZN1BAzIr0uqLAyZMlsRQrnUercce8YnSHstA2IlVVKlvfjYKZBQNWHHq5HQTSiznWZoIUiNlKZ5TEZLPNb0y2nYpnTk9FRJHD1Uv9W3v4uslcUL7tC+WhQz8+bZGMpQKJs8Bj10uW1vH5N7pTSzD0PKVq6SMLYE1j9bsSvhXP17V962jH9FBlAuCqr58giyXWBMz2+FRaTQw4MXQ2i7dBDO4LeJ7YogfaOSUsle/nTCA27P3dp6pu/u3xxXlqa8HS3rS97NapS7UhpXtyNWsVMHg2BKYRAo6tfF3V0Is/6Mys3TF7LF3TQRIuB53f05sCn9lKPwRhccGSZ+u7/+fLbZR5kiw0q+V0pHSRdL5yXmrrf3l9uXX4xxfMkbfKP2fBgoYSZ1Gp850Pu1PTVnqeYX+jxsEDPJYhc/d5d8vSNuy09524Abs1PZVdYtfc2vwrJ4hhmei+EMIkgZWUVtXKosSBY4lRHIolrL6gc0UV4smJkXO2lJBW6foZ1qkT/QnnuLqahIWibZuNSL/V2xJ1lRgmp1NAVoZ9lid+6EgkfVZINkg5N+0obH37HAtmJgVErvRVQhE7ClcWhA8fHCZWAlAJJUhA6LBMsX6XI3TiKvQc2u31/dvrV5VV7+suf+5p541DPzod0lwFLrshNHtF44IFszwa0DvYn5GO0PO/7x2nhsajrnRnnWnNYseyUgzxR0CV4ZpbAWuCfoNw4MP3AlPRY678hWdqWn54NIu3QRrMQKKgENyXvMPdKIaz0evgs/uDghLjepBExMW75jATIheG/Y1lXakklYhl0crP17X+8FjMoCRSkvya5X9iDUU7OJ1JMIZPr6x0F7Co2PFc+fXDNzmFQamIaRc6CU3E2b6iGslo9hZMtog6v3nqD2tn/tYzQa5x9nz3f3dBlC9cOL+6UNcNT0ERAMTe2X+2oyXdnNTHxRJhNHjihw4OjzL6CWLE0uklAHlERThpVG9faJ0/bAmenuOCAEeFHfnkN1iRXu2PvHM+Olk2phCS9U1L0X4um7dBAsrSfU7cfi8INSFGzUDZQ4WV5uGT7LbFkU+5SK+wI0JAb6h6fuNgDEKlt3pu3uGMXAvCxQBL2OIBiaalzuFzA6khGUWE6JmTG8o2X+1MLltpxLplOv1USUYyAhkFVe9YnLx1LJxNq2RoRvxWbOkqy6ioMsz+24GikqLqpoUL61wAkBi+mkggce3woXZkFIH0cbHEvXB3bdtL7yW10TXNQgAqJUQy0YYH0iyu+Nquupa/PDgkpj03RmxzQvXngzCkrWFdadeH3TkH1V0hDA+St8Z6KDvq55bF33qt7w4sE6W0yi96y7qO3YJHmHnzD8UIXgoBKkHzFlyLpcpLIvYsLwXSmusyCa8e5uotZeGDP+lB6uhmIWTbyY6mXxr861CpI40rMwMyZEElmYHi33mmvuWbx3rGzDEqTQ7+tSvhWrxspsPSvvy83V1Y5AWAaMe1q9evhyXLyODQqLKnPi6W+LZtcYRvRsmQqWeS2pyTeT4qs9JNZO/BIiYS+uKHG2MnD3Zm7+aaqm2RZAxeHyf5ASFhb1pmDw5MtsNMYHYVrylOnDhqiqx6XWiIeDYtKQucPG9NzDIhjZSnCa1vXVBQeT7FSrM1euJHDwwBmkD94gO9JNJkwoo61XsmxqQIMNxcuvTW4JZHvD2Hj4TFyO4jqLaWuTO/cMXRhK4zEUAxMSPe3u8pXyska2u+MMN6/2A7bJJH8ERWlkWUvAqUldZUe32VlQDiQx1xyxruuHL1enN8BKK18qq2EhH7NzXmSlqlNudoGjN4JJkhDdmZjVDknv9wSfLtPcGPuBHPwKX3xi1eS7P7YfFU+lNVv/RUbevfHghnN+tIR8D/xKKCjpvWHVgmKha1Gej+5ltdgJWUY2IuEauCJU/XtX1vf4zYVPDN9ablayQVLS0Lvfy9tlT+Sw7yPbpK+WdT8MLAqD4BMyLn5teu/EuaE/jRj9vBCkxA6MK7pTVfa25F3cwG6/ThSLoMSsP0nOqUGbUb1y0oL/XqAIbOv3/hZkwqMx6NRKyM240iavr4WFKmJbtGKK2pzTmlLm+1jy2SZjgQkyoRHghbIzs1GSDdtOybtrm7951QhmVNWy1Qs80ujr39wfi4KhS7ZpamXqnJGVdPsr5pCZpzt/yBGbbGxjL0hyYaE2XFCF1Y1ET9r73QS0KNXzQvyGL7xh2uyJVhAkKdizSPRSCQUMq7Zbu/6+g7UrBk4sETZvWMGcBw+5GW0fpcESF23L5x9kIMHHvpPUXMTIoQu7S/fs2C+RF4EPrg1dOwSwiA08MXrJUW2TTX7A1b6wyYnWHTDJx/78ObydwltjlLJ8Zny6zh+oH+zJkrjKSy7Xx8ltfnFAy2zHjCtAbOHTgVyqyxExKAJmXJhiYx8G6z0MR0+7gsvcueqmw+emvclAMBcM4qzOaETkYW1onojTEcTGWhvNjNgZvRCQ8YBvr3zZ7Lr/1tP4EByxybLROxZ3UtNJ2IMXx8zkwtvWWBueILW7RQsyShlCKt7T8t/o0duhp6/V8udozS65iJAsdunXt4fXjP6x+m8myGgNl2tNKzgDyAPPjj93pNAZXaJZH6ojN2bq7XbcUVOhA8fOBCSMpQIDDir8i8AxM061Ps95mpLkXKI4VKiroVv7LNCWswKUg4C10AeMXMuedDyVB3IrX+Q1gJmvXkKu36mzdYTXPvXIrtt32rMdHGSsMvkLAmzbGzHNUbSpLHj8rcxVTKhJMweOBQaKKsWxEodm5vtfkvH8CwFJRpjm0dkEazZqu+8zEGIXRoZo1vXmucIYREySJf5EI/iEiBKHKt3RcrCt14a5+FHAYWm0ND/UOXoofPJDN8VQFKtu6z1hWR5Ns/OBke2SGqFRW47KSXbNk53wbEOwet+JX9R7pz/RWcJzXQxzL6lz9d3fbWJSvFUBBGQpX+++2Ndtn21vshodk9/tr5cz1U/vnNvfGhd148pwAIQ5Oq7KtPV7V/a3+PNn2FfCIuWl094bErNKjhyesxy4avbatv+U7Wlr9MU5FZdP7TsdCEvSUGI/LmBW5WpAjgRJJz2uhQwjlje83QCz9qAQsRO/PKxrovm28PAoCocalTr/Sl8mKWoOgrJ3UZHbAoh4HFBKDn0HtqIJki7KYLzuT5thd1SCvcmeWDMzYuaywxbJ4qOxC/cfDd23EVHRhMow4j/prvHNLHMvq3b7UHW5MkGExQSa36sedLhs91vv/GhSSRcPhqFyydWWR4KxYB80oOtMWDA2EmrW7X09Wdr77WC7s1ffkMJqOc4h2JCeNqcmiyniskqrfNlh+cHMxWhyTA5mYwR68OwHaHriShvx8QLAlQyUTOqm4hLNO9/iFP65ETUijSkvHmsHPb9XcssKQVO4rCh49GUnkxg3TZ15fawWSNkUMTJIeGkCrsaOToDIcBAK5qr02ASDOYSjZvWOAWQLQjZMaa3zt0JTWeoqeGWO7Y29HzMPozf4w0k8u/trsk8pMXW4N9CTCkGR68echh08vWPjXHVvvruwJDp986YaL8a49Wd//NTwaIp29bZobbjsv7+vMzEoWGxIA5uVxcCc3R5FBnDowjxpOdiCl6FxoCY3QxokokJOUicXBvXUihFkkapzUxCuboTEKV/ubTvhun2mhE2S5Foc6jh5JGetOJ8MifNby+An9hUXFFealLJ03omu4qswMcPHf0ZJ/F0cCARam8iYC7zfroYymtJRTvMDO3Z/Nue6q64+A/viPTdTlzNNoLABd7NtS6S2cDS+qKmtXKJ2qCB390U3PHp6s0R2B2lK/zxQ8fCuSPhiQQGTYnkywLkqZ9/Y6i8P4TUlOjpy8r4qHjVElXDyfvwuYgIaAkiEEcT6jRvg8RJ/WyXatx7WAPERNbhNgJT+P87Ye7rbJHHi4dfucajxCQWVJ6b5rM4cCwYpXiuVhMTpfL4dCEppFwz6gt9ft9fq/NsGe+dLAjbJqD19490Zp+tya/iE0fnytfeasfzExCWeUP/3plzw9+eEVSegHYCMTc/tP9du+Cp3YaZV9YEVL+sviFkwN0pzWykxjerPjSl0qb91+V+RmJRAgFJzV1SJpE0Zce9dw+epW1rBEQliTav3nkN+h/HB0Ud84NmEeP4ljMMkb6PqRbqvxfPVfX+q1D3RpLgIXo+KsP/qjxD1b+bejpX6kOvvaD3hwCHytkI2GZZXGc2aOlVcyc2dhQ69SEoel2n8uW9S0S4c6OlmsXh6VKRgJDI1F20jNYem6ubJ/tix85NExQShMKBTvXiva9Z2CAM+ytVEnNVlcXcKY3Wm8VzwWAiOmtjSYjYBLTUgFN9V4XoeuWSSLvFjkSiMbl5EjtNt+Obb72fResnL4wgyhyY7gY+/qg3eUBqdHoHe+LO4p1ixUxgRQ7Fj8xL3l6Xxo/AihyO77z2TmlWuDJ+erCKydiWlYKl+EkirTHpk94tnu8XkOQ5qqbMauxvii1FEdGAv1SKcmSlYIV6e1sa2u+FRpBngAongJjWM/JlQtWPlvVuv+azOhNOBttiA6C0jeb3ruZ2cmH8JGbNnPpHzYwNPciLWleSenqT897GeSHbJ2wV0NpJuEkkm4uefLXqjv+24tdNGbujRk0+CNMWmKYIYhkV7SsrrhHpoFDx7Ld9da5w5EMKMEMGn6h4DH/v7JsaDl2JkT5qAojKFPq//I0zV+81CfI5ijwpGRRYv0tPZ3NV4IAS8WsmFkmk/F4NJmDPE3Jb/Qx06+b7eEOkzKoq+FAst+EoHSCMNppJSEANTgIJDpmcHDIW7yuqGJ/Z2QgQGDSpmpgYnZ6V5Yk3z0SnzAaEixzMjbRLFW0c5W4vvcaGdZYbTjSZRdIn3RqQEIiEHHOmRGOQTAgUbVzp6/vzbdlBolTijR1ym42ukW0//TB7jHb6XM8lrWiApdNaL4F8+bNLQEANdzflrSkit5ubu7qbA3nxbkxhXWnExiXiAtXV43NUIdv5tWfSMdgIfybikCde4ueLVgw45G+82/sU4BGgJzqNH7J41+pa/2bfWFtAiktAszJYMsMiPoZInI1mJdeoJgwRTKHitOCJa1xaFCK/Ku3zxTtBy+qrCl2NrvfOuuxUzIWHAyPVT4Q2R5bv3HFzBLdcJcUEIB4340rl1uHklIpKx6PJhIm5Zs4JExTfVPPzZWLKd6eRPYm31CvhTyoEzMghKLa3c/OMq+/ss/jbOLKhVhW476VHOwmMIkpeK8QFuub11Dne/2wTVC6MYPvPl4mhDRp+RMzkscPx7TxG4bAkgSmOOgiDJ455zUFEwrFW55aIS6/eiUJnbO3cA0OZkWFEWCClSQFgEWRz20TesnGjQu9BCR7O01pRltvXr18MzLOS3PvmacPHOhj1cou7u3PYhyJCUY7MqWaf/XuVY7mPz045G6x8dLfm1v49KLB7tf+KQromIqSDTFEFXGHnJj+xgo2h3G3dJwMpUp+89mi1r9/M5oCIe64M2uSQ4dUMFOk1DrW/OJWT8ef7e0XY48mytkkC0pt2c3klnUb184qMmyecgeggldOHOtTbFrxWCScHKm4R7w013E/QodNz+FgzPDFDx8czprPo9SUWv7ERaqCdU+tc99+eU8vIj3ANf9uZ/FsyMrYxcRgb5p+O8nn5yjbUJ388KilTRhbhI7KGqlg3CH4kOCEVrvr0ZLbbxwbhsETzAFNqVNFPHjE3bhg29E+y1ey4KmH3Ldf39Odq/eUTkHSn093llIpqLfQ4xRa6foti7wAgh0R0+y9dfbE9fHOqsDge6uOq+dwMB6rbjl8PZvRT3mWp41MZUEs/IWHvF3f3DsomEEI//AtMee31tlX/3F3++s/jgM6JtVGIGKu/K3dda3/dX9QTCheKRnVywwWujXx7xS6qcp//7Galv90oE+whXux14r0rv9y7o9m/MGGHwxs2jKryd3zrb39YhxDM102U3qkKK0gCP/KdQuq7TZPhROwek+f/HBYqkQsODTSFQBLkbs++j4Yl4SFgm1bbKGOMcpTE6WuwmLb0ud3Fd5+7eVe4TClIJJtbbiAjvry2Y1mVfxidHCYmLS7V72kWezbthCXT/ROwOJgAIFrDd5lOw52xcA5LJCc1NSEb+tTtbHjb3SNV4iY5j5JQdHb0Q2fm1Pj7d083xa7cvDlHmEft/kuTW/IjHKxo8jrEnrh0rUrKwwg2hU2E10X33l3ILtmBRSY+b7t9Bk1boaDwZNVdySe9duPFXV9881BgaRiRVAgJPd/YG/69c2uDeUt5/YekNAm4UBKgP0e7jgdnTDEKEb/K/r22j9Y+Kf9EDrnBygNSxXs/pXy5Lv7I8C9WrnBEtT/HfVL7i8mbQjv/96HAwLjSzJBOR7rXrRm8UyX4S7zAQidOXJyQKp4eDg4hi3B91eDXs/umJRrqn8swJd3Ka8Q0tRnfvmpotuvvpze7MEAaYJUXx8uc/vs2lmzllU7rvYNSeDOzktCWtrcXSXmweNKlxP3WANH9KJ1cwuuHUsMBdMkLnDW49FImcq59JmNtkuvnVLGVPr6d8GqSJenbc4Fbi0SvPLGq6YY4ZqMTEuOIk+uAq9L0wvmL1/V6ASszo6ENXj95PHW3JqVPwbl+XEtP7SdzOErM8Ow5cN5daXqvvpkUfc39w5mbedkBQWCdfi8Y/H/tcz/9IJLL+zvh9DvKHxCQnLlV3eXN790Kjkh4stEVvsRn31V1def/WDfUU6/dJy1x0PTEkpf89xqR/Tskeus3csNZorN093FxWIwFOk3kdX5ovQg3Ugd6126YtFMl+Eq8QMwbx7Y3yNVMjycjrGZXs7HsjMiy7isAL/TPHIwkKNAznA6RD7OBGY8/1zx7Vde7s1SQ0ztoxfAwABu+h4rrlkwx196pqMlCb6DtDaRIZbsqhw48G4Exp2+qmw9xF0LZ81cXutrMQM9MtObS1eUpqWKFn/+ierI4T03LLqXz48laZGrmQNCsxRlTCrTMCZrhQUuu9B8i5Yvq3cBsqsnrpJt7+y7kIMLfyy7IsYbl1hSybLKntdOm3pWT4YZbpc2VjFA0+Oq5P/8XPEYvx1B3BUIsZeOik3/wb9j1vCJP+6Gpk2EGxCUcM9+uGL4X/6+506oNAOQN/r2bPij2vIvrhruPvxCe04RQlKy87HnVlXj7N+eCIp7vZ5OjU4ascgQM0YbZWhYv2Rmuc1wl/gAmC0H3+y2YMYC/RmexPRRpo9uXEESrqXrClpuxii7OmQFZ0GumDsRW9JW8dDzFbdfeqkvW8U0ax+9EKqjA13z1vsa62vOHwwPx3ic+PUor0HbuN3R+uZ7bFjyjn0FEQ1jcM5WUTIP1mzf2yEZjwVCyTTsbSv1Lfz1Dbbhiz85PkTGPVtyldn5ogtiFoC0zBEyA5Pb43YZuhClG9bPK9CBZHdnXCU73tv3YbbHTgsXvpeeC/g3r0KSxw0h20tsOVIcRMLiGb/7UEXPt/YMTbANm1kqEA38xT8tfHpH8dcePnbgLEjPbzoBODfOQV/z3Td9SgYN/88f0/zfXa4vrOuOJnqvf3ChOZjGgB7a2dSkD7/5j+8HCNY9dBJK/wMQU2ooPPPbyxfNnTvXo+s2d5kdUJGLJ472W0jGQyMeK8Un4bG5xiUi9i6qhNRyT2Bm2Px6LsAPuBqe/0LR7ZdfzOO3o9WDponErVsX+4dWzaqfUey/1mVifC+GiE1bxY4VOP9W/11ngBgkhLoJXHY8Ue4obwLU8KqLt9q7TWIUbnx0oei7fOmtAwlhM9XUXHN0YVcezDPVs5WjOltup8tuM3TSClcsbqr3AlDB9ohp9d3+8HgGeUotR5lS8/W+Zsv2MsH9ibELaSF8Y41rrPy1nUW933pj6E5b7JmlBFHg0NmNf9i4uPThV/96UNjGvQqkWVz+7x6ra/3zg32T4E0yKwVC9OW37Z4F6zZW2/yb1oejUYuIbMVuRP7+XwaHEjSlMTRK++bov8YyITkXj3Y2zpzRUFvuMHTdVewCgIFLF69cDiiViGaQJ87kWQx8OowrbOi/NoZQpiSyNuwIUhbbS+Y9/5z7Tn47koKQpvHg4GDjY1VVld6WQx1xjI27JIRqenhW5Oi+rgyv4W41pyZI9vYC75+9tKzWZrM53X4bSxnuiFoXvn8eENqEkZsy/8ltXGaxh/LlcYbNsNnsNptGukbkmT17RmONSwdghnuippSBM2cv3IjkIE+ftMeOjbnEuh2X3gvmvm0qlnXTpGlJRQt2bl/l7v32nf12pD5URMN/d3j744ua/t+Vf9xDtjGQoGJ7xdri5NGXA5Pmb6RraUQ+bHnJqRl6YU19oYpHOm4GZLiFcGc0j2jM8EAWCpL/zxv+kjJ/aWlFRZlNE4auOQo8GgDEOq7euH4tYillhkKhXLbEJ+6xucZlxXDZ5bmzY4RdrYgSKTlpQawsyZXzHn10Ll3f+2Lvnf12hICi6Yn29t6+h9bM/NyZN7uTOTtphJBJ24adhb1ZvIbJ6OSTJgAr1pEOJ5WFHA/3J1IAkGQ13p7Z8XNcTw260LXUP5quCyICCSIiQTAKSytKy4pKSoocqQeViAZ6TGlawfbLV661xLPGyz5O5GkqxiVmZqryBC7eTIic5VhyOOkgkcqRhbS48CvP1Jfj3J8dHZyE36YeqAniawPnnv9yxdfn/UVnTlJFmoT3kdV67wddwpgKosQKI0tYOdHaxUqmBIDyNaEyKFI6fo75gGb3FrjdngKP21Pg8XgLnRoRCSIhhCaEbnM4bWklGxXta2lvb70VUUpKMxGOhGVWa+djRZ6m5LnEiooaCvrb47nr52AOxR2kIJRiBaPMt/Yrc9HZ/MKrgUn4bSZKCo3N7n4u3z7zqeP7E5QlY6dMo2rnJufVPc2Y0mbtFBM81Q4HK5XIzMxY4yikWShSCm6zOxw2jYQQJASR7vMVFhS43e4Ct9vtdei5elPKNOPRYUsqKZVMDLe3Nre19SRySEhph/2UeewY47KjsdEVz1kmzQDM/mChJiCEZKBqxyNLZvP51/ZdCU7SbzNHPsE692PxcPXnk+8Oq8zBTJrJZV97pLbt29OaMOIMI1NlUq1cYtoIRDjqrFp5XU1lXU2VXSNNE5rQhWbXDV3XcgFWaVqJYHA4GAwOD/YOhi0FqRRLMxGPxWNM2X+f8GkKsRMYF3DU1ZIlc8sBhhkIQWiw9KICT+nG3Su05rNHD5yFmMoMLkuhAcOH/fObtrd8YCJjSBKGvvKx+uG33uiZ1oTRCM8rZVaVSyEdqUZEgdvp1DVN070VDbXVFVWeDO3bMs1kIqaUUqwUK04TSuOBUCg8HBgKBoLDQxE1fqhl5Iz/lPrrmJgLwF5RAStn4IkJSPb1zreVgz1rty4rrSrFwJ8eDA0TT3EiiJUA956+2VS+xJ7BqQlKeRc/UR5+/QeD+IiIUpa00YjHjtxK/bJZM2d5NM2wO5xuR4bJ3z80MDgwPNg/kEgF8NEL0pKWMi3TsixzTAKW5a3ZDalPtXFBxLayorHFCBMS18+vq/+SMz57/cZShC4kT73QA81QUk7Vx4QmW98oWzJ365HeREo4RTNNbcM2x+XX31F3xJQnZdqMy45yl2yFXpdNF6J03dKZFW4ASEaiw6ZlSaViHR29A/2DA0OBxF0pt9mVkwIzPu3ems9zbeW+MQ0pZiESFw99rvqLW7jAAwx+//WB4T6aFsOBpdAGfzL0H+u+vuxvrkMwg3SLHSsa0HI5dldMGZOb3aYsj3XMWb1sjscwbJ5iOwAEWm7euNkVsJSSimUikUyaZtK6wy5pznxvylsU/+wYFwQYPsf4biNZ8sM3V+l2vfe2mTz93XOAMKY1pMmAnuw98kHDnMj/UmRYEDIuah5exWf29tBHI8Sk61glU9R+o9jn0nV306KVc7wAkqH2mKlk6NLVG9fbzHFF0gTbuTl90jN+phx1Yg6VU4x7K9kCur5VpBukTMsMdoCmVrKMhSMjRxfO1RgMCCPBZb//RE3HX+0d1j5qXpJyrpSwkm3eppUzXTZXkU8A6Prw4vVbEaWUGYnEInJMKQCGJJrYb/mTbOjcU+MKQ4yDzhkQyetZnxVTjbY5zUNdnmiq9yxoD1sMSy966Jma5lff6p0UpjzRPlaA09Kc7CorMHT3rOUbZjqByEBPXMrB906fbzfzscEyE5T8s228STcOpBJ5tkBz9tsuP8KzYAgRvbD3ofpfo/29BFX++V+tav/Gm/3TlhLMIvUDAJY/tqrQ5iwqJsjB99/+YNhSMhEKhBSNT3Q/C045JeOaYQUrSikp19z1aqNyzh8p7xGQVvNA04aWU72a4prHlvP7e9smjXTlHYdUANhT7HNoWs3uneVArG8gEe++fPKdnnEoEtTPdvyctnEZiLUESmHxeCLryLjNRz3CGIDVB2dTATSbe8kMtH6QwPT8Nn0ggwF41uxYWupwesqB+Pn9JwctGYsMBWlU+5imMSD0GTKuIiD8zvzdFSu7gvExwpn3LiqxBKInZs0tspNpW/toXfzgCWlYUzOuAI2QhNkoK7Jp3kWbNpUSooOXEvEbRw405/RV+WcARbrvnquECB11Lq35V9bLMWGY9+d5MDP1/sTzb31FzN5ndjpbXjlpiqlVuJRioqfDbNOj20t0Z5kfCH7w1vlBKxkbHMhhG/5MoEj327gMElbgw2sN64PhdwYSrE1L1WISsggi0Xzq10u2dCU2PFTY/Mbp6NhNzXfPjFMU0aISj6aX73h4NiHZ1Z0IXTx8sP/TwDb8lCZUzIienV+9xf+974XIxuZ9eeFJKAxFq7641qqr7vvW3l4x+ao5DRmnwqx/57Z5Hoenwg6++eb+HkuG+oc+UX7wp9u4iogSxxzb56+1D7/dmWQ1dVWLyZFE1eCZsvp6oOX1l7snNYeXmxk7yzxOzbf04VVeYKg5lhw48sb50SGcBx6bj9kJQJBwz3jimUXi+oE/uwVo2eJc9+oSYC7Y8YUnnej5oz0dKmduZWL4SaSxMgCOFY8sK7N7SgqA4IkDZ4OWOdSbJGTEge9LNPlMgBhsDp/VouuXzS7reSM22KmmqGoxKZSKmMJHWM2iUz+9C3cyoymRcVmtrNimuedu3FpFSPS2JMPn3zwaHImyzIrlA1tO6LkEBnkKPNv/uLi/ZWDPd0MgHfflmCuscGG4WZF2p4Cb6ctmcJOZjz5crjtKSoHYxf2nu5LJaF/ggctOesoPJEQkhKGFm+tXoGLwg9jgMKatB3cnZZPhYWAiLkeGqjjalzWKCj2aXrz5kQUCZvflRPj6if0to4zDTwtD+NPtuSnnJaK6OY88Nhu3b13Y+5YCdIK615kVpXXt8/pruk2TwTa0pk1rmtx2V7kTaN37Zpe0IgNDaaphuuZ9YMPJDF8zSNcSt293d26eM6txeY3zZmqPCWn3sn9CpAGc1V0ijM6nj/Qp2OHzunXdVb984xwXMNgWSw4ef+ODKeuWPvDcbM9RgNNfsOjfrjbUjc4Le/YqQNP4XrrvWIcbddesFcPuBSsWz/XYHIXFGlTX2ycuBi1zuDcxGmY/8+26ey2bAGaQjng7bjs6ayubmpbVum6b/V0KqbXr9+aBqhEcMQP/jsps6R6v164LzTN/8fKZHiDRdyOR6Dp36N3w6OycepAZT8tzM3N8hDK/Y8HvLtdwc3jote9EMiXHvfJfotG9L9m/01E/b8nyMkO3uXyFAOKXDx3tt1Q0NBh+kBnfA3lAsAQJgZ4eXHHsriyeQaiInFVWT49FmSRmmkSx3NiaJYrncrkcDkMXmnvW7DmLKjQAoaHuhBVpfvvQNTzIjO+d56YjLxO4wu9o/PL2QvR0WV2v7m3LBuZ5WnutRWZqJ1vUgIqbZs9sqHMZuuEscBsAAjcuXrgQkCoZGx5IK9k+yIzvieemW7iaAHd340y4fXFJ3VLIypoTAyrROyBH9juM07jhO786rDAytcPC4/I4DE0TmqOyYdasxiIHACsS6DFNK3jp/IVLgRxNCcUPMuN75LmZTaRM4IIST8n6x1dpCLbFrZbX93VNoB2b4fnmGXbOWrqeuYzqOfPm1PkNXTfsbldqQ2jnlRvXr4ellMlIOBTLWgf5IDO+l547omohwMEgcKm9p9oomKthWU3jqWFLJaLBUNKiO9H/87w3DN3lcrtsmqa562fOnlvnIgBWJBxIWpYV6bh4+drt2Fh18Aceez88N91sU0xgKi039Prnt/uBcG8kafZd//DsrciU/5LR0NQ0e45X121Or9sGQEZbbt66dSOilLSsRDgStkaZihnt0wcee3+Mm+H6ptpttPOxxQV2d4ULUIGL52509iY5NR7HrJSSqSm5DIsYgIAQmqZruiChkdB9VXNmza7xALDCoXjSshK9bTeu32yNZ4sOjpS+D4z6MRiXRHrFJ3vKvJpRvHbjMh8BMhqLJKWVsqkZj8bjyUQiaSmZtBSDmYXQNLvd6Sr0FRhEuqbZHK4CHYDsPX/5+o2IkspMJKLRqJU175pBNn7eqU8fl3FHF5Gk8uSaDWub/DbDZjgK3KM/KqVUSialkqYlGWAWpOk2m0M3DMrwoiMxMynN7nPnLjaP99YH/vpJGZeQir4AU5HPZdMNQb75M6uKy/wOu7jbj3My0d/b0XyjPSAtZSUiwZDM460PUuJPxrhZk6pZwti+GVWlZSUlJYUGKKUARJQ9bcQpX1Sx6HB/V3f77VZz/HQ6P0iZPh3GzezHGTGezWGz2QzDoKx1kjRK68ictFJaZiIRj0mMzYV/9uZdP6vGHTtqPuVZTjGSLT3w1k8YxLjD3EC2ggtNfkxodGjngW0/pZ47hlBMNDnbMtSDA/jT77l5ps8nrUny4HpwPbgeXA+uB9fP8/X/A2YV4Th9VwtjAAAAAElFTkSuQmCC";
  const cv = document.createElement("canvas"); box.appendChild(cv);
  const img = new Image();
  const draw = () => {
    const dpr = devicePixelRatio || 1, w = box.clientWidth, h = box.clientHeight;
    cv.width = w * dpr; cv.height = h * dpr; cv.style.width = w + "px"; cv.style.height = h + "px";
    const g = cv.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.drawImage(img, 0, 0, w, h);                              // stroke shape (grey levels)
    const d = g.getImageData(0, 0, cv.width, cv.height), px = d.data;
    for (let i = 0; i < px.length; i += 4){ px[i+3] = px[i]; }   // grey level becomes opacity
    g.putImageData(d, 0, 0);
    g.globalCompositeOperation = "source-in"; g.fillStyle = css("--ink"); g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = "source-over";
  };
  img.onload = draw; img.src = SHAPE;
  redraws.push(() => img.complete && draw());
  addEventListener("resize", () => img.complete && draw());
  ["contextmenu","dragstart","copy"].forEach(e => box.addEventListener(e, ev => ev.preventDefault()));
})();

/* =================== Knowledge graph explorer (Deliverable 2, Module 7) =================== */
$("#kg") && window.d3 && json("m7_graph.json").then(K => {
  const box = $("#kg"), info = $("#kg-info"), search = $("#kg-search");
  const KC = {gene:"#D41B2C", disease:"#3E6F99", symptom:"#2FA3D6", pathway:"#00A58C", drug:"#9A5FC0", variant:"#FF854F"};
  const LABEL = {gene:"Gene", disease:"Disease", symptom:"Symptom", pathway:"Pathway", drug:"Drug", variant:"Variant"};
  const show = new Set(Object.keys(KC)); let sharedOnly = true, picked = null;
  const nbrs = new Map(K.nodes.map(n => [n.id, new Set()]));
  K.edges.forEach(([a, , b]) => { nbrs.get(a).add(b); nbrs.get(b).add(a); });
  const geneN = n => [...nbrs.get(n.id)].filter(m => K.nodes.find(x => x.id === m)?.kind === "gene").length;
  const disN = n => [...nbrs.get(n.id)].filter(m => K.nodes.find(x => x.id === m)?.kind === "disease").length;
  const visible = n => show.has(n.kind) && (!sharedOnly || (n.kind === "pathway" ? geneN(n) >= 2 : n.kind === "symptom" ? disN(n) >= 2 : true));

  const legend = $("#kg-kinds");
  Object.entries(KC).forEach(([k, c]) => {
    const b = document.createElement("button"); b.className = "on";
    b.innerHTML = `<span style="background:${c}"></span>${LABEL[k]}s`;
    b.onclick = () => { show.has(k) ? show.delete(k) : show.add(k); b.classList.toggle("on", show.has(k)); build(); };
    legend.appendChild(b);
  });
  $("#kg-shared").onclick = e => { sharedOnly = !sharedOnly; e.target.classList.toggle("on", sharedOnly);
    e.target.textContent = sharedOnly ? "Shared pathways and symptoms only" : "All pathways and symptoms"; build(); };
  $("#kg-reset").onclick = () => { picked = null; svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity); paint(); detail(null); };

  const W = 900, H = 600;
  const svg = d3.select(box).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("class", "chart kg-svg");
  const root = svg.append("g");
  const zoom = d3.zoom().scaleExtent([0.4, 4]).on("zoom", ev => { root.attr("transform", ev.transform); labelsByZoom(ev.transform.k); });
  svg.call(zoom).on("dblclick.zoom", null);
  let link, node, label, sim, k = 1;

  const radius = n => n.kind === "gene" ? 7 + 9 * (n.fused || 0) : n.kind === "disease" ? 13 : n.kind === "drug" || n.kind === "variant" ? 7 : 5;
  const always = n => ["gene", "disease", "drug", "variant"].includes(n.kind);
  function labelsByZoom(z){             // with a node pinned, label only it and its neighbours
    k = z; if (!label) return;
    label.attr("opacity", d => picked ? (d.id === picked || nbrs.get(picked).has(d.id) ? 1 : 0) : (always(d) || z > 1.6 ? 1 : 0)); }

  function build(){
    const nodes = K.nodes.filter(visible).map(n => ({...n}));
    const ids = new Set(nodes.map(n => n.id));
    const links = K.edges.filter(([a, , b]) => ids.has(a) && ids.has(b)).map(([a, rel, b]) => ({source:a, target:b, rel}));
    root.selectAll("*").remove();
    link = root.append("g").selectAll("line").data(links).join("line").attr("stroke", css("--rule")).attr("stroke-width", 1);
    node = root.append("g").selectAll("circle").data(nodes).join("circle")
      .attr("r", radius).attr("fill", d => KC[d.kind]).attr("stroke", d => d.shortlist ? css("--ink") : css("--paper"))
      .attr("stroke-width", d => d.shortlist ? 2.5 : 1.2).style("cursor", "pointer")
      .on("pointerenter", (ev, d) => { if (!picked) paint(d.id); showTip(tipFor(d), ev); })
      .on("pointermove", (ev, d) => showTip(tipFor(d), ev))
      .on("pointerleave", () => { hideTip(); if (!picked) paint(); })
      .on("click", (ev, d) => { ev.stopPropagation(); picked = picked === d.id ? null : d.id; paint(picked); detail(picked ? d : null); })
      .call(d3.drag()
        .on("start", (ev, d) => { if (!ev.active) sim.alphaTarget(0.25).restart(); d.fx = d.x; d.fy = d.y; })
        .on("drag", (ev, d) => { d.fx = ev.x; d.fy = ev.y; })
        .on("end", (ev, d) => { if (!ev.active) sim.alphaTarget(0); d.fx = null; d.fy = null; }));
    label = root.append("g").selectAll("text").data(nodes).join("text")
      .text(d => d.id.length > 34 ? d.id.slice(0, 32) + "…" : d.id)
      .attr("font-size", d => d.kind === "gene" || d.kind === "disease" ? 11 : 9)
      .attr("font-weight", d => d.shortlist || d.kind === "disease" ? 700 : 400)
      .attr("dx", d => radius(d) + 3).attr("dy", 3).attr("class", "lbl").style("pointer-events", "none");
    svg.on("click", () => { picked = null; paint(); detail(null); });
    sim = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id).distance(l => l.rel === "HAS_PHENOTYPE" ? 50 : l.rel === "ASSOCIATED_WITH" ? 130 : 80).strength(0.5))
      .force("charge", d3.forceManyBody().strength(d => d.kind === "disease" ? -1100 : d.kind === "gene" ? -480 : -160))
      .force("collide", d3.forceCollide(d => radius(d) + (always(d) ? 14 : 4)))
      .force("center", d3.forceCenter(W / 2, H / 2))
      .force("x", d3.forceX(W / 2).strength(0.03)).force("y", d3.forceY(H / 2).strength(0.05))
      .on("tick", () => {
        link.attr("x1", d => d.source.x).attr("y1", d => d.source.y).attr("x2", d => d.target.x).attr("y2", d => d.target.y);
        node.attr("cx", d => d.x).attr("cy", d => d.y);
        label.attr("x", d => d.x).attr("y", d => d.y);
      });
    let fitted = false;                    // once the layout settles, zoom so the whole graph fills the box
    sim.on("end", () => { if (fitted || picked) return; fitted = true;
      const xs = nodes.map(n => n.x), ys = nodes.map(n => n.y), pad = 60;
      const x0 = Math.min(...xs) - pad, x1 = Math.max(...xs) + pad + 80, y0 = Math.min(...ys) - pad, y1 = Math.max(...ys) + pad;
      const z = Math.min(2, W / (x1 - x0), H / (y1 - y0));
      svg.transition().duration(700).call(zoom.transform, d3.zoomIdentity.translate(W / 2 - z * (x0 + x1) / 2, H / 2 - z * (y0 + y1) / 2).scale(z)); });
    $("#kg-count").textContent = `${nodes.length} nodes · ${links.length} links shown (patients not drawn)`;
    paint(picked); labelsByZoom(k);
  }
  function paint(id){
    const on = id ? new Set([id, ...nbrs.get(id)]) : null;
    node.attr("opacity", d => !on || on.has(d.id) ? 1 : 0.12);
    link.attr("stroke-opacity", d => !on || d.source.id === id || d.target.id === id ? (on ? 0.9 : 0.55) : 0.05)
        .attr("stroke", d => on && (d.source.id === id || d.target.id === id) ? css("--ink") : css("--rule"));
    if (label) label.attr("opacity", d => on ? (on.has(d.id) ? 1 : 0) : (always(d) || k > 1.6 ? 1 : 0));
  }
  function tipFor(d){
    if (d.kind === "gene") return `<b>${d.id}</b>${d.shortlist ? " · on my shortlist" : ""}<br>rank ${d.fused_rank} of 15 in the graph (fused ${d.fused})<br>RNA ${d.rna_lfc > 0 ? "+" : ""}${d.rna_lfc} · protein ${d.prot_lfc > 0 ? "+" : ""}${d.prot_lfc} · GWAS ${d.gwas_neglog10p}<br>${nbrs.get(d.id).size} connections · click for details`;
    if (d.kind === "drug") return `<b>${d.id}</b> · ${d.stage}<br>${d.type}<br>for: ${d.indications}`;
    if (d.kind === "pathway") return `<b>${d.id}</b><br>${d.area} · Reactome ${d.reactome}<br>${geneN(d)} of my genes`;
    if (d.kind === "symptom") return `<b>${d.id}</b><br>HPO ${d.hpo} · in ${disN(d)} of the 3 diseases`;
    return `<b>${d.id}</b><br>${nbrs.get(d.id).size} connections · click for details`;
  }
  function detail(d){
    if (!d){ info.innerHTML = `<p class="tip" style="margin:0">Hover a node to see its neighbours; click one to pin it and list them here. Drag nodes, scroll or pinch to zoom.</p>`; return; }
    const groups = {};
    [...nbrs.get(d.id)].forEach(m => { const n = K.nodes.find(x => x.id === m); (groups[n.kind] ||= []).push(m); });
    const facts = d.kind === "gene"
      ? `<table class="lab kg-facts"><tbody>
          <tr><td>Rank in the graph</td><td class="v">${d.fused_rank} of 15 (fused ${d.fused})</td></tr>
          <tr><td>PageRank</td><td class="v">${d.pagerank}</td></tr>
          <tr><td>Module 2 rank</td><td class="v">${d.module2_rank} (RNA ${d.rna_lfc}, protein ${d.prot_lfc}, GWAS −log10 p ${d.gwas_neglog10p})</td></tr>
          <tr><td>Druggability</td><td class="v">small molecule ${d.p_sm} · antibody ${d.p_ab}</td></tr>
          <tr><td>Open Targets AD score</td><td class="v">${d.ot_ad}</td></tr>
          ${d.structure ? `<tr><td>Structure (Module 4)</td><td class="v">${d.structure}, mean pLDDT ${d.pLDDT}</td></tr>` : ""}
        </tbody></table>`
      : d.kind === "drug" ? `<p style="margin:4px 0">${d.type} · ${d.stage}<br>Indications: ${d.indications}</p>` : "";
    info.innerHTML = `<div class="kg-h"><span style="background:${KC[d.kind]}"></span><b>${d.id}</b> <small>${LABEL[d.kind]}</small></div>${facts}` +
      Object.entries(groups).map(([kind, list]) => `<div class="kg-n"><small>${LABEL[kind]}s (${list.length})</small>` +
        list.sort().map(m => `<button data-id="${m.replace(/"/g, "&quot;")}">${m}</button>`).join("") + `</div>`).join("");
    info.querySelectorAll("button[data-id]").forEach(b => b.onclick = () => focusOn(b.dataset.id));
  }
  function focusOn(id){
    const n = K.nodes.find(x => x.id === id); if (!n) return;
    if (!visible(n)){ show.add(n.kind); sharedOnly = false; $("#kg-shared").classList.remove("on");
      $("#kg-shared").textContent = "All pathways and symptoms";
      legend.querySelectorAll("button").forEach((b, i) => b.classList.toggle("on", show.has(Object.keys(KC)[i]))); build(); }
    picked = id; paint(id); detail(n);
    const d = node.data().find(x => x.id === id);
    if (d) setTimeout(() => { const t = d3.zoomTransform(svg.node()), z = Math.max(t.k, 1.4);
      svg.transition().duration(600).call(zoom.transform, d3.zoomIdentity.translate(W / 2 - d.x * z, H / 2 - d.y * z).scale(z)); }, 250);
  }
  search.addEventListener("keydown", e => { if (e.key !== "Enter") return;
    const q = search.value.trim().toLowerCase(); if (!q) return;
    const n = K.nodes.find(x => x.id.toLowerCase() === q) || K.nodes.find(x => x.id.toLowerCase().startsWith(q)) || K.nodes.find(x => x.id.toLowerCase().includes(q));
    $("#kg-msg").textContent = n ? "" : "not in the graph"; if (n) focusOn(n.id); });
  build(); detail(null);
  redraws.push(() => { build(); });
});
})();
