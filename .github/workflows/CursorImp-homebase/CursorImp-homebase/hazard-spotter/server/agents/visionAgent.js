import { VISION_INSPECTOR_PROMPT } from "../prompts.js";
import { createAnthropicClient, DEFAULT_MODEL } from "../utils/anthropicClient.js";
import { parseHazardsJson } from "../utils/parseJson.js";

export async function runVisionInspector({ base64, mediaType }) {
  const client = createAnthropicClient();

  const message = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: base64,
            },
          },
          { type: "text", text: VISION_INSPECTOR_PROMPT },
        ],
      },
    ],
  });

  const text = message.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  return parseHazardsJson(text);
}
