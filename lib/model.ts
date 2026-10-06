import "server-only";

import type { ModelMode } from "./ask-types";

/**
 * The only module that talks to a model. To switch APIs, change `callCreateAI`
 * (or add a new function) and keep `askModel`'s signature the same.
 *
 * CreateAI: POST {"query": "..."} with a Bearer token; the answer is in the
 * "response" field. The model itself is configured in the CreateAI project.
 *
 * The token is read from the server environment (.env) and never leaves the
 * server: this file is server-only, and nothing here logs or returns it.
 */

const DEFAULT_URL = "https://api-main.aiml.asu.edu/query";
const DEFAULT_TIMEOUT_MS = 30_000;

export interface ModelAnswer {
  text: string;
  mode: ModelMode;
}

/** An error whose `message` is safe and friendly enough to show in the UI. */
export class ModelError extends Error {
  constructor(
    message: string,
    readonly status = 502,
  ) {
    super(message);
    this.name = "ModelError";
  }
}

const token = () => process.env.CREATEAI_TOKEN?.trim() || "";

/** "mock" when no CREATEAI_TOKEN is set. */
export function modelMode(): ModelMode {
  return token() ? "live" : "mock";
}

export interface AskOptions {
  /** Defaults to 30s (the Ask panel). Long generations, like writing a skill, pass more. */
  timeoutMs?: number;
}

export async function askModel(
  query: string,
  info: { skillName: string; skillFile: string },
  { timeoutMs = DEFAULT_TIMEOUT_MS }: AskOptions = {},
): Promise<ModelAnswer> {
  if (modelMode() === "mock") return mockAnswer(query, info);
  return { text: await callCreateAI(query, timeoutMs), mode: "live" };
}

async function callCreateAI(query: string, timeoutMs: number): Promise<string> {
  const url = process.env.CREATEAI_URL?.trim() || DEFAULT_URL;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    if (name === "TimeoutError" || name === "AbortError") {
      const secs = Math.round(timeoutMs / 1000);
      throw new ModelError(`The model didn't answer within ${secs} seconds. Try again, or ask a shorter question.`, 504);
    }
    const cause = err instanceof Error && err.cause instanceof Error ? ` (${(err.cause as { code?: string }).code ?? err.cause.message})` : "";
    console.error(`\n[model] network error: ${err instanceof Error ? err.message : err}${cause}`);
    throw new ModelError("Couldn't reach the CreateAI API. Check your internet connection (and VPN, if you need one).");
  }

  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).slice(0, 300);
    console.error(`[model] CreateAI returned HTTP ${res.status}: ${detail}`);
    throw new ModelError(httpMessage(res.status));
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new ModelError("CreateAI sent back something that isn't JSON. Try again in a moment.");
  }

  const text = (data as { response?: unknown } | null)?.response;
  if (typeof text !== "string" || !text.trim()) {
    console.error("[model] unexpected response shape:", JSON.stringify(data).slice(0, 300));
    throw new ModelError('CreateAI replied, but the "response" field was missing or empty.');
  }
  return text;
}

function httpMessage(status: number) {
  if (status === 401 || status === 403) {
    return "CreateAI rejected the token. Check CREATEAI_TOKEN in .env, then restart the dev server.";
  }
  if (status === 404) return "The CreateAI endpoint wasn't found (404). Check CREATEAI_URL if you set one.";
  if (status === 408 || status === 504) return "CreateAI timed out on its side. Try again in a moment.";
  if (status === 413) return "The question plus skill is too large for CreateAI. Try a shorter question or skill.";
  if (status === 429) return "CreateAI is rate-limiting requests. Wait a few seconds and try again.";
  if (status >= 500) return `CreateAI is having trouble right now (HTTP ${status}). Try again in a moment.`;
  return `CreateAI couldn't handle the request (HTTP ${status}).`;
}

async function mockAnswer(query: string, info: { skillName: string; skillFile: string }): Promise<ModelAnswer> {
  await new Promise((r) => setTimeout(r, 600)); // feel like a real request
  const fence = "`".repeat(Math.max(3, longestBacktickRun(query) + 1));
  const text = [
    "**Mock mode:** `CREATEAI_TOKEN` isn't set, so nothing was sent to a model.",
    "",
    `- **Skill used:** \`${info.skillName}\` (\`${info.skillFile}\`)`,
    `- **Query length:** ${query.length.toLocaleString("en-US")} characters`,
    "",
    "This is the full query that would be sent to CreateAI:",
    "",
    `${fence}text`,
    query,
    fence,
  ].join("\n");
  return { text, mode: "mock" };
}

function longestBacktickRun(s: string) {
  return Math.max(0, ...(s.match(/`+/g) ?? []).map((m) => m.length));
}
