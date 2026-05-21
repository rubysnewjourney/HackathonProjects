/** Extract JSON array from model text (handles fenced code blocks) */
export function parseHazardsJson(text) {
  if (!text?.trim()) return [];
  let raw = text.trim();
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) raw = fence[1].trim();
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start === -1 || end === -1) {
    throw new Error("No JSON array in response");
  }
  const parsed = JSON.parse(raw.slice(start, end + 1));
  if (!Array.isArray(parsed)) throw new Error("Expected JSON array");
  return parsed;
}

const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 };

export function sortBySeverity(hazards) {
  return [...hazards].sort(
    (a, b) =>
      (SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3)
  );
}

export function countBySeverity(hazards) {
  return hazards.reduce(
    (acc, h) => {
      const s = h.severity || "low";
      if (acc[s] !== undefined) acc[s]++;
      return acc;
    },
    { high: 0, medium: 0, low: 0 }
  );
}
