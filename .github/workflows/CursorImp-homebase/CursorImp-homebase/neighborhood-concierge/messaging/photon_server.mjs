/**
 * Photon Spectrum — iMessage only (RCS/SMS fallback handled by Photon cloud).
 */
import http from "node:http";
import { Spectrum } from "spectrum-ts";
import { imessage } from "spectrum-ts/providers/imessage";

const BACKEND = process.env.CONCIERGE_BACKEND_URL || "http://127.0.0.1:8080";
const BRIDGE_PORT = Number(process.env.PHOTON_BRIDGE_PORT || "8090");
const projectId = process.env.PHOTON_PROJECT_ID;
const projectSecret =
  process.env.PHOTON_PROJECT_SECRET || process.env.PHOTON_SECRET_KEY;
const linePhone = process.env.PHOTON_IMESSAGE_LINE_PHONE || "";

/** @type {import('spectrum-ts').SpectrumLike | null} */
let spectrumApp = null;

function normalizePhone(to) {
  let phone = String(to).trim();
  if (phone.startsWith("whatsapp:")) phone = phone.slice(9);
  const digits = phone.replace(/\D/g, "");
  if (!phone.startsWith("+") && digits) return `+${digits}`;
  return phone;
}

async function loadProviders() {
  if (!projectId || !projectSecret) {
    throw new Error(
      "PHOTON_PROJECT_ID and PHOTON_PROJECT_SECRET required for iMessage"
    );
  }
  console.log("[photon] Provider: iMessage (RCS/SMS fallback via Photon cloud)");
  return [imessage.config()];
}

/** Send outbound via iMessage lane; Photon falls back to RCS/SMS when needed. */
async function sendViaImessage(to, body) {
  const im = imessage(spectrumApp);
  const phone = normalizePhone(to);
  const user = await im.user(phone);
  const spaceOpts = linePhone ? { phone: linePhone } : {};
  const space = await im.space(user, spaceOpts);
  await space.send(body);
  return { channel: "imessage", to: phone };
}

async function startSpectrum() {
  const providers = await loadProviders();
  spectrumApp = await Spectrum({
    projectId,
    projectSecret,
    providers,
  });
  console.log("[photon] Spectrum started (iMessage + cloud RCS/SMS fallback)");

  (async () => {
    for await (const [space, message] of spectrumApp.messages) {
      if (message.content?.type !== "text") continue;

      const phone = message.sender?.id || space.id;
      const body = message.content.text || "";
      const channel =
        message.platform === "iMessage" ? "imessage" : message.platform;
      console.log(
        `[photon] inbound ${channel} ${phone}: ${body.slice(0, 80)}`
      );

      try {
        const res = await fetch(`${BACKEND}/internal/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, body, platform: channel }),
        });
        if (!res.ok) {
          await space.send("Sorry, I had trouble reaching the concierge backend.");
          continue;
        }
        const data = await res.json();
        await space.send(data.reply || "No response.");
      } catch (err) {
        console.error("[photon] backend error:", err);
        await space.send("Sorry, something went wrong. Try again shortly.");
      }
    }
  })();
}

function startHttpBridge() {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || "/", `http://127.0.0.1:${BRIDGE_PORT}`);

    if (req.method === "GET" && url.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ok: true,
          spectrum: Boolean(spectrumApp),
          projectConfigured: Boolean(projectId && projectSecret),
          providers: ["imessage"],
          delivery: "iMessage with Photon-managed RCS/SMS fallback",
        })
      );
      return;
    }

    if (req.method === "POST" && url.pathname === "/send") {
      let raw = "";
      req.on("data", (c) => (raw += c));
      req.on("end", async () => {
        try {
          const { to, body } = JSON.parse(raw || "{}");
          if (!to || !body) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: "to and body required" }));
            return;
          }
          if (!spectrumApp) {
            res.writeHead(503);
            res.end(JSON.stringify({ error: "Spectrum not ready" }));
            return;
          }
          const sent = await sendViaImessage(to, body);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              ok: true,
              messageId: `photon-${Date.now()}`,
              ...sent,
            })
          );
        } catch (err) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }

    res.writeHead(404);
    res.end();
  });

  server.listen(BRIDGE_PORT, () => {
    console.log(`[photon] HTTP bridge http://127.0.0.1:${BRIDGE_PORT}`);
  });
}

await startSpectrum();
startHttpBridge();
