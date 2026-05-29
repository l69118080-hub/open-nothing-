const configForm = document.querySelector("#config-form");
const runForm = document.querySelector("#run-form");
const configState = document.querySelector("#config-state");
const runState = document.querySelector("#run-state");
const runButton = document.querySelector("#run-button");
const messages = document.querySelector("#log");

const defaults = {
  api: {
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4.1-mini",
    apiKey: ""
  },
  local: {
    baseUrl: "http://localhost:11434/v1",
    model: "llama3.1",
    apiKey: "local"
  }
};

loadConfig();

configForm.mode.addEventListener("change", () => {
  const mode = configForm.mode.value;
  configForm.baseUrl.value = defaults[mode].baseUrl;
  configForm.model.value = defaults[mode].model;
  configForm.apiKey.value = defaults[mode].apiKey;
});

configForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setConfigState("Saving", false);

  const payload = Object.fromEntries(new FormData(configForm));
  const response = await fetch("/api/config", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok) {
    setConfigState(data.error || "Error", true);
    return;
  }

  setConfigState("Saved", false);
});

runForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  runButton.disabled = true;
  setRunState("Running", "running");
  appendLog("Starting agent run...\n");

  const payload = Object.fromEntries(new FormData(runForm));
  payload.allowInstall = runForm.allowInstall.checked;
  payload.maxAttempts = Number(payload.maxAttempts);

  try {
    const response = await fetch("/api/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok || !response.body) {
      const data = await response.json();
      throw new Error(data.error || "Run failed to start.");
    }

    await readEventStream(response.body);
  } catch (error) {
    appendLog(`\nError: ${error.message}\n`);
    setRunState("Error", "error");
  } finally {
    runButton.disabled = false;
  }
});

async function loadConfig() {
  const response = await fetch("/api/config");
  const data = await response.json();

  if (!data.exists) {
    setConfigState("Not set", true);
    return;
  }

  for (const [key, value] of Object.entries(data.config)) {
    if (configForm.elements[key]) {
      configForm.elements[key].value = value;
    }
  }

  setConfigState("Ready", false);
}

async function readEventStream(stream) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.trim()) {
        handleEvent(JSON.parse(line));
      }
    }
  }
}

function handleEvent(event) {
  if (event.type === "log" || event.type === "status") {
    appendLog(event.message);
    return;
  }

  if (event.type === "done") {
    if (event.result.ok) {
      setRunState("Build Passed", "passed");
    } else {
      setRunState("Stopped", "error");
    }
    appendLog(`Run finished after ${event.result.attempts} attempt(s).`);
    return;
  }

  if (event.type === "error") {
    setRunState("Error", "error");
    appendLog(`Error: ${event.message}`, "error");
  }
}

function appendLog(message, tone = "assistant") {
  const article = document.createElement("article");
  article.className = `message ${tone}`;

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = tone === "user" ? "YOU" : "ON";

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = message;

  article.append(avatar, bubble);
  messages.append(article);
  messages.scrollTop = messages.scrollHeight;
}

function setConfigState(text, warning) {
  configState.textContent = text;
  configState.classList.toggle("warning", warning);
}

function setRunState(text, className) {
  runState.textContent = text;
  runState.className = `status ${className}`;
}
