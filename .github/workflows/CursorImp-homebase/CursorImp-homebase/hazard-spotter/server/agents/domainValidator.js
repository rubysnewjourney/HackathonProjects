import { DOMAIN_VALIDATOR_PROMPT } from "../prompts.js";
import { createAnthropicClient, DEFAULT_MODEL } from "../utils/anthropicClient.js";
import { parseHazardsJson } from "../utils/parseJson.js";

export async function runDomainValidator(verifiedHazards, originalHazards) {
  if (!verifiedHazards.length) return [];

  const client = createAnthropicClient();

  const message = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 4096,
    system: DOMAIN_VALIDATOR_PROMPT,
    messages: [
      {
        role: "user",
        content: `Original vision output:\n${JSON.stringify(originalHazards, null, 2)}\n\nAfter OSHA verification:\n${JSON.stringify(verifiedHazards, null, 2)}\n\nReturn the validated final array only.`,
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
    return verifiedHazards;
  }
}
