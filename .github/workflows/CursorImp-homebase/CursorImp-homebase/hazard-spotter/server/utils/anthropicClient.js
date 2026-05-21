import Anthropic from "@anthropic-ai/sdk";

export function createAnthropicClient() {
  const options = { apiKey: process.env.ANTHROPIC_API_KEY };
  if (process.env.ANTHROPIC_BASE_URL) {
    options.baseURL = process.env.ANTHROPIC_BASE_URL.replace(/\/$/, "");
  }
  return new Anthropic(options);
}

export const DEFAULT_MODEL =
  process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";
