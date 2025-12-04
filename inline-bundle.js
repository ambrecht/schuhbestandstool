// Simple inliner: bundles Vite output (dist/index.html + assets) into one HTML file.
// Usage: node inline-bundle.js
import fs from "fs";
import path from "path";

const distDir = path.resolve("dist");
const inputHtml = path.join(distDir, "index.html");
const outputHtml = path.join(distDir, "inline.html");

function inlineFile() {
  let html = fs.readFileSync(inputHtml, "utf-8");

  // Inline CSS
  html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, href) => {
    const cssPath = path.join(distDir, href);
    const css = fs.readFileSync(cssPath, "utf-8");
    return `<style>\n${css}\n</style>`;
  });

  // Inline JS (module)
  html = html.replace(/<script type="module" src="([^"]+)"><\/script>/g, (_, src) => {
    const jsPath = path.join(distDir, src);
    const js = fs.readFileSync(jsPath, "utf-8");
    return `<script type="module">\n${js}\n</script>`;
  });

  fs.writeFileSync(outputHtml, html, "utf-8");
  console.log(`Inline bundle written to ${outputHtml}`);
}

inlineFile();
