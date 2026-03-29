const API_BASE_URL = import.meta.env.VITE_CROWD_API_BASE_URL || "http://127.0.0.1:8000";

const STORAGE_KEYS = {
  fanProfiles: "smartevent_fan_profiles",
  notifications: "smartevent_notifications",
  parkingLots: "smartevent_parking_lots",
};

const DEFAULT_USER = {
  id: "demo-user",
  name: "Demo Fan",
  email: "demo@smartevent.local",
};

const DEFAULT_PARKING_LOTS = [
  { id: "lot-a", code: "A", name: "Lot A", capacity: 2800, current_occupancy: 1200, nearest_gate: "A", walk_minutes: 5 },
  { id: "lot-b", code: "B", name: "Lot B", capacity: 3200, current_occupancy: 1450, nearest_gate: "B", walk_minutes: 4 },
  { id: "lot-c", code: "C", name: "Lot C", capacity: 2500, current_occupancy: 980, nearest_gate: "C", walk_minutes: 6 },
  { id: "lot-d", code: "D", name: "Lot D", capacity: 3000, current_occupancy: 1600, nearest_gate: "D", walk_minutes: 7 },
  { id: "lot-e", code: "E", name: "Lot E", capacity: 2200, current_occupancy: 870, nearest_gate: "E", walk_minutes: 5 },
  { id: "lot-f", code: "F", name: "Lot F", capacity: 2600, current_occupancy: 1030, nearest_gate: "F", walk_minutes: 6 },
];

const DEFAULT_GATE_META = {
  A: { id: "gate-a", code: "A", name: "Gate A", description: "Student Section Entrance", capacity: 4500, position_x: 72, position_y: 20, nearest_parking: "Lot A" },
  B: { id: "gate-b", code: "B", name: "Gate B", description: "ADA Shuttle Drop & General", capacity: 5500, position_x: 88, position_y: 55, nearest_parking: "Lot B" },
  C: { id: "gate-c", code: "C", name: "Gate C", description: "South General Admission", capacity: 5000, position_x: 72, position_y: 88, nearest_parking: "Lot C" },
  D: { id: "gate-d", code: "D", name: "Gate D", description: "West & Athletics Lots", capacity: 5000, position_x: 28, position_y: 80, nearest_parking: "Lot D" },
  E: { id: "gate-e", code: "E", name: "Gate E", description: "Ticket Windows & Will Call", capacity: 4000, position_x: 12, position_y: 50, nearest_parking: "Lot E" },
  F: { id: "gate-f", code: "F", name: "Gate F", description: "North Upper Deck", capacity: 4800, position_x: 28, position_y: 20, nearest_parking: "Lot F" },
};

const readStore = (key, fallback = []) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const writeStore = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const uuid = () =>
  globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const statusFromBackend = (status) => {
  if (status === "red") return "congested";
  if (status === "amber") return "busy";
  return "open";
};

const ensureParkingLots = () => {
  const lots = readStore(STORAGE_KEYS.parkingLots, []);
  if (lots.length === 0) {
    writeStore(STORAGE_KEYS.parkingLots, DEFAULT_PARKING_LOTS);
    return DEFAULT_PARKING_LOTS;
  }
  return lots;
};

const ensureNotifications = () => {
  const notifications = readStore(STORAGE_KEYS.notifications, []);
  if (notifications.length === 0) {
    const seed = [
      {
        id: uuid(),
        title: "Welcome to SmartVenue PSU",
        message: "Live gate routing is enabled for Beaver Stadium.",
        read: false,
        created_date: new Date().toISOString(),
      },
    ];
    writeStore(STORAGE_KEYS.notifications, seed);
    return seed;
  }
  return notifications;
};

const fetchJSON = async (path, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }
  return response.json();
};

const mapLiveGates = async () => {
  const payload = await fetchJSON("/api/gates/live");
  return Object.values(payload.gates).map((gate) => {
    const meta = DEFAULT_GATE_META[gate.gate] || { id: `gate-${gate.gate.toLowerCase()}`, code: gate.gate, name: `Gate ${gate.gate}` };
    return {
      ...meta,
      current_count: gate.count,
      status: statusFromBackend(gate.status),
      wait_minutes: gate.wait_min,
      density_score: gate.density_score,
      pressure_score: gate.pressure_score,
      recommended_action: gate.recommended_action,
      predicted_density_level: gate.predicted_density_level,
      updated_at: gate.updated_at,
    };
  }).sort((a, b) => a.code.localeCompare(b.code));
};

const fileToObjectURL = async (file) => URL.createObjectURL(file);

const invokeLocalLLM = async ({ prompt, file_urls }) => {
  const promptLower = prompt.toLowerCase();

  if (promptLower.includes("ticket code")) {
    return { ticket_code: "DEMO" };
  }

  if (promptLower.includes("smart gate verification system")) {
    const profiles = readStore(STORAGE_KEYS.fanProfiles, []);
    return {
      face_detected: true,
      matched: profiles.length > 0,
      matched_name: profiles[0]?.name || "",
      confidence: profiles.length > 0 ? "high" : "low",
      reason: profiles.length > 0 ? "Demo match found from enrolled fan profile" : "No enrolled fans available for local demo",
      file_urls,
    };
  }

  if (promptLower.includes("verify a real face")) {
    return {
      face_detected: true,
      verified: true,
      confidence: "high",
      reason: "Local demo verification succeeded",
    };
  }

  return {};
};

const fanProfileAPI = {
  async list() {
    return readStore(STORAGE_KEYS.fanProfiles, []);
  },

  async filter(query = {}) {
    const profiles = readStore(STORAGE_KEYS.fanProfiles, []);
    return profiles.filter((profile) =>
      Object.entries(query).every(([key, value]) => profile[key] === value)
    );
  },

  async create(data) {
    const profiles = readStore(STORAGE_KEYS.fanProfiles, []);
    const created = {
      id: uuid(),
      created_date: new Date().toISOString(),
      ...data,
    };
    profiles.push(created);
    writeStore(STORAGE_KEYS.fanProfiles, profiles);
    return created;
  },

  async update(id, data) {
    const profiles = readStore(STORAGE_KEYS.fanProfiles, []);
    const updated = profiles.map((profile) =>
      profile.id === id ? { ...profile, ...data, updated_date: new Date().toISOString() } : profile
    );
    writeStore(STORAGE_KEYS.fanProfiles, updated);
    return updated.find((profile) => profile.id === id);
  },
};

const notificationAPI = {
  async list(order = "-created_date", limit = 10) {
    const notifications = ensureNotifications();
    const sorted = [...notifications].sort((a, b) => {
      if (order === "-created_date") return new Date(b.created_date) - new Date(a.created_date);
      return new Date(a.created_date) - new Date(b.created_date);
    });
    return sorted.slice(0, limit);
  },

  async create(data) {
    const notifications = ensureNotifications();
    const created = {
      id: uuid(),
      read: false,
      created_date: new Date().toISOString(),
      ...data,
    };
    notifications.unshift(created);
    writeStore(STORAGE_KEYS.notifications, notifications);
    return created;
  },
};

const parkingLotAPI = {
  async list() {
    return ensureParkingLots();
  },

  async create(data) {
    const lots = ensureParkingLots();
    const created = { id: uuid(), ...data };
    lots.push(created);
    writeStore(STORAGE_KEYS.parkingLots, lots);
    return created;
  },
};

const gateAPI = {
  async list() {
    return mapLiveGates();
  },

  async update(id, data) {
    const gateCode = id.replace("gate-", "").toUpperCase();
    const current = DEFAULT_GATE_META[gateCode];
    const fallbackCount = Math.max(0, Number(data.current_count ?? 0));
    await fetchJSON("/api/camera/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gate: gateCode,
        person_count: fallbackCount,
        density_score: Math.min(0.95, fallbackCount / 350),
        pressure_score: Math.min(0.95, fallbackCount / 400),
        flow_speed: fallbackCount > 200 ? 0.12 : 0.55,
        flow_direction: "inbound",
      }),
    });
    return { ...current, ...data, id };
  },

  async create(data) {
    const code = data.code?.toUpperCase?.() || "X";
    DEFAULT_GATE_META[code] = {
      id: data.id || `gate-${code.toLowerCase()}`,
      code,
      name: data.name || `Gate ${code}`,
      description: data.description || "Custom gate",
      capacity: data.capacity || 4000,
      position_x: data.position_x || 50,
      position_y: data.position_y || 50,
      nearest_parking: data.nearest_parking || "Lot A",
    };
    return DEFAULT_GATE_META[code];
  },
};

export const base44 = {
  auth: {
    async me() {
      return DEFAULT_USER;
    },
    logout() {
      sessionStorage.removeItem("smartevent_ticket");
      window.location.reload();
    },
  },
  entities: {
    Gate: gateAPI,
    Notification: notificationAPI,
    FanProfile: fanProfileAPI,
    ParkingLot: parkingLotAPI,
  },
  integrations: {
    Core: {
      async UploadFile({ file }) {
        return { file_url: await fileToObjectURL(file) };
      },
      async InvokeLLM(payload) {
        return invokeLocalLLM(payload);
      },
    },
  },
};
