#!/usr/bin/env node

import process from "node:process";
import { PAPER_APP_PORT, startPaperApp } from "./app.js";
import { runPaperMcp } from "./mcp.js";
import { PaperStore } from "./store.js";

type Command = "mcp" | "app" | "init" | "help";

interface CliOptions {
  command: Command;
  workspace: string;
  port: number;
  token?: string;
  openBrowser: boolean;
}

async function main(): Promise<void> {
  const options = parseArguments(process.argv.slice(2));

  if (options.command === "help") {
    process.stdout.write(helpText());
    return;
  }

  if (options.command === "mcp") {
    await runPaperMcp(options.workspace);
    return;
  }

  const store = new PaperStore(options.workspace);
  await store.initialize();

  if (options.command === "init") {
    process.stdout.write(`Paper workspace ready at ${store.dataRoot}\n`);
    return;
  }

  const app = await startPaperApp({
    store,
    port: options.port,
    ...(options.token ? { token: options.token } : {}),
    openBrowser: options.openBrowser,
  });
  process.stderr.write(`Paper Workspace | App · ${app.url}\n`);

  const shutdown = async () => {
    await app.close();
    process.exit(0);
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

function parseArguments(arguments_: string[]): CliOptions {
  const first = arguments_[0];
  const command: Command =
    first === "mcp" || first === "app" || first === "init"
      ? first
      : first === "help" || first === "--help" || first === "-h"
        ? "help"
        : "mcp";

  const optionArguments =
    first === command || first === "--help" || first === "-h"
      ? arguments_.slice(1)
      : arguments_;

  let workspace = process.cwd();
  let port = PAPER_APP_PORT;
  let token: string | undefined;
  let openBrowser = true;

  for (let index = 0; index < optionArguments.length; index += 1) {
    const argument = optionArguments[index];
    if (argument === "--workspace") {
      workspace = requireValue(optionArguments, ++index, argument);
    } else if (argument === "--port") {
      port = Number(requireValue(optionArguments, ++index, argument));
      if (!Number.isInteger(port) || port < 1_024 || port > 65_535) {
        throw new Error("--port must be an integer between 1024 and 65535.");
      }
    } else if (argument === "--token") {
      token = requireValue(optionArguments, ++index, argument);
    } else if (argument === "--no-open") {
      openBrowser = false;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  return {
    command,
    workspace,
    port,
    ...(token ? { token } : {}),
    openBrowser,
  };
}

function requireValue(
  arguments_: string[],
  index: number,
  option: string,
): string {
  const value = arguments_[index];
  if (!value) throw new Error(`${option} requires a value.`);
  return value;
}

function helpText(): string {
  return `Paper Workspace

Usage:
  paper-workspace mcp [--workspace <path>]
  paper-workspace app [--workspace <path>] [--port 43127] [--no-open]
  paper-workspace init [--workspace <path>]

Commands:
  mcp   Start the stdio MCP server. This is the default.
  app   Open Paper Workspace | App in the browser.
  init  Create the local .paper workspace.
`;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Paper Workspace: ${message}\n`);
  process.exitCode = 1;
});
