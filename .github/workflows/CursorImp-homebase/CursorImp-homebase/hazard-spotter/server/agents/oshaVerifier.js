import { OSHA_VERIFIER_PROMPT } from "../prompts.js";
import { createAnthropicClient, DEFAULT_MODEL } from "../utils/anthropicClient.js";
import { parseHazardsJson } from "../utils/parseJson.js";

export async function runOshaVerifier(hazards) {
  if (!hazards.length) return [];

  const client = createAnthropicClient();

  const message = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 4096,
    system: OSHA_VERIFIER_PROMPT,
    messages: [
      {
        role: "user",
        content: `Verify and correct OSHA references for these hazards:\n\n${JSON.stringify(hazards, null, 2)}`,
      },
    ],
  });

  const text = message.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  try {
    return parseHazardsJson(text);
  } catch {
    return hazards;
  }
}
