import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readConfigSafe, runAgentTask, saveConfig } from "./open-nothing.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, "../public");
const DEFAULT_PORT = 4321;
const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

let activeRun = false;

export async function startDashboard(args) {
  const { port, explicit } = parsePort(args);
  const server = createServer(handleRequest);
  const finalPort = await listen(server, port, explicit);

  console.log(`open nothing dashboard running at http://127.0.0.1:${finalPort}`);
}

function parsePort(args) {
  const index = args.indexOf("--port");
  if (index === -1) {
    return { port: DEFAULT_PORT, explicit: false };
  }

  const port = Number(args[index + 1]);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error("--port must be an integer from 1024 to 65535.");
  }
  return { port, explicit: true };
}

async function listen(server, firstPort, explicit) {
  let port = firstPort;

  while (port <= 65535) {
    try {
      await new Promise((resolve, reject) => {
        const onError = (error) => {
          server.off("listening", onListening);
          reject(error);
        };
        const onListening = () => {
          server.off("error", onError);
          resolve();
        };

        server.once("error", onError);
        server.once("listening", onListening);
        server.listen(port, "127.0.0.1");
      });
      return port;
    } catch (error) {
      if (error.code !== "EADDRINUSE" || explicit) {
        throw error;
      }
      port += 1;
    }
  }

  throw new Error(`No free port found starting at ${firstPort}.`);
}

async function handleRequest(request, response) {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (request.method === "GET" && url.pathname === "/api/config") {
      return sendJson(response, await readConfigSafe());
    }

    if (request.method === "POST" && url.pathname === "/api/config") {
      const body = await readJsonBody(request);
      const saved = await saveConfig(body);
      return sendJson(response, { ok: true, config: { ...saved, apiKey: saved.apiKey ? "********" : "" } });
    }

    if (request.method === "POST" && url.pathname === "/api/run") {
      return streamRun(request, response);
    }

    if (request.method === "GET") {
      return serveStatic(url.pathname, response);
    }

    sendJson(response, { error: "Not found" }, 404);
  } catch (error) {
    sendJson(response, { error: error.message }, 500);
  }
}

async function streamRun(request, response) {
  if (activeRun) {
    return sendJson(response, { error: "An agent run is already active." }, 409);
  }

  activeRun = true;
  const body = await readJsonBody(request);

  response.writeHead(200, {
    "content-type": "application/x-ndjson; charset=utf-8",
    "cache-control": "no-cache",
    "x-content-type-options": "nosniff"
  });

  const writeEvent = (event) => {
    response.write(`${JSON.stringify({ time: new Date().toISOString(), ...event })}\n`);
  };

  try {
    writeEvent({ type: "status", message: "Run started." });
    const result = await runAgentTask({
      task: String(body.task || ""),
      maxAttempts: Number(body.maxAttempts) || undefined,
      allowInstall: Boolean(body.allowInstall)
    }, {
      onLog: (message) => writeEvent({ type: "log", message })
    });

    writeEvent({ type: "done", result });
  } catch (error) {
    writeEvent({ type: "error", message: error.message });
  } finally {
    activeRun = false;
    response.end();
  }
}

async function serveStatic(requestPath, response) {
  const cleanPath = requestPath === "/" ? "/index.html" : requestPath;
  const absolute = path.resolve(PUBLIC_DIR, `.${decodeURIComponent(cleanPath)}`);

  if (!absolute.startsWith(PUBLIC_DIR)) {
    return sendJson(response, { error: "Blocked path." }, 400);
  }

  try {
    const content = await readFile(absolute);
    response.writeHead(200, {
      "content-type": MIME_TYPES[path.extname(absolute)] || "application/octet-stream",
      "x-content-type-options": "nosniff"
    });
    response.end(content);
  } catch {
    sendJson(response, { error: "Not found" }, 404);
  }
}

async function readJsonBody(request) {
  const chunks = [];
  let size = 0;

  for await (const chunk of request) {
    size += chunk.length;
    if (size > 1024 * 1024) {
      throw new Error("Request body is too large.");
    }
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function sendJson(response, value, status = 200) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "x-content-type-options": "nosniff"
  });
  response.end(JSON.stringify(value));
}
