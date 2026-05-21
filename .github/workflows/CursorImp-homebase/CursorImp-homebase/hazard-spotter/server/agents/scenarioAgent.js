import { SCENARIO_GENERATOR_PROMPT } from "../prompts.js";
import { createAnthropicClient, DEFAULT_MODEL } from "../utils/anthropicClient.js";

export async function generateAiScenario() {
  const client = createAnthropicClient();

  const message = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 1024,
    messages: [{ role: "user", content: SCENARIO_GENERATOR_PROMPT }],
  });

  const text = message.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  let raw = text.trim();
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) raw = fence[1].trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  const scenario = JSON.parse(raw.slice(start, end + 1));

  const prompt = encodeURIComponent(scenario.image_prompt);
  const imageUrl = `https://image.pollinations.ai/prompt/${prompt}?width=1200&height=675&nologo=true`;

  return {
    title: scenario.title,
    imageUrl,
    expectedHazards: scenario.expected_hazards || [],
    source: "ai-generated",
  };
}
