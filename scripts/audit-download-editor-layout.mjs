import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const origin = process.env.TALENTA_TEST_ORIGIN || "http://127.0.0.1:4173";
const edgePath =
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const debugPort = 9341;
const profilePath = await mkdtemp(join(tmpdir(), "talenta-download-layout-"));

class CdpClient {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.sequence = 0;
    this.pending = new Map();
  }

  async connect() {
    await new Promise((resolveConnection, reject) => {
      this.socket.addEventListener("open", resolveConnection, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (!message.id || !this.pending.has(message.id)) return;
      const { resolveRequest, rejectRequest } = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) rejectRequest(new Error(message.error.message));
      else resolveRequest(message.result);
    });
  }

  send(method, params = {}) {
    const id = ++this.sequence;
    return new Promise((resolveRequest, rejectRequest) => {
      this.pending.set(id, { resolveRequest, rejectRequest });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.socket.close();
  }
}

async function waitForEndpoint(url, timeoutMs = 10000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
    } catch {
      // Edge masih memulai proses.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 150));
  }
  throw new Error(`Endpoint browser tidak siap: ${url}`);
}

async function evaluate(client, expression) {
  const result = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails)
    throw new Error(result.exceptionDetails.text || "Evaluasi browser gagal");
  return result.result.value;
}

async function navigate(client, url, selector) {
  await client.send("Page.navigate", { url });
  await evaluate(
    client,
    `(async () => {
      const started = Date.now();
      while (Date.now() - started < 10000) {
        if (document.readyState === "complete" && document.querySelector(${JSON.stringify(selector)}))
          return true;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      throw new Error("Selector tidak siap: ${selector}");
    })()`,
  );
}

async function setViewport(client, width, height = 1100) {
  await client.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: false,
  });
}

async function readEditorCanvas(client) {
  return evaluate(
    client,
    `(() => {
      const main = document.querySelector(".admin-main");
      const layout = document.querySelector(".page-editor-layout");
      const content = document.querySelector(".page-editor-content");
      const card = content?.querySelector(".admin-card");
      const rect = element => {
        const value = element.getBoundingClientRect();
        return {
          left: Math.round(value.left * 100) / 100,
          right: Math.round(value.right * 100) / 100,
          width: Math.round(value.width * 100) / 100
        };
      };
      return {
        viewport: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        main: rect(main),
        layout: rect(layout),
        content: rect(content),
        card: rect(card)
      };
    })()`,
  );
}

function compareEditorCanvas(reference, actual, label, viewport) {
  assert.equal(
    actual.scrollWidth,
    actual.viewport,
    `${label} ${viewport}px: editor memiliki overflow horizontal`,
  );
  for (const key of ["layout", "content", "card"]) {
    for (const property of ["left", "right", "width"]) {
      assert(
        Math.abs(actual[key][property] - reference[key][property]) <= 1,
        `${label} ${viewport}px: ${key}.${property} tidak sama dengan Pemenang (${actual[key][property]} vs ${reference[key][property]})`,
      );
    }
  }
}

async function readCurrentDownloadSourceLayout(client) {
  return evaluate(
    client,
    `(() => {
      const heading = document.querySelector(".download-current-source__heading");
      const controls = document.querySelector(".download-current-source__controls");
      const title = heading?.querySelector("h3");
      const metadata = document.querySelector("#downloadCurrentCompetitionName");
      const field = document.querySelector(".download-current-source__tab-field");
      const input = document.querySelector("#downloadCurrentTabName");
      const button = document.querySelector("#btnShowAddDocumentForm");
      if (!heading || !controls || !title || !metadata || !field || !input || !button)
        return null;
      const rect = element => {
        const value = element.getBoundingClientRect();
        return {
          left: value.left,
          right: value.right,
          top: value.top,
          bottom: value.bottom,
          width: value.width
        };
      };
      return {
        viewport: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        headingDisplay: getComputedStyle(heading).display,
        headingDirection: getComputedStyle(heading).flexDirection,
        title: rect(title),
        metadata: rect(metadata),
        field: rect(field),
        input: rect(input),
        button: rect(button)
      };
    })()`,
  );
}

const edge = spawn(
  edgePath,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profilePath}`,
    `${origin}/apps/admin/editors/unduh/?embedded=1`,
  ],
  { stdio: "ignore", windowsHide: true },
);

let client;
try {
  const targets = await waitForEndpoint(
    `http://127.0.0.1:${debugPort}/json/list`,
  );
  const page = targets.find((target) => target.type === "page");
  assert(page, "Target halaman Edge tidak ditemukan");
  client = new CdpClient(page.webSocketDebuggerUrl);
  await client.connect();
  await client.send("Page.enable");
  await client.send("Runtime.enable");

  for (const viewport of [1440, 390]) {
    await setViewport(client, viewport, 1200);
    await navigate(
      client,
      `${origin}/apps/admin/editors/unduh/?embedded=1`,
      "#downloadCurrentTabName",
    );
    const layout = await readCurrentDownloadSourceLayout(client);
    assert(
      layout,
      `Unduh ${viewport}px: layout sumber saat ini tidak ditemukan`,
    );
    assert.equal(layout.scrollWidth, layout.viewport);
    assert.equal(layout.headingDisplay, "flex");
    if (viewport === 1440) {
      assert(
        Math.abs(layout.title.top - layout.metadata.top) <= 4,
        "Nama Event harus berada di samping judul Dokumen lomba saat ini.",
      );
      assert(layout.metadata.left >= layout.title.right + 12);
      assert(layout.input.width >= layout.field.width - 1);
      assert(layout.input.width >= 500);
      assert(Math.abs(layout.input.bottom - layout.button.bottom) <= 2);
      assert(layout.button.left >= layout.input.right + 12);
    } else {
      assert.equal(layout.headingDirection, "column");
      assert(layout.metadata.top >= layout.title.bottom + 4);
      assert(layout.button.top >= layout.input.bottom + 12);
      assert(layout.button.width >= layout.field.width - 1);
    }
  }
  console.log(
    "Audit layout Unduh lulus: metadata heading, input panjang, tombol sejajar, dan susunan mobile tervalidasi.",
  );
} finally {
  client?.close();
  edge.kill();
  await new Promise((resolveWait) => setTimeout(resolveWait, 300));
  await rm(profilePath, { recursive: true, force: true, maxRetries: 4 });
}
