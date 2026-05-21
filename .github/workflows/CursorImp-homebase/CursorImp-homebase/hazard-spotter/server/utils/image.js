/** Fetch remote image and return base64 + media type for Claude vision */
export async function urlToBase64(imageUrl) {
  const res = await fetch(imageUrl, {
    headers: { "User-Agent": "SiteHazardSpotter/1.0" },
  });
  if (!res.ok) {
    throw new Error(`Could not load image (${res.status})`);
  }
  const contentType = res.headers.get("content-type") || "image/jpeg";
  const buffer = Buffer.from(await res.arrayBuffer());
  return {
    base64: buffer.toString("base64"),
    mediaType: contentType.split(";")[0],
  };
}
