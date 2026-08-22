import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile(
  new URL("../packages/shared/js/core/runtime-config.js", import.meta.url),
  "utf8",
);
const apiSource = await readFile(
  new URL("../packages/shared/js/core/api-client.js", import.meta.url),
  "utf8",
);

async function load(hostname, publicBaseDomain) {
  const calls = [];
  const sessionStorage = new Map();
  const context = {
    URLSearchParams,
    location: { hostname, search: "" },
    sessionStorage: {
      getItem: (key) => sessionStorage.get(key) ?? null,
      setItem: (key, value) => sessionStorage.set(key, value),
      removeItem: (key) => sessionStorage.delete(key),
    },
    fetch: async (url) => {
      calls.push(url);
      return {
        ok: true,
        json: async () => ({ data: { publicBaseDomain }, errors: [] }),
      };
    },
  };
  context.window = context;
  vm.runInNewContext(source, context);
  await context.TalentaConfig.ready;
  return { config: context.TalentaConfig, calls };
}

const local = await load("localhost", "client.test");
assert.equal(local.config.publicBaseDomain, "client.test");
assert.deepEqual(local.calls, [
  "http://localhost:3000/api/v1/public/runtime-config",
]);

const production = await load("admin.client.test", "client.test");
assert.equal(production.config.publicBaseDomain, "client.test");
assert.deepEqual(production.calls, ["/api/v1/public/runtime-config"]);
assert.match(apiSource, /await TalentaConfig\.ready/);

console.log("PASS: frontend runtime domain follows backend configuration.");
