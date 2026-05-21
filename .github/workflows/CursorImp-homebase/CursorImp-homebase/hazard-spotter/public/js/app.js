const API = "";

const state = {
  selection: null,
  agents: [],
  report: null,
};

const $ = (sel) => document.querySelector(sel);

const screens = {
  landing: $("#screen-landing"),
  analysis: $("#screen-analysis"),
  results: $("#screen-results"),
};

const SCAN_LINES = [
  "Reading site conditions...",
  "Checking fall protection...",
  "Reviewing PPE compliance...",
  "Identifying equipment hazards...",
  "Generating safety brief...",
];

const SEVERITY_LABEL = {
  high: "HIGH RISK",
  medium: "MEDIUM RISK",
  low: "LOW RISK",
};

function showScreen(name) {
  Object.entries(screens).forEach(([k, el]) => {
    el.classList.toggle("hidden", k !== name);
  });
}

function showError(el, message) {
  if (!message) {
    el.classList.add("hidden");
    el.textContent = "";
    return;
  }
  el.textContent = message;
  el.classList.remove("hidden");
}

async function init() {
  try {
    const res = await fetch(`${API}/api/agents`);
    const data = await res.json();
    state.agents = data.agents || [];
    renderAgentPills();
  } catch {
    state.agents = [
      { name: "Vision Inspector", icon: "👁️" },
      { name: "OSHA Reference Verifier", icon: "📋" },
      { name: "Construction Domain Validator", icon: "🦺" },
    ];
  }

  await loadStockGrid();
  bindEvents();
}

async function loadStockGrid() {
  const grid = $("#stock-grid");
  grid.innerHTML = "";
  const res = await fetch(`${API}/api/stock-images`);
  const { images } = await res.json();

  images.forEach((img) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "stock-thumb";
    btn.dataset.id = img.id;
    btn.innerHTML = `<img src="${img.url}" alt="${img.label}" loading="lazy" /><span>${img.label}</span>`;
    btn.addEventListener("click", () => selectSite(img));
    grid.appendChild(btn);
  });
}

function renderAgentPills() {
  const el = $("#agent-pills");
  el.innerHTML = state.agents
    .map((a) => `<span class="agent-pill">${a.icon} ${a.name}</span>`)
    .join("");
}

function selectSite(site) {
  state.selection = {
    id: site.id,
    label: site.label || site.title,
    url: site.url || site.imageUrl,
    source: site.source || "stock",
  };

  document.querySelectorAll(".stock-thumb").forEach((t) => {
    t.classList.toggle("selected", t.dataset.id === site.id);
  });

  $("#preview-panel").classList.remove("hidden");
  $("#preview-img").src = state.selection.url;
  $("#preview-title").textContent = state.selection.label;
  $("#preview-source").textContent =
    state.selection.source === "ai-generated"
      ? "Source: AI-generated scenario image"
      : "Source: Verified construction stock library";
  $("#btn-analyze").disabled = false;
  showError($("#landing-error"), null);
}

function bindEvents() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const src = tab.dataset.source;
      $("#panel-stock").classList.toggle("hidden", src !== "stock");
      $("#panel-random").classList.toggle("hidden", src !== "random");
      $("#panel-ai").classList.toggle("hidden", src !== "ai");
    });
  });

  $("#btn-pick-random").addEventListener("click", async () => {
    const btn = $("#btn-pick-random");
    btn.disabled = true;
    btn.textContent = "Picking...";
    try {
      const res = await fetch(`${API}/api/random-site`);
      const { site } = await res.json();
      selectSite(site);
    } catch (e) {
      showError($("#landing-error"), e.message);
    } finally {
      btn.disabled = false;
      btn.textContent = "Pick Random Site";
    }
  });

  $("#btn-generate-ai").addEventListener("click", async () => {
    const btn = $("#btn-generate-ai");
    btn.disabled = true;
    btn.innerHTML = '<span class="loading-inline"><span class="spinner"></span> Generating scenario...</span>';
    try {
      const res = await fetch(`${API}/api/generate-scenario`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      selectSite({
        id: `ai-${Date.now()}`,
        title: data.title,
        imageUrl: data.imageUrl,
        source: "ai-generated",
      });
    } catch (e) {
      showError($("#landing-error"), e.message);
    } finally {
      btn.disabled = false;
      btn.textContent = "Generate AI Hazard Scenario";
    }
  });

  $("#btn-analyze").addEventListener("click", runAnalysis);
  $("#btn-new-scan").addEventListener("click", () => {
    showScreen("landing");
  });
  $("#btn-download").addEventListener("click", downloadPdf);
}

async function runAnalysis() {
  if (!state.selection) return;

  showScreen("analysis");
  $("#scan-img").src = state.selection.url;
  $("#progress-fill").style.width = "8%";
  animateStatusLines();
  renderAgentGrid();

  const useFallback = $("#demo-fallback").checked;

  try {
    const result = await streamAnalyze({
      imageUrl: state.selection.url,
      stockId: state.selection.id?.startsWith("ai-") ? null : state.selection.id,
      useFallback,
    });
    state.report = result;
    renderResults(result);
    showScreen("results");
  } catch (e) {
    showScreen("landing");
    showError(
      $("#landing-error"),
      e.message.includes("timeout") || e.message.includes("longer")
        ? "Analysis taking longer than expected — try a clearer photo or enable Demo mode."
        : e.message.includes("parse") || e.message.includes("read")
          ? "Could not read results — please try again."
          : e.message
    );
  }
}

function streamAnalyze(body) {
  return new Promise((resolve, reject) => {
    fetch(`${API}/api/analyze/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Request failed (${res.status})`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() || "";

          for (const part of parts) {
            const lines = part.split("\n");
            let event = "message";
            let data = "";
            for (const line of lines) {
              if (line.startsWith("event: ")) event = line.slice(7);
              if (line.startsWith("data: ")) data = line.slice(6);
            }
            if (!data) continue;
            const payload = JSON.parse(data);
            if (event === "progress") onAgentProgress(payload);
            if (event === "complete") resolve(payload);
            if (event === "error") reject(new Error(payload.message));
          }
        }
      })
      .catch(reject);
  });
}

function onAgentProgress({ id, status, message }) {
  const idx = ["vision", "osha", "domain", "synthesis"].indexOf(id);
  if (idx >= 0) {
    $("#progress-fill").style.width = `${20 + idx * 20}%`;
    const lines = $("#status-lines").querySelectorAll("li");
    lines.forEach((li, i) => {
      li.classList.remove("active", "done");
      if (i < idx) li.classList.add("done");
      if (i === idx && status === "RUNNING") li.classList.add("active");
      if (i === idx && status === "COMPLETED") li.classList.add("done");
    });
  }

  const row = document.querySelector(`[data-agent="${id}"]`);
  if (row) {
    row.classList.toggle("running", status === "RUNNING");
    row.classList.toggle("completed", status === "COMPLETED");
    row.querySelector(".agent-msg").textContent = message;
  }
}

function renderAgentGrid() {
  const grid = $("#agent-status-grid");
  const defs = state.agents.length
    ? state.agents
    : [
        { id: "vision", name: "Vision Inspector", icon: "👁️" },
        { id: "osha", name: "OSHA Verifier", icon: "📋" },
        { id: "domain", name: "Domain Validator", icon: "🦺" },
        { id: "synthesis", name: "Synthesis", icon: "📊" },
      ];

  grid.innerHTML = defs
    .map(
      (a) => `
    <div class="agent-row" data-agent="${a.id}">
      <span>${a.icon}</span>
      <span><strong>${a.name}</strong></span>
      <span class="agent-msg" style="margin-left:auto;color:var(--muted)">Waiting...</span>
    </div>`
    )
    .join("");
}

function animateStatusLines() {
  const lines = $("#status-lines").querySelectorAll("li");
  lines.forEach((li, i) => {
    li.classList.remove("active", "done");
    if (i === 0) li.classList.add("active");
  });

  let i = 0;
  const timer = setInterval(() => {
    if (i < lines.length - 1) {
      lines[i].classList.remove("active");
      lines[i].classList.add("done");
      i++;
      lines[i].classList.add("active");
    }
  }, 900);

  state._scanTimer = timer;
}

function renderResults(data) {
  clearInterval(state._scanTimer);
  $("#progress-fill").style.width = "100%";

  const { hazards, summary, analyzed_at, imageUrl } = data;
  $("#results-img").src = imageUrl || state.selection.url;
  $("#result-timestamp").textContent = new Date(analyzed_at).toLocaleString();

  const list = $("#hazard-list");
  list.innerHTML = "";

  if (!hazards?.length) {
    list.innerHTML = `
      <div class="no-hazards">
        <h3>No visible hazards detected in this image.</h3>
        <p>This analysis covers visible conditions only. Always conduct a physical walkthrough before work begins.</p>
      </div>`;
    $("#summary-bar").textContent = "No hazards detected";
    $("#summary-counts").innerHTML = "";
    return;
  }

  $("#summary-bar").textContent = `${summary.total} hazard${summary.total !== 1 ? "s" : ""} detected`;
  $("#summary-counts").innerHTML = `
    <span class="high">${summary.high} High</span>
    <span class="medium">${summary.medium} Medium</span>
    <span class="low">${summary.low} Low</span>`;

  hazards.forEach((h) => {
    const sev = (h.severity || "low").toLowerCase();
    const card = document.createElement("article");
    card.className = `hazard-card severity-${sev}`;
    card.innerHTML = `
      <div class="hazard-card-header">
        <span class="severity-badge">${SEVERITY_LABEL[sev] || sev.toUpperCase()}</span>
        <span class="category-badge">${escapeHtml(h.category)}</span>
      </div>
      <h3>${escapeHtml(h.hazard_title)}</h3>
      <p>${escapeHtml(h.description)}</p>
      <div class="hazard-action">✅ ACTION: ${escapeHtml(h.action)}</div>
      <div class="hazard-osha">📋 ${escapeHtml(h.osha_reference)}</div>`;
    list.appendChild(card);
  });
}

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s ?? "";
  return d.innerHTML;
}

async function downloadPdf() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const margin = 48;
  let y = margin;

  doc.setFontSize(18);
  doc.text("Site Hazard Spotter — Safety Brief", margin, y);
  y += 24;
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text($("#result-timestamp").textContent, margin, y);
  y += 20;
  doc.setTextColor(0);

  const summary = $("#summary-bar").textContent;
  doc.setFontSize(12);
  doc.text(summary, margin, y);
  y += 28;

  const hazards = state.report?.hazards || [];
  if (!hazards.length) {
    doc.text("No visible hazards detected in this image.", margin, y);
  } else {
    hazards.forEach((h, i) => {
      if (y > 700) {
        doc.addPage();
        y = margin;
      }
      doc.setFontSize(11);
      doc.setFont(undefined, "bold");
      doc.text(`${i + 1}. [${(h.severity || "").toUpperCase()}] ${h.hazard_title}`, margin, y);
      y += 14;
      doc.setFont(undefined, "normal");
      doc.setFontSize(9);
      const desc = doc.splitTextToSize(h.description, 520);
      doc.text(desc, margin, y);
      y += desc.length * 11 + 4;
      doc.text(`Action: ${h.action}`, margin, y);
      y += 12;
      doc.setTextColor(180, 100, 0);
      doc.text(h.osha_reference, margin, y);
      doc.setTextColor(0);
      y += 22;
    });
  }

  y = 720;
  doc.setFontSize(8);
  doc.setTextColor(120);
  const disclaimer =
    "AI-assisted visual analysis only — not a formal OSHA inspection. Verify with a qualified safety professional.";
  doc.text(doc.splitTextToSize(disclaimer, 520), margin, y);
  doc.text("Generated by Site Hazard Spotter", margin, y + 24);

  doc.save(`hazard-spotter-report-${Date.now()}.pdf`);
}

init();
