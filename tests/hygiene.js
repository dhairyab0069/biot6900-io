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
console.log("hygiene ok");
