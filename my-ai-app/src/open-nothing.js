import { exec as execCallback } from "node:child_process";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { promisify } from "node:util";
import path from "node:path";

const exec = promisify(execCallback);
const CONFIG_DIR = ".open-nothing";
const CONFIG_FILE = "config.json";
const DEFAULT_MAX_ATTEMPTS = 5;
const MAX_FILE_BYTES = 80_000;
const MAX_TOTAL_BYTES = 220_000;
const IGNORE_DIRS = new Set([
  ".git",
  ".hg",
  ".svn",
  ".open-nothing",
  "node_modules",
  "dist",
  "build",
  ".next",
  ".nuxt",
  "coverage",
  ".turbo",
  ".cache",
  ".parcel-cache"
]);

const TEXT_EXTENSIONS = new Set([
  ".cjs",
  ".css",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".mts",
  ".tsx",
  ".ts",
  ".txt",
  ".yaml",
  ".yml"
]);

export async function main(args) {
  const command = args[0];

  if (!command || command === "help" || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  if (command === "setup") {
    await setup();
    return;
  }

  if (command === "run") {
    await runAgent(args.slice(1));
    return;
  }

  if (command === "dashboard") {
    const { startDashboard } = await import("./dashboard.js");
    await startDashboard(args.slice(1));
    return;
  }

  throw new Error(`Unknown command: ${command}\nRun "open-nothing help" for usage.`);
}

function printHelp() {
  console.log(`open-nothing

Usage:
  open-nothing setup
  open-nothing run "describe the code change" [--max-attempts 5] [--allow-install]
  open-nothing dashboard [--port 4321]

Commands:
  setup       Configure an OpenAI-compatible API or local model endpoint.
  run         Edit files, run npm run build, and keep fixing failures.
  dashboard   Start the local dashboard.
`);
}

async function setup() {
  const rl = createInterface({ input, output });

  try {
    console.log("Configure open nothing.");
    console.log("Choose a model provider:");
    console.log("  1. OpenAI");
    console.log("  2. Ollama local");
    console.log("  3. LM Studio local");
    console.log("  4. OpenRouter");
    console.log("  5. Groq");
    console.log("  6. Custom OpenAI-compatible endpoint");

    const providerChoice = await askChoice(rl, "Provider", ["1", "2", "3", "4", "5", "6"], "1");
    const preset = providerPreset(providerChoice);
    const baseUrl = normalizeBaseUrl(await ask(rl, "Base URL", preset.baseUrl));
    const model = await ask(rl, "Model", preset.model);
    const apiKey = await ask(rl, "API key", preset.apiKey);

    const config = {
      provider: "openai-compatible",
      mode: preset.mode,
      label: preset.label,
      baseUrl,
      model,
      apiKey,
      buildCommand: "npm run build",
      createdAt: new Date().toISOString()
    };

    await saveConfig(config);
    console.log(`Saved configuration to ${path.join(CONFIG_DIR, CONFIG_FILE)}`);
  } finally {
    rl.close();
  }
}

function providerPreset(choice) {
  const presets = {
    "1": {
      label: "OpenAI",
      mode: "api",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4.1-mini",
      apiKey: ""
    },
    "2": {
      label: "Ollama local",
      mode: "local",
      baseUrl: "http://localhost:11434/v1",
      model: "llama3.1",
      apiKey: "local"
    },
    "3": {
      label: "LM Studio local",
      mode: "local",
      baseUrl: "http://localhost:1234/v1",
      model: "local-model",
      apiKey: "local"
    },
    "4": {
      label: "OpenRouter",
      mode: "api",
      baseUrl: "https://openrouter.ai/api/v1",
      model: "openai/gpt-4.1-mini",
      apiKey: ""
    },
    "5": {
      label: "Groq",
      mode: "api",
      baseUrl: "https://api.groq.com/openai/v1",
      model: "llama-3.1-70b-versatile",
      apiKey: ""
    },
    "6": {
      label: "Custom",
      mode: "api",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4.1-mini",
      apiKey: ""
    }
  };

  return presets[choice];
}

async function runAgent(args) {
  const options = parseRunArgs(args);
  if (!options.task) {
    throw new Error('Missing task. Example: open-nothing run "add a login page"');
  }

  const result = await runAgentTask(options, { onLog: (message) => console.log(message) });
  if (!result.ok) {
    process.exitCode = 1;
  }
}

export async function runAgentTask(options, { onLog = () => {} } = {}) {
  if (!options.task) {
    throw new Error("Missing task.");
  }

  const config = await readConfig();
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  let buildResult = await runBuild(config.buildCommand);

  if (buildResult.ok) {
    onLog("Initial build passes.");
  } else {
    onLog("Initial build fails. The agent will use this output while editing.");
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    onLog(`\nAttempt ${attempt}/${maxAttempts}`);
    const snapshot = await collectProjectSnapshot(process.cwd());
    const response = await callModel(config, buildMessages({
      task: options.task,
      attempt,
      maxAttempts,
      buildCommand: config.buildCommand,
      buildResult,
      allowInstall: options.allowInstall,
      snapshot
    }));

    const action = parseModelJson(response);
    await applyAction(action, { allowInstall: options.allowInstall, onLog });

    buildResult = await runBuild(config.buildCommand);
    if (buildResult.ok) {
      onLog("\nBuild passed.");
      if (action.summary) {
        onLog(`Summary: ${action.summary}`);
      }
      return { ok: true, attempts: attempt, summary: action.summary || "", buildResult };
    }

    onLog("Build still fails. Feeding the error output back to the agent.");
  }

  onLog("\nStopped after reaching the maximum attempts.");
  onLog(trimForPrompt(buildResult.output, 4000));
  return { ok: false, attempts: maxAttempts, summary: "", buildResult };
}

function parseRunArgs(args) {
  const taskParts = [];
  const options = { allowInstall: false, maxAttempts: undefined, task: "" };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--allow-install") {
      options.allowInstall = true;
    } else if (arg === "--max-attempts") {
      const value = Number(args[index + 1]);
      if (!Number.isInteger(value) || value < 1 || value > 25) {
        throw new Error("--max-attempts must be an integer from 1 to 25.");
      }
      options.maxAttempts = value;
      index += 1;
    } else {
      taskParts.push(arg);
    }
  }

  options.task = taskParts.join(" ").trim();
  return options;
}

async function ask(rl, label, defaultValue) {
  const answer = await rl.question(`${label} [${defaultValue}]: `);
  return answer.trim() || defaultValue;
}

async function askChoice(rl, label, choices, defaultValue) {
  const answer = (await rl.question(`${label} (${choices.join("/")}) [${defaultValue}]: `)).trim().toLowerCase();
  const value = answer || defaultValue;
  if (!choices.includes(value)) {
    throw new Error(`Expected one of: ${choices.join(", ")}`);
  }
  return value;
}

function normalizeBaseUrl(value) {
  return value.replace(/\/+$/, "");
}

function configPath() {
  return path.join(process.cwd(), CONFIG_DIR);
}

export async function readConfig() {
  const file = path.join(configPath(), CONFIG_FILE);
  try {
    const raw = await readFile(file, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Could not read ${path.join(CONFIG_DIR, CONFIG_FILE)}. Run "open-nothing setup" first.`);
  }
}

export async function readConfigSafe() {
  try {
    const config = await readConfig();
    return {
      exists: true,
      config: {
        ...config,
        apiKey: config.apiKey ? "********" : ""
      }
    };
  } catch {
    return { exists: false, config: null };
  }
}

export async function saveConfig(config) {
  let apiKey = config.apiKey || "";
  if (apiKey === "********") {
    try {
      apiKey = (await readConfig()).apiKey || "";
    } catch {
      apiKey = "";
    }
  }

  const cleanConfig = {
    provider: "openai-compatible",
    mode: config.mode === "local" ? "local" : "api",
    label: config.label || (config.mode === "local" ? "Local" : "API"),
    baseUrl: normalizeBaseUrl(config.baseUrl || ""),
    model: config.model || "",
    apiKey,
    buildCommand: config.buildCommand || "npm run build",
    updatedAt: new Date().toISOString()
  };

  if (!cleanConfig.baseUrl || !cleanConfig.model) {
    throw new Error("Base URL and model are required.");
  }

  await mkdir(configPath(), { recursive: true });
  await writeJson(path.join(configPath(), CONFIG_FILE), cleanConfig);
  return cleanConfig;
}

async function writeJson(file, value) {
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function runBuild(command) {
  try {
    const { stdout, stderr } = await exec(command, {
      cwd: process.cwd(),
      maxBuffer: 1024 * 1024 * 8,
      timeout: 1000 * 60 * 5
    });
    return { ok: true, output: `${stdout}\n${stderr}`.trim() };
  } catch (error) {
    const outputText = `${error.stdout ?? ""}\n${error.stderr ?? ""}\n${error.message ?? ""}`.trim();
    return { ok: false, output: outputText };
  }
}

async function collectProjectSnapshot(root) {
  const files = [];
  let totalBytes = 0;

  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      const absolute = path.join(dir, entry.name);
      const relative = path.relative(root, absolute);

      if (entry.isDirectory()) {
        if (!IGNORE_DIRS.has(entry.name)) {
          await walk(absolute);
        }
        continue;
      }

      if (!entry.isFile() || !shouldReadFile(relative)) {
        continue;
      }

      const info = await stat(absolute);
      if (info.size > MAX_FILE_BYTES || totalBytes >= MAX_TOTAL_BYTES) {
        files.push({ path: relative, skipped: true, reason: "too large" });
        continue;
      }

      const content = await readFile(absolute, "utf8");
      totalBytes += Buffer.byteLength(content, "utf8");
      files.push({ path: relative, content });
    }
  }

  await walk(root);
  return files;
}

function shouldReadFile(file) {
  if (file === "package-lock.json") {
    return false;
  }
  return TEXT_EXTENSIONS.has(path.extname(file)) || path.basename(file).startsWith(".");
}

function buildMessages({ task, attempt, maxAttempts, buildCommand, buildResult, allowInstall, snapshot }) {
  const fileList = snapshot.map((file) => {
    if (file.skipped) {
      return `### ${file.path}\n[skipped: ${file.reason}]`;
    }
    return `### ${file.path}\n${file.content}`;
  }).join("\n\n");

  return [
    {
      role: "system",
      content: `You are open nothing, a high-autonomy coding agent. Return only strict JSON with no markdown.

Your job is to edit files to complete the user's task, then rely on the CLI to run ${buildCommand}.

Allowed JSON shape:
{
  "summary": "short summary",
  "commands": [{"cmd": "npm install package-name"}],
  "files": [
    {"path": "relative/file.js", "content": "complete file contents"}
  ]
}

Rules:
- Always write complete file contents for each changed file.
- Use relative paths only.
- Do not edit files inside node_modules, .git, dist, build, coverage, or .open-nothing.
- Do not delete files.
- Do not use destructive shell commands.
- Only include npm install commands if package installation is truly needed and allowInstall is true.
- If no edit is needed, return {"summary":"...", "files":[]}.
- The next build result will be sent back if it fails.`
    },
    {
      role: "user",
      content: `Task: ${task}

Attempt: ${attempt}/${maxAttempts}
allowInstall: ${allowInstall}
Build command: ${buildCommand}
Previous build passed: ${buildResult.ok}
Previous build output:
${trimForPrompt(buildResult.output || "(no output)", 12000)}

Project snapshot:
${fileList}`
    }
  ];
}

async function callModel(config, messages) {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: 0.1
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Model request failed (${response.status}): ${body}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Model response did not include message content.");
  }
  return content;
}

function parseModelJson(content) {
  const trimmed = content.trim();
  const withoutFence = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");

  try {
    const parsed = JSON.parse(withoutFence);
    if (!Array.isArray(parsed.files)) {
      throw new Error('Model JSON must include a "files" array.');
    }
    return {
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
      commands: Array.isArray(parsed.commands) ? parsed.commands : [],
      files: parsed.files
    };
  } catch (error) {
    throw new Error(`Could not parse model JSON: ${error.message}\n\n${trimForPrompt(content, 2000)}`);
  }
}

async function applyAction(action, { allowInstall, onLog = () => {} }) {
  for (const command of action.commands) {
    const cmd = typeof command === "string" ? command : command.cmd;
    if (!cmd) {
      continue;
    }
    if (!allowInstall || !/^npm\s+install\s+[\w@./-]+(?:\s+[\w@./-]+)*$/.test(cmd)) {
      throw new Error(`Blocked command: ${cmd}`);
    }
    onLog(`Running: ${cmd}`);
    await exec(cmd, { cwd: process.cwd(), maxBuffer: 1024 * 1024 * 4 });
  }

  for (const file of action.files) {
    validateFileOperation(file);
    const absolute = path.resolve(process.cwd(), file.path);
    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(absolute, file.content, "utf8");
    onLog(`Wrote ${file.path}`);
  }
}

function validateFileOperation(file) {
  if (!file || typeof file.path !== "string" || typeof file.content !== "string") {
    throw new Error("Each file operation must include path and content strings.");
  }

  const normalized = path.normalize(file.path);
  if (path.isAbsolute(file.path) || normalized.startsWith("..") || normalized.includes(`..${path.sep}`)) {
    throw new Error(`Blocked unsafe path: ${file.path}`);
  }

  const firstPart = normalized.split(path.sep)[0];
  if (IGNORE_DIRS.has(firstPart)) {
    throw new Error(`Blocked ignored path: ${file.path}`);
  }
}

function trimForPrompt(value, maxChars) {
  const text = String(value);
  if (text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, maxChars)}\n[truncated ${text.length - maxChars} chars]`;
}
