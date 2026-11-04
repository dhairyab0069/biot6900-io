// Run with: node tests/hygiene.js. Checks the shared light/dark/auto setting is wired on both pages.
const fs = require("fs"), assert = require("assert");
for (const f of ["index.html", "deliverable2.html"]) {
  const h = fs.readFileSync(f, "utf8"), head = h.split("</head>")[0];
  assert(/localStorage\.getItem\("theme"\)/.test(head) && head.indexOf('getItem("theme")') < head.indexOf("report.css"), f + ": early theme script must run before the stylesheet");
  assert(/role="radiogroup" aria-label="Color theme"/.test(h), f + ": theme radiogroup missing");
}
const page = fs.readFileSync("assets/page.js", "utf8");
assert(page.includes('"themechange"') && page.includes('"storage"'), "page.js: themechange and storage handling missing");
assert(!/sessionStorage\.(get|set)Item\("theme"/.test(page), "page.js: old per-tab theme storage is back");

/* the four symbol controls, defaults on, versioned keys, and no external requests */
const ctl = fs.readFileSync("assets/controls.js", "utf8");
for (const f of ["index.html", "deliverable2.html"]) {
  const h = fs.readFileSync(f, "utf8");
  for (const k of ["sound", "motion", "fx", "quiet"]) assert(new RegExp('data-ctl="' + k + '"[^>]*aria-pressed="' + (k === "quiet" ? "false" : "true") + '"').test(h), f + ": " + k + " control missing or not in its default state");
  assert(!/https?:\/\/(?!github\.com|dhairyab0069\.github\.io|www\.w3\.org)/.test(h.replace(/<a [^>]*>/g, "").replace(/<link[^>]*canonical[^>]*>/g, "")), f + ": external request in markup");
  assert(!/<script[^>]+src="https?:/.test(h) && !/fonts\.g/.test(h), f + ": external script or font");
}
assert(/"biot2"/.test(ctl) && !/getItem\("biot-sound"/.test(fs.readFileSync("assets/sound.js", "utf8")), "controls: versioned keys expected");
assert(/sound: get\("sound"\) !== "off"/.test(ctl) && /fx: get\("fx"\) !== "off"/.test(ctl), "controls: sound and effects must default on");
for (const f of fs.readdirSync("assets")) if (/\.(css|js)$/.test(f)) assert(!/(googleapis|gstatic|cdnjs)/.test(fs.readFileSync("assets/" + f, "utf8")), f + ": CDN reference");
console.log("hygiene ok");
