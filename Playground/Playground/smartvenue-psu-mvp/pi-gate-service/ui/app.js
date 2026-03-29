const elements = {
  gateName: document.getElementById("gateName"),
  statusChip: document.getElementById("statusChip"),
  displayText: document.getElementById("displayText"),
  messageText: document.getElementById("messageText"),
  deviceId: document.getElementById("deviceId"),
  lastScan: document.getElementById("lastScan"),
  lastToken: document.getElementById("lastToken"),
  scanCount: document.getElementById("scanCount"),
  heroPanel: document.getElementById("heroPanel"),
  signalWord: document.getElementById("signalWord"),
  miniIndicator: document.getElementById("miniIndicator"),
};

const statusThemes = {
  READY: {
    className: "state-ready",
    accent: "rgba(255,255,255,0.14)",
    glow: "0 20px 60px rgba(0, 0, 0, 0.28)",
    indicator: "#8fdcff",
  },
  VERIFIED: {
    className: "state-verified",
    accent: "rgba(37,195,122,0.22)",
    glow: "0 20px 60px rgba(37,195,122,0.18)",
    indicator: "#25c37a",
  },
  INVALID: {
    className: "state-invalid",
    accent: "rgba(255,107,107,0.22)",
    glow: "0 20px 60px rgba(255,107,107,0.18)",
    indicator: "#ff6b6b",
  },
  RETRY: {
    className: "state-retry",
    accent: "rgba(255,190,59,0.22)",
    glow: "0 20px 60px rgba(255,190,59,0.18)",
    indicator: "#ffbe3b",
  },
  ALREADY_USED: {
    className: "state-already_used",
    accent: "rgba(255,107,107,0.22)",
    glow: "0 20px 60px rgba(255,107,107,0.18)",
    indicator: "#ff6b6b",
  },
  EXPIRED: {
    className: "state-expired",
    accent: "rgba(255,190,59,0.22)",
    glow: "0 20px 60px rgba(255,190,59,0.18)",
    indicator: "#ffbe3b",
  },
  OFFLINE_MODE_ERROR: {
    className: "state-offline_mode_error",
    accent: "rgba(255,107,107,0.22)",
    glow: "0 20px 60px rgba(255,107,107,0.18)",
    indicator: "#ff6b6b",
  },
};

async function loadState() {
  try {
    const response = await fetch("/api/state");
    const state = await response.json();
    render(state);
  } catch (error) {
    render({
      gate_id: "Gate",
      device_id: "pi-gate",
      status: "OFFLINE_MODE_ERROR",
      display_text: "Offline Mode Error",
      message: "Dashboard cannot reach live gate state.",
      last_token: null,
      last_scanned_at: null,
      scan_count: 0,
    });
  }
}

function render(state) {
  const theme = statusThemes[state.status] || statusThemes.READY;
  document.body.className = theme.className;
  elements.gateName.textContent = state.gate_id || "Gate";
  elements.statusChip.textContent = prettifyStatus(state.status || "READY");
  elements.displayText.textContent = state.display_text || "Ready to Tap";
  elements.messageText.textContent = state.message || "Hold phone or NFC token near the reader.";
  elements.deviceId.textContent = state.device_id || "pi-gate-a-01";
  elements.lastScan.textContent = formatTime(state.last_scanned_at);
  elements.lastToken.textContent = state.last_token || "None";
  elements.scanCount.textContent = String(state.scan_count ?? 0);
  elements.signalWord.textContent = prettifyStatus(state.status || "READY");
  elements.heroPanel.style.background = `linear-gradient(145deg, ${theme.accent}, rgba(255,255,255,0.04))`;
  elements.heroPanel.style.boxShadow = theme.glow;
  elements.miniIndicator.style.background = theme.indicator;
  elements.miniIndicator.style.boxShadow = `0 0 0 8px ${hexToAlpha(theme.indicator, 0.14)}`;
}

function prettifyStatus(status) {
  return String(status || "READY").replaceAll("_", " ");
}

function formatTime(value) {
  if (!value) {
    return "Waiting";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" });
}

function hexToAlpha(hex, alpha) {
  const clean = hex.replace("#", "");
  const chunk = clean.length === 3
    ? clean.split("").map((part) => part + part)
    : [clean.slice(0, 2), clean.slice(2, 4), clean.slice(4, 6)];
  const [r, g, b] = chunk.map((part) => parseInt(part, 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

loadState();
setInterval(loadState, 1200);
