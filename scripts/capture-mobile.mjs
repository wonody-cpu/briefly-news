import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";

const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const targetUrl = process.argv[2] || "https://briefly-news-brown.vercel.app";
const outputPath = process.argv[3] || "docs/screenshots/briefly-mobile.png";
const captureMode = process.argv[4] || "mobile";
const viewport = captureMode === "saved" ? { width: 1440, height: 1300 } : { width: 390, height: 1800 };
const port = 9223;

const chrome = spawn(chromePath, [
  "--headless=new",
  "--disable-gpu",
  "--hide-scrollbars",
  `--remote-debugging-port=${port}`,
  "--user-data-dir=/tmp/briefly-mobile-cdp-profile",
  "about:blank"
], { stdio: "ignore" });

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function getPageTarget() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const targets = await fetch(`http://127.0.0.1:${port}/json`).then((response) => response.json());
      const page = targets.find((target) => target.type === "page");
      if (page) return page;
    } catch {}
    await delay(200);
  }
  throw new Error("Chrome 디버깅 페이지에 연결하지 못했습니다.");
}

async function capture() {
  const target = await getPageTarget();
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  const pending = new Map();
  let nextId = 1;

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  });

  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });

  await send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: captureMode !== "saved",
    screenWidth: viewport.width,
    screenHeight: viewport.height
  });
  await send("Emulation.setTouchEmulationEnabled", { enabled: true });
  await send("Page.enable");
  await send("Page.navigate", { url: targetUrl });
  await delay(8000);
  if (captureMode === "saved") {
    await send("Runtime.evaluate", {
      expression: `
        localStorage.clear();
        const buttons = [...document.querySelectorAll('.bookmark')].slice(0, 2);
        buttons.forEach((button) => button.click());
        document.querySelector('#savedButton')?.click();
      `
    });
    await delay(1000);
  }
  const metrics = await send("Runtime.evaluate", {
    expression: "({ innerWidth, scrollWidth: document.documentElement.scrollWidth, bodyWidth: document.body.scrollWidth })",
    returnByValue: true
  });
  const screenshot = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
    fromSurface: true
  });

  await writeFile(outputPath, Buffer.from(screenshot.data, "base64"));
  console.log(JSON.stringify(metrics.result.value));
  socket.close();
}

try {
  await capture();
} finally {
  chrome.kill("SIGTERM");
}
