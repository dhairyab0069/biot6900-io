// Run with: node tests/hygiene.js. Checks both pages follow the system theme with no switch.
const fs = require("fs"), assert = require("assert");
for (const f of ["index.html", "deliverable2.html"]) {
  const h = fs.readFileSync(f, "utf8"), head = h.split("</head>")[0];
  assert(/prefers-color-scheme: dark/.test(head) && !/localStorage/.test(head) && head.indexOf("prefers-color-scheme") < head.indexOf("report.css"), f + ": the early script must follow the system, before the stylesheet");
  assert(!/theme-switch|data-theme-mode="(light|dark)"/.test(h), f + ": there must be no theme switch");
}
const page = fs.readFileSync("assets/page.js", "utf8");
assert(page.includes('"themechange"') && !/localStorage/.test(page), "page.js: must follow the system only, with no stored choice");

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
