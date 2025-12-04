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
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2, // high-DPI for besser lesbare Screenshots
  });

  try {
    await page.goto(baseURL, { waitUntil: "domcontentloaded" });
    await uploadSampleCSVs(page);
    await waitForData(page);
    await page.waitForTimeout(1500); // let layout settle

    await captureFullPage(page, "01-top-seller.png");

    await page.getByRole("button", { name: "Modelle", exact: true }).click();
    await page.waitForTimeout(800);
    await captureFullPage(page, "02-modelle.png");

    await page.getByRole("button", { name: "Groessen & Leisten", exact: true }).click();
    await page.waitForTimeout(800);
    await captureFullPage(page, "03-groessen-leisten.png");

    await page.getByRole("button", { name: "Farben", exact: true }).click();
    await page.waitForTimeout(800);
    await captureFullPage(page, "04-farben.png");

    await page.getByRole("button", { name: "Bestellliste", exact: true }).click();
    await page.waitForSelector("text=Empfohlene Nachbestellungen");
    await captureFullPage(page, "05-bestellliste.png");

    await page.getByRole("button", { name: "Steuerung", exact: true }).click();
    await page.waitForSelector("text=Sortimentsstatus");
    await captureFullPage(page, "06-steuerung.png");
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

async function captureFullPage(page, fileName) {
  await page.screenshot({ path: path.join(outDir, fileName), fullPage: true, timeout: 60000 });
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
