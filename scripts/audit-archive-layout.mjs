import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const origin = process.env.TALENTA_TEST_ORIGIN || "http://127.0.0.1:4173";
const edgePath =
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const debugPort = 9342;
const profilePath = await mkdtemp(join(tmpdir(), "talenta-archive-layout-"));

class CdpClient {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.sequence = 0;
    this.pending = new Map();
  }

  async connect() {
    await new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (!message.id || !this.pending.has(message.id)) return;
      const pending = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result);
    });
  }

  send(method, params = {}) {
    const id = ++this.sequence;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
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
    await new Promise((resolve) => setTimeout(resolve, 150));
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

async function navigate(client, url) {
  await client.send("Page.navigate", { url });
  await evaluate(
    client,
    `(async () => {
      const started = Date.now();
      while (Date.now() - started < 10000) {
        if (document.readyState === "complete" && document.querySelector(".sk-banner"))
          return true;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      throw new Error("Detail Arsip tidak siap");
    })()`,
  );
}

async function inspect(client) {
  return evaluate(
    client,
    `(() => {
      const banner = document.querySelector("#archiveDetailPublicRoot .lomba-banner");
      const title = banner.querySelector(".lomba-banner__title");
      const description = banner.querySelector(".lomba-banner__desc");
      const sk = document.querySelector("#archiveDetailPublicRoot .sk-banner");
      const left = sk.querySelector(".sk-banner__left");
      const content = sk.querySelector(".sk-banner__content");
      const skDescription = content.querySelector("p");
      const button = sk.querySelector("a.btn");
      title.textContent = "Olimpiade Sains dan Teknologi Pelajar Indonesia 2025 · Gelombang Nasional 12";
      description.textContent = "Dokumentasi lengkap hasil ajang talenta untuk peserta, sekolah, pendamping, dan instansi pendidikan dari seluruh wilayah Indonesia.";
      skDescription.textContent = "Unduh dokumen resmi SK Pemenang untuk kebutuhan administrasi peserta, sekolah, pendamping, dan instansi pendidikan.";
      const rect = element => {
        const value = element.getBoundingClientRect();
        return {
          top: value.top,
          right: value.right,
          bottom: value.bottom,
          left: value.left,
          width: value.width
        };
      };
      const skStyle = getComputedStyle(sk);
      return {
        viewport: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        bannerClientHeight: banner.clientHeight,
        bannerScrollHeight: banner.scrollHeight,
        bannerOverflow: getComputedStyle(banner).overflow,
        titleBottom: title.getBoundingClientRect().bottom,
        descriptionBottom: description.getBoundingClientRect().bottom,
        bannerBottom: banner.getBoundingClientRect().bottom,
        leftDirection: getComputedStyle(left).flexDirection,
        contentAlign: getComputedStyle(content).textAlign,
        buttonText: button.textContent.trim().replace(/\\s+/g, " "),
        skPaddingRight: Number.parseFloat(skStyle.paddingRight),
        sk: rect(sk),
        skDescription: rect(skDescription),
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
    `${origin}/apps/public-site/arsip/detail/?event=osn-2025`,
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

  for (const { width, height } of [
    { width: 1440, height: 900 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
    { width: 320, height: 844 },
  ]) {
    await client.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await navigate(
      client,
      `${origin}/apps/public-site/arsip/detail/?event=osn-2025`,
    );
    const layout = await inspect(client);
    assert.equal(
      layout.scrollWidth,
      layout.viewport,
      `${width}px: Detail Arsip memiliki overflow horizontal`,
    );
    assert(
      layout.bannerScrollHeight <= layout.bannerClientHeight + 1,
      `${width}px: isi banner nama/deskripsi terpotong`,
    );
    assert(
      layout.descriptionBottom <= layout.bannerBottom + 1,
      `${width}px: deskripsi melewati banner`,
    );
    assert.equal(layout.leftDirection, "row");
    assert(
      ["left", "start"].includes(layout.contentAlign),
      `${width}px: teks banner SK harus rata kiri`,
    );
    assert.equal(layout.buttonText, "Unduh SK");
    assert(
      layout.button.width < layout.sk.width - 32,
      `${width}px: tombol Unduh SK tidak boleh selebar banner`,
    );
    assert(
      Math.abs(
        layout.button.right - (layout.sk.right - layout.skPaddingRight),
      ) <= 2,
      `${width}px: tombol Unduh SK harus datang dari sisi kanan`,
    );
    if (width <= 639) {
      assert(
        layout.button.top > layout.skDescription.bottom,
        `${width}px: tombol Unduh SK harus berada di bawah judul dan deskripsi pada viewport mobile`,
      );
    }
  }
  console.log(
    "Audit layout Arsip lulus: banner adaptif, teks kiri, dan tombol Unduh SK di bawah deskripsi dari sisi kanan tervalidasi pada 1440/768/390/320px.",
  );
} finally {
  client?.close();
  edge.kill();
  await new Promise((resolve) => setTimeout(resolve, 300));
  await rm(profilePath, { recursive: true, force: true, maxRetries: 4 });
}
