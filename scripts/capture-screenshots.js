import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const outDir = path.join(rootDir, "screenshots");
const inventoryCsv = path.join(rootDir, "data", "lagerbestand.csv");
const salesCsv = path.join(rootDir, "data", "verk\u00e4ufe1825.csv");
const serverPort = process.env.PORT || 4173;
const baseURL = `http://localhost:${serverPort}`;

async function main() {
  ensureSampleFiles();
  fs.mkdirSync(outDir, { recursive: true });

  const stopServer = await startDevServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  try {
    await page.goto(baseURL, { waitUntil: "domcontentloaded" });
    await uploadSampleCSVs(page);
    await waitForData(page);
    await page.waitForTimeout(1500); // let layout settle

    await captureSection(page, { text: "Heute bestellen" }, "01-heute-bestellen.png");
    await captureSection(page, { text: "Top-Seller Monitor" }, "02-top-seller-monitor.png");
    await captureSection(page, { text: "Modelle mit fehlenden Gr" }, "03-modelle-mit-luecken.png");
    await captureSection(page, { text: "Detailanalyse" }, "04-detailanalyse-model-insights.png");

    await page.getByRole("button", { name: "Reorder", exact: true }).click();
    await page.waitForSelector("text=Top-Seller ohne Bestand");
    const reorderSections = page.locator('section[aria-label="Reorder Recommendations"]');
    await captureLocator(reorderSections.nth(0), "05-reorder-top-seller-oos.png");
    await captureLocator(reorderSections.nth(1), "06-reorder-empfehlungen.png");

    await page.getByRole("button", { name: "Modelle", exact: true }).click();
    await page.waitForSelector("text=Model Insights");
    await captureLocator(page.locator('section[aria-label="Model Insights"]'), "07-modelle-matrix.png");
  } finally {
    await browser.close();
    await stopServer();
  }
}

async function startDevServer() {
  const dev = spawn("npm", ["run", "dev", "--", "--host", "--port", String(serverPort), "--strictPort"], {
    cwd: rootDir,
    shell: true,
    stdio: "pipe",
  });

  dev.stdout?.on("data", (data) => process.stdout.write(`[dev] ${data}`));
  dev.stderr?.on("data", (data) => process.stderr.write(`[dev] ${data}`));

  await waitForServer();
  return async () => killProcessTree(dev.pid);
}

async function waitForServer(timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(baseURL);
      if (res.ok) return;
    } catch (error) {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Dev server not reachable at ${baseURL}`);
}

async function uploadSampleCSVs(page) {
  await page.getByRole("button", { name: /Dev Panel/i }).click();
  const inputs = page.locator('input[type="file"]');
  await inputs.nth(0).setInputFiles(inventoryCsv);
  await inputs.nth(1).setInputFiles(salesCsv);
}

async function captureSection(page, filter, fileName) {
  const section = page.locator("section").filter({ hasText: filter.text }).first();
  await captureLocator(section, fileName);
}

async function captureLocator(locator, fileName) {
  if ((await locator.count()) === 0) {
    throw new Error(`Could not find locator for ${fileName}`);
  }
  await locator.scrollIntoViewIfNeeded();
  await locator.screenshot({ path: path.join(outDir, fileName), timeout: 60000 });
}

function ensureSampleFiles() {
  [inventoryCsv, salesCsv].forEach((file) => {
    if (!fs.existsSync(file)) {
      throw new Error(`Missing sample file: ${file}`);
    }
  });
}

async function waitForData(page) {
  await page.waitForFunction(
    () => {
      const pre = document.querySelector("pre");
      return pre && /Inventory:\s*[1-9]/.test(pre.textContent || "");
    },
    { timeout: 60000 },
  );
}

function killProcessTree(pid) {
  if (!pid) return Promise.resolve();

  if (process.platform === "win32") {
    return new Promise((resolve) => {
      const killer = spawn("taskkill", ["/pid", String(pid), "/t", "/f"], { stdio: "pipe" });
      killer.on("exit", () => resolve());
      killer.on("error", () => resolve());
    });
  }

  return new Promise((resolve) => {
    try {
      process.kill(pid, "SIGKILL");
    } catch (error) {
      // ignore
    }
    resolve();
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
