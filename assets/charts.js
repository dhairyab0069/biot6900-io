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
const json = f => fetch("assets/data/" + f).then(r => r.json());

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
json("m2_venn.json").then(V => {
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
json("m2_genes.json").then(G => {
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
drawM3(); redraws.push(drawM3);

/* =================== Figure 4: 3D structure + pLDDT track =================== */
const PLDDT_COL = p => p > 90 ? "#0053d6" : p > 70 ? "#65cbf3" : p > 50 ? "#ffdb13" : "#ff7d45";
const POCKET_COL = ["#9a5fc0", "#e34948"];
const PROT = {P20702:{name:"ITGAX",note:"mean pLDDT 88.0 · compared with 4NEH (0.86 Å)"},
              P35414:{name:"APLNR",note:"mean pLDDT 81.7 · compared with 7SUS (1.11 Å, insert removed)"}};
json("m4_structures.json").then(S => {
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
    if (!window.$3Dmol){ holder.innerHTML = `<p class="tip" style="padding:12px">The 3D viewer could not load. The pLDDT track below still works.</p>`; return; }
    fetch(`assets/structures/AF-${cur}.pdb`).then(r => r.text()).then(pdb => {
      if (!viewer) viewer = $3Dmol.createViewer(holder, {backgroundColor:css("--paper"), antialias:true});
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
  load(); redraws.push(load);
});

/* =================== Figure 6: CADD calibration with a movable threshold =================== */
json("m5_variants.json").then(P => {
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
document.querySelectorAll("#auc-toggle button").forEach(b => b.addEventListener("click", () => {
  document.querySelectorAll("#auc-toggle button").forEach(x => x.classList.toggle("on", x === b));
  aucKey = b.dataset.k; drawAuc();
}));
drawAuc(); redraws.push(drawAuc);

json("m6_prs.json").then(D => {
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
  if (holder && window.$3Dmol){
    Promise.all([fetch("assets/structures/AF-P35414.pdb").then(r => r.text()), json("m4_structures.json")]).then(([pdb, S]) => {
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
})();
