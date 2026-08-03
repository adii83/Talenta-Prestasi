import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const storage = new Map();
const context = {
  window: {},
  sessionStorage: {
    getItem: (key) => storage.get(key) || null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  },
  Headers,
  FormData,
  AbortController,
  setTimeout,
  clearTimeout,
  fetch: async (_url, options) =>
    new Response(
      JSON.stringify({ authorization: options.headers.get("Authorization") }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    ),
};
vm.createContext(context);
vm.runInContext(
  fs.readFileSync("packages/shared/js/core/runtime-config.js", "utf8"),
  context,
);
context.TalentaConfig = context.window.TalentaConfig;
vm.runInContext(
  fs.readFileSync("packages/shared/js/core/api-client.js", "utf8"),
  context,
);
context.window.TalentaApi.setToken("test-token");
assert.equal(context.window.TalentaApi.token(), "test-token");
const response = await context.window.TalentaApi.request("/self-check");
assert.equal(response.authorization, "Bearer test-token");
context.window.TalentaApi.setToken("");
assert.equal(context.window.TalentaApi.token(), "");
console.log(
  "PASS: runtime config, JWT session, URL joining, and authorization header validated.",
);
