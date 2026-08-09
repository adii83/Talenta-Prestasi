import http from "node:http";

const listenPort = Number(process.env.GATEWAY_PORT || 8080);
const frontendPort = Number(process.env.FRONTEND_PORT || 4173);
const backendPort = Number(process.env.BACKEND_PORT || 3000);
const publicPages = new Set(["unduh", "pemenang", "arsip", "faq"]);

function isAllowedFrontendPath(pathname) {
  if (pathname === "/" || pathname.startsWith("/assets/")) return true;
  if (pathname.startsWith("/packages/shared/")) return true;
  const firstSegment = pathname.split("/")[1];
  return publicPages.has(firstSegment);
}

function frontendPath(pathname) {
  if (pathname === "/") return "/apps/public-site/";
  if (pathname.startsWith("/assets/")) return `/apps/public-site${pathname}`;
  const firstSegment = pathname.split("/")[1];
  if (publicPages.has(firstSegment)) return `/apps/public-site${pathname}`;
  return pathname;
}

function proxy(request, response) {
  const requestUrl = new URL(request.url || "/", "http://gateway.local");
  const isApi = requestUrl.pathname.startsWith("/api/");
  if (!isApi && !isAllowedFrontendPath(requestUrl.pathname)) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }
  const targetPort = isApi ? backendPort : frontendPort;
  const targetPath = isApi
    ? `${requestUrl.pathname}${requestUrl.search}`
    : `${frontendPath(requestUrl.pathname)}${requestUrl.search}`;

  const upstream = http.request(
    {
      hostname: "127.0.0.1",
      port: targetPort,
      method: request.method,
      path: targetPath,
      headers: {
        ...request.headers,
        host: request.headers.host || "localhost",
      },
    },
    (upstreamResponse) => {
      response.writeHead(
        upstreamResponse.statusCode || 502,
        upstreamResponse.headers,
      );
      upstreamResponse.pipe(response);
    },
  );

  upstream.on("error", (error) => {
    if (!response.headersSent)
      response.writeHead(502, { "content-type": "application/json" });
    response.end(
      JSON.stringify({
        error: `Layanan lokal tidak tersedia: ${error.message}`,
      }),
    );
  });
  request.pipe(upstream);
}

http.createServer(proxy).listen(listenPort, "127.0.0.1", () => {
  console.log(
    `Public gateway: http://127.0.0.1:${listenPort} -> frontend:${frontendPort} + backend:${backendPort}`,
  );
});
