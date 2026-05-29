# open nothing

`open nothing` is a terminal coding agent. It edits files directly, runs `npm run build`, and keeps trying to fix the code until the build passes or the attempt limit is reached.

## Usage

```sh
npm install
sh scripts/install-open-nothing.sh
open-nothing setup
open-nothing run "describe the code change"
open-nothing dashboard
```

You can also run it without linking:

```sh
node bin/open-nothing.js setup
node bin/open-nothing.js run "describe the code change"
node bin/open-nothing.js dashboard
```

## Dashboard

Start the local dashboard:

```sh
open-nothing dashboard
```

Then open:

```text
http://127.0.0.1:4321
```

The dashboard lets you save model settings, submit an agent task, choose the retry limit, allow or block npm installs, and watch the run log stream while `npm run build` checks the code.

## Install Command

Install the `open-nothing` terminal command without sudo:

```sh
cd /Users/liam_lll/my-ai-app
sh scripts/install-open-nothing.sh
```

Install and run the guided model setup in one command:

```sh
cd /Users/liam_lll/my-ai-app
sh scripts/setup-open-nothing.sh
```

If your terminal cannot find `open-nothing` after install, add `~/.local/bin` to your PATH:

```sh
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

## Setup

`open-nothing setup` asks whether you want an API model or a local OpenAI-compatible endpoint.

Common local default:

```text
Base URL: http://localhost:11434/v1
Model: llama3.1
API key: local
```

Common API default:

```text
Base URL: https://api.openai.com/v1
Model: gpt-4.1-mini
API key: your API key
```

The config is saved at `.open-nothing/config.json`.

## Run Options

```sh
open-nothing run "add a settings page" --max-attempts 8
open-nothing run "add markdown support" --allow-install
```

By default the agent blocks package installation. Pass `--allow-install` if the task really needs new npm packages.

## Safety Boundaries

The agent can write files directly, but it does not delete files. It also blocks edits inside ignored folders such as `node_modules`, `.git`, `dist`, `build`, `coverage`, and `.open-nothing`.
