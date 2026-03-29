const runtimeHost = typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1';
const runtimeProtocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';
const apiOverride = typeof window !== 'undefined' ? window.localStorage.getItem('smartevent_api_base_url') : null;
const queryOverride = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('apiBaseUrl') : null;

export const API_BASE_URL =
  queryOverride ||
  apiOverride ||
  import.meta.env.VITE_CROWD_API_BASE_URL ||
  `${runtimeProtocol}//${runtimeHost}:8000`;

const STORAGE_KEYS = {
  fanProfiles: 'smartevent_fan_profiles',
  notifications: 'smartevent_notifications',
  parkingLots: 'smartevent_parking_lots',
  liveGates: 'smartevent_live_gates',
};

const DEFAULT_USER = {
  id: 'demo-user',
  name: 'Demo Fan',
  email: 'demo@smartevent.local',
};

const DEFAULT_PARKING_LOTS = [
  { id: 'lot-a', code: 'A', name: 'Lot A', capacity: 2800, current_occupancy: 1200, nearest_gate: 'A', walk_minutes: 5 },
  { id: 'lot-b', code: 'B', name: 'Lot B', capacity: 3200, current_occupancy: 1450, nearest_gate: 'B', walk_minutes: 4 },
  { id: 'lot-c', code: 'C', name: 'Lot C', capacity: 2500, current_occupancy: 980, nearest_gate: 'C', walk_minutes: 6 },
  { id: 'lot-d', code: 'D', name: 'Lot D', capacity: 3000, current_occupancy: 1600, nearest_gate: 'D', walk_minutes: 7 },
  { id: 'lot-e', code: 'E', name: 'Lot E', capacity: 2200, current_occupancy: 870, nearest_gate: 'E', walk_minutes: 5 },
  { id: 'lot-f', code: 'F', name: 'Lot F', capacity: 2600, current_occupancy: 1030, nearest_gate: 'F', walk_minutes: 6 },
];

const DEFAULT_GATE_META = {
  A: { id: 'gate-a', code: 'A', name: 'Gate A', description: 'Student Section Entrance', capacity: 4500, position_x: 72, position_y: 20, nearest_parking: 'Lot A' },
  B: { id: 'gate-b', code: 'B', name: 'Gate B', description: 'ADA Shuttle Drop & General', capacity: 5500, position_x: 88, position_y: 55, nearest_parking: 'Lot B' },
  C: { id: 'gate-c', code: 'C', name: 'Gate C', description: 'South General Admission', capacity: 5000, position_x: 72, position_y: 88, nearest_parking: 'Lot C' },
  D: { id: 'gate-d', code: 'D', name: 'Gate D', description: 'West & Athletics Lots', capacity: 5000, position_x: 28, position_y: 80, nearest_parking: 'Lot D' },
  E: { id: 'gate-e', code: 'E', name: 'Gate E', description: 'Ticket Windows & Will Call', capacity: 4000, position_x: 12, position_y: 50, nearest_parking: 'Lot E' },
  F: { id: 'gate-f', code: 'F', name: 'Gate F', description: 'North Upper Deck', capacity: 4800, position_x: 28, position_y: 20, nearest_parking: 'Lot F' },
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

const uuid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const statusFromBackend = (status) => {
  if (status === 'red') return 'congested';
  if (status === 'amber') return 'busy';
  return 'open';
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
        title: 'Welcome to SmartVenue PSU',
        message: 'Live routing is active. Pull to refresh if your network changes.',
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

const fetchOptionalJSON = async (path, options = {}) => {
  try {
    return await fetchJSON(path, options);
  } catch {
    return null;
  }
};

const mapLiveGates = async () => {
  const payload = await fetchJSON('/api/gates/live');
  const mapped = Object.values(payload.gates)
    .map((gate) => {
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
    })
    .sort((a, b) => a.code.localeCompare(b.code));
  writeStore(STORAGE_KEYS.liveGates, mapped);
  return mapped;
};

const cachedLiveGates = () => readStore(STORAGE_KEYS.liveGates, []);

const fileToObjectURL = async (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxDimension = 720;
        const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.78));
      };
      img.onerror = () => resolve(reader.result);
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const invokeLocalLLM = async ({ prompt, file_urls }) => {
  const promptLower = prompt.toLowerCase();

  if (promptLower.includes('ticket code')) {
    return { ticket_code: 'DEMO' };
  }

  if (promptLower.includes('smart gate verification system')) {
    const payload = await fanProfileAPI.list();
    const profiles = payload.filter((profile) => profile.verification_status === 'verified');
    const matchedProfile = profiles[0] || null;
    return {
      face_detected: true,
      matched: Boolean(matchedProfile),
      matched_name: matchedProfile?.name || '',
      confidence: matchedProfile ? 'high' : 'low',
      reason: matchedProfile ? 'Matched a verified Face Pass profile from the SmartVenue database.' : 'No verified Face Pass profiles are available yet.',
      matched_profile: matchedProfile ? {
        name: matchedProfile.name,
        gate: matchedProfile.assigned_gate,
        section: matchedProfile.ticket_section,
        row: matchedProfile.row,
        seat: matchedProfile.seat,
        ticket_code: matchedProfile.ticket_code,
      } : null,
      file_urls,
    };
  }

  return {
    face_detected: true,
    verified: true,
    confidence: 'high',
    reason: 'Local demo verification succeeded',
  };
};

const gateAPI = {
  async list() {
    return mapLiveGates();
  },
  cached() {
    return cachedLiveGates();
  },

  async update(id, data) {
    const gateCode = (data.code || id.replace('gate-', '')).toUpperCase();
    const fallbackCount = Math.max(0, Number(data.current_count ?? 0));
    await fetchJSON('/api/camera/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gate: gateCode,
        person_count: fallbackCount,
        density_score: Math.min(0.95, fallbackCount / 350),
        pressure_score: Math.min(0.95, fallbackCount / 400),
        flow_speed: fallbackCount > 200 ? 0.12 : 0.55,
        flow_direction: 'inbound',
      }),
    });
    return { ...(DEFAULT_GATE_META[gateCode] || {}), ...data, id };
  },

  async create(data) {
    const code = data.code?.toUpperCase?.() || 'X';
    DEFAULT_GATE_META[code] = {
      id: data.id || `gate-${code.toLowerCase()}`,
      code,
      name: data.name || `Gate ${code}`,
      description: data.description || 'Custom gate',
      capacity: data.capacity || 4000,
      position_x: data.position_x || 50,
      position_y: data.position_y || 50,
      nearest_parking: data.nearest_parking || 'Lot A',
    };
    return DEFAULT_GATE_META[code];
  },
};

const fanProfileAPI = {
  async list() {
    const payload = await fetchOptionalJSON('/api/face-pass/profiles');
    if (payload?.profiles) {
      writeStore(STORAGE_KEYS.fanProfiles, payload.profiles);
      return payload.profiles;
    }
    return readStore(STORAGE_KEYS.fanProfiles, []);
  },
  async filter(query = {}) {
    let profiles = readStore(STORAGE_KEYS.fanProfiles, []);
    if (query.email) {
      const payload = await fetchOptionalJSON(`/api/face-pass/profiles?email=${encodeURIComponent(query.email)}`);
      if (payload?.profiles) {
        profiles = payload.profiles;
        writeStore(STORAGE_KEYS.fanProfiles, profiles);
      }
    }
    return profiles.filter((profile) => Object.entries(query).every(([key, value]) => profile[key] === value));
  },
  async create(data) {
    const payload = await fetchOptionalJSON('/api/face-pass/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (payload?.profile) {
      const profiles = readStore(STORAGE_KEYS.fanProfiles, []);
      const nextProfiles = [...profiles.filter((profile) => profile.id !== payload.profile.id), payload.profile];
      writeStore(STORAGE_KEYS.fanProfiles, nextProfiles);
      return payload.profile;
    }
    const profiles = readStore(STORAGE_KEYS.fanProfiles, []);
    const created = { id: uuid(), created_date: new Date().toISOString(), ...data };
    profiles.push(created);
    writeStore(STORAGE_KEYS.fanProfiles, profiles);
    return created;
  },
  async update(id, data) {
    const payload = await fetchOptionalJSON(`/api/face-pass/profiles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (payload?.profile) {
      const profiles = readStore(STORAGE_KEYS.fanProfiles, []);
      const updatedProfiles = profiles.map((profile) => profile.id === id ? payload.profile : profile);
      writeStore(STORAGE_KEYS.fanProfiles, updatedProfiles);
      return payload.profile;
    }
    const profiles = readStore(STORAGE_KEYS.fanProfiles, []);
    const updated = profiles.map((profile) => profile.id === id ? { ...profile, ...data, updated_date: new Date().toISOString() } : profile);
    writeStore(STORAGE_KEYS.fanProfiles, updated);
    return updated.find((profile) => profile.id === id);
  },
  async verify(payload) {
    return fetchOptionalJSON('/api/face-pass/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },
};

const notificationAPI = {
  async list(order = '-created_date', limit = 10) {
    const notifications = ensureNotifications();
    const sorted = [...notifications].sort((a, b) => {
      if (order === '-created_date') return new Date(b.created_date) - new Date(a.created_date);
      return new Date(a.created_date) - new Date(b.created_date);
    });
    return sorted.slice(0, limit);
  },
  async create(data) {
    const notifications = ensureNotifications();
    const created = { id: uuid(), read: false, created_date: new Date().toISOString(), ...data };
    notifications.unshift(created);
    writeStore(STORAGE_KEYS.notifications, notifications);
    return created;
  },
  async update(id, data) {
    const notifications = ensureNotifications();
    const updated = notifications.map((item) => item.id === id ? { ...item, ...data } : item);
    writeStore(STORAGE_KEYS.notifications, updated);
    return updated.find((item) => item.id === id);
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

export const base44 = {
  auth: {
    async me() {
      return DEFAULT_USER;
    },
    logout() {
      sessionStorage.removeItem('smartevent_ticket');
      window.location.reload();
    },
    redirectToLogin() {
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
