const demoEvent = {
  title: "Penn State Football MVP Demo",
  venue: "Beaver Stadium",
  kickoffLabel: "Kickoff window: Saturday, October 18, 2026 at 7:30 PM ET",
  attendance: "Expected crowd: 103,000+ fans",
  operatorNote: "Built as a Penn State football MVP and designed to scale to concerts and other large venues."
};

const demoTickets = [
  {
    id: "west-lower",
    label: "West Lower Bowl",
    code: "PSU-BVR-WE07-1842",
    section: "Section WE-07 / Row 18 / Seat 42",
    sectionCode: "WE-07",
    row: "18",
    seatNumber: "42",
    assignedGate: "Gate B",
    parking: "Lot A",
    cluster: "west",
    arrivalWindow: "Best arrival window: 6:10 PM to 6:35 PM",
    smartEntry: true,
    note: "Fastest route usually favors Gate B smart lane with Tunnel 14 access."
  },
  {
    id: "student-section",
    label: "Student Section",
    code: "PSU-BVR-ST24-0308",
    section: "Section ST-24 / Row 3 / Seat 8",
    sectionCode: "ST-24",
    row: "3",
    seatNumber: "8",
    assignedGate: "Gate S",
    parking: "Lot Red A",
    cluster: "student",
    arrivalWindow: "Best arrival window: 6:00 PM to 6:20 PM",
    smartEntry: false,
    note: "Higher pre-kickoff density near the north student entrance. Watch for reroutes."
  },
  {
    id: "east-club",
    label: "East Club Entry",
    code: "PSU-BVR-EC12-0911",
    section: "Club EC-12 / Row 9 / Seat 11",
    sectionCode: "EC-12",
    row: "9",
    seatNumber: "11",
    assignedGate: "Gate C",
    parking: "VIP East",
    cluster: "east",
    arrivalWindow: "Best arrival window: 6:20 PM to 6:45 PM",
    smartEntry: true,
    note: "Club ticket holders benefit from the east-side smart verification camera."
  },
  {
    id: "south-family",
    label: "South Family Gate",
    code: "PSU-BVR-SF03-2217",
    section: "Section SF-03 / Row 22 / Seat 17",
    sectionCode: "SF-03",
    row: "22",
    seatNumber: "17",
    assignedGate: "Gate D",
    parking: "Lot Jordan East",
    cluster: "south",
    arrivalWindow: "Best arrival window: 6:15 PM to 6:40 PM",
    smartEntry: false,
    note: "Lower density routes usually move through the south plaza and family entrance."
  }
];

const scenarioCatalog = {
  arrival: {
    label: "Arrival Window",
    context: "Crowds are still spreading out across the venue. Smart routing can redirect fans before lines spike.",
    gates: [
      { id: "gate-a", name: "Gate A", status: "steady", wait: 12, density: 48, walk: 10, smartGate: false, affinity: "north", camera: "North Plaza Cam 1", confidence: 90, throughput: 31 },
      { id: "gate-b", name: "Gate B", status: "clear", wait: 8, density: 35, walk: 7, smartGate: true, affinity: "west", camera: "West Concourse Cam 2", confidence: 94, throughput: 43 },
      { id: "gate-c", name: "Gate C", status: "steady", wait: 11, density: 45, walk: 8, smartGate: true, affinity: "east", camera: "East Smart Gate Cam", confidence: 92, throughput: 38 },
      { id: "gate-d", name: "Gate D", status: "clear", wait: 9, density: 32, walk: 9, smartGate: false, affinity: "south", camera: "South Plaza Cam 4", confidence: 89, throughput: 29 },
      { id: "gate-s", name: "Gate S", status: "steady", wait: 15, density: 58, walk: 6, smartGate: true, affinity: "student", camera: "Student Lane Cam", confidence: 91, throughput: 41 },
      { id: "gate-f", name: "Gate F", status: "clear", wait: 7, density: 28, walk: 11, smartGate: false, affinity: "family", camera: "Family Entry Cam", confidence: 87, throughput: 24 }
    ],
    zones: [
      { id: "north", label: "North Gate Plaza", area: "north", load: 46, note: "Balanced inflow from parking lots." },
      { id: "west", label: "West Main Concourse", area: "west", load: 41, note: "Strong throughput near Gate B smart lane." },
      { id: "east", label: "East Concourse", area: "east", load: 49, note: "Club traffic is forming, but still manageable." },
      { id: "student", label: "Student Entry Zone", area: "student", load: 58, note: "Crowd is stacking up faster than baseline." },
      { id: "club", label: "Club and Suites", area: "club", load: 27, note: "Low pressure with reserved access." },
      { id: "south", label: "South Gate Plaza", area: "south", load: 36, note: "Good overflow option for family routes." }
    ],
    alerts: [
      { title: "Recommended reroute", body: "Student entrance density is rising. Fans in west and south sections should avoid following that crowd." },
      { title: "Smart lane advantage", body: "Gate B is processing smart-entry fans about 12 minutes faster than the current manual average." },
      { title: "Concourse watch", body: "West Main Concourse is stable now. If it rises above 60%, route updates will fire automatically." }
    ],
    metrics: { baselineWait: 24, smartWait: 13, hotZones: 2, reroutedFans: 1180, verifiedFans: 462, manualReview: 38 }
  },
  kickoff: {
    label: "Kickoff Rush",
    context: "The pregame surge is now active. Most fans are trying to enter at the same time, so routing changes minute by minute.",
    gates: [
      { id: "gate-a", name: "Gate A", status: "heavy", wait: 21, density: 72, walk: 10, smartGate: false, affinity: "north", camera: "North Plaza Cam 1", confidence: 88, throughput: 27 },
      { id: "gate-b", name: "Gate B", status: "steady", wait: 14, density: 56, walk: 7, smartGate: true, affinity: "west", camera: "West Concourse Cam 2", confidence: 93, throughput: 46 },
      { id: "gate-c", name: "Gate C", status: "steady", wait: 16, density: 61, walk: 8, smartGate: true, affinity: "east", camera: "East Smart Gate Cam", confidence: 91, throughput: 41 },
      { id: "gate-d", name: "Gate D", status: "clear", wait: 11, density: 39, walk: 9, smartGate: false, affinity: "south", camera: "South Plaza Cam 4", confidence: 90, throughput: 31 },
      { id: "gate-s", name: "Gate S", status: "heavy", wait: 22, density: 78, walk: 6, smartGate: true, affinity: "student", camera: "Student Lane Cam", confidence: 90, throughput: 39 },
      { id: "gate-f", name: "Gate F", status: "clear", wait: 10, density: 34, walk: 11, smartGate: false, affinity: "family", camera: "Family Entry Cam", confidence: 86, throughput: 25 }
    ],
    zones: [
      { id: "north", label: "North Gate Plaza", area: "north", load: 74, note: "North inflow is overloaded and slowing down." },
      { id: "west", label: "West Main Concourse", area: "west", load: 62, note: "West gate remains strong thanks to smart verification." },
      { id: "east", label: "East Concourse", area: "east", load: 66, note: "Club and east-bowl routes are filling steadily." },
      { id: "student", label: "Student Entry Zone", area: "student", load: 83, note: "Primary crowd hotspot. Push reroutes should fire now." },
      { id: "club", label: "Club and Suites", area: "club", load: 38, note: "Moderate movement with little spillover." },
      { id: "south", label: "South Gate Plaza", area: "south", load: 44, note: "Best overflow gate for south and west arrivals." }
    ],
    alerts: [
      { title: "Fastest gate right now", body: "Gate D is the quickest path into Beaver Stadium for most non-student fans during the kickoff surge." },
      { title: "Push notification sent", body: "SmartVenue is rerouting west-lower and south-bowl fans away from Gate A and Gate S." },
      { title: "Manual review spike", body: "Student smart lane retries are up. Operator view should watch manual review count closely." }
    ],
    metrics: { baselineWait: 29, smartWait: 17, hotZones: 3, reroutedFans: 2140, verifiedFans: 731, manualReview: 66 }
  },
  halftime: {
    label: "Halftime Concourse Surge",
    context: "Entry pressure cools off, but internal congestion rises as fans move toward concessions and restrooms.",
    gates: [
      { id: "gate-a", name: "Gate A", status: "clear", wait: 7, density: 26, walk: 10, smartGate: false, affinity: "north", camera: "North Plaza Cam 1", confidence: 91, throughput: 23 },
      { id: "gate-b", name: "Gate B", status: "clear", wait: 6, density: 24, walk: 7, smartGate: true, affinity: "west", camera: "West Concourse Cam 2", confidence: 94, throughput: 24 },
      { id: "gate-c", name: "Gate C", status: "clear", wait: 6, density: 21, walk: 8, smartGate: true, affinity: "east", camera: "East Smart Gate Cam", confidence: 93, throughput: 22 },
      { id: "gate-d", name: "Gate D", status: "clear", wait: 5, density: 18, walk: 9, smartGate: false, affinity: "south", camera: "South Plaza Cam 4", confidence: 91, throughput: 20 },
      { id: "gate-s", name: "Gate S", status: "steady", wait: 8, density: 42, walk: 6, smartGate: true, affinity: "student", camera: "Student Lane Cam", confidence: 89, throughput: 25 },
      { id: "gate-f", name: "Gate F", status: "clear", wait: 5, density: 17, walk: 11, smartGate: false, affinity: "family", camera: "Family Entry Cam", confidence: 86, throughput: 18 }
    ],
    zones: [
      { id: "north", label: "North Gate Plaza", area: "north", load: 20, note: "Entry plazas are mostly clear at halftime." },
      { id: "west", label: "West Main Concourse", area: "west", load: 71, note: "High concession traffic on the west side." },
      { id: "east", label: "East Concourse", area: "east", load: 64, note: "East concourse bathrooms and clubs are filling up." },
      { id: "student", label: "Student Entry Zone", area: "student", load: 57, note: "Student section still shows high internal churn." },
      { id: "club", label: "Club and Suites", area: "club", load: 46, note: "Steady lounge traffic and controlled queues." },
      { id: "south", label: "South Gate Plaza", area: "south", load: 18, note: "South plaza is open and low pressure." }
    ],
    alerts: [
      { title: "Best concession move", body: "West Grill is crowded. SmartVenue suggests moving to South Market for a shorter halftime line." },
      { title: "Return route", body: "Fans in east sections can return through the lower east concourse to avoid the central crush." },
      { title: "Smart gate status", body: "Gate cameras remain online and available for late arrivals, staff, and re-entry traffic." }
    ],
    metrics: { baselineWait: 18, smartWait: 9, hotZones: 2, reroutedFans: 1430, verifiedFans: 804, manualReview: 69 }
  },
  postgame: {
    label: "Postgame Exit",
    context: "The challenge shifts from entering the venue to clearing the stadium safely and preventing choke points at exits.",
    gates: [
      { id: "gate-a", name: "Gate A", status: "heavy", wait: 17, density: 68, walk: 9, smartGate: false, affinity: "north", camera: "North Plaza Cam 1", confidence: 89, throughput: 45 },
      { id: "gate-b", name: "Gate B", status: "steady", wait: 13, density: 54, walk: 8, smartGate: true, affinity: "west", camera: "West Concourse Cam 2", confidence: 92, throughput: 48 },
      { id: "gate-c", name: "Gate C", status: "clear", wait: 11, density: 42, walk: 9, smartGate: true, affinity: "east", camera: "East Smart Gate Cam", confidence: 91, throughput: 44 },
      { id: "gate-d", name: "Gate D", status: "clear", wait: 10, density: 39, walk: 8, smartGate: false, affinity: "south", camera: "South Plaza Cam 4", confidence: 90, throughput: 43 },
      { id: "gate-s", name: "Gate S", status: "steady", wait: 14, density: 57, walk: 7, smartGate: true, affinity: "student", camera: "Student Lane Cam", confidence: 88, throughput: 41 },
      { id: "gate-f", name: "Gate F", status: "clear", wait: 9, density: 34, walk: 11, smartGate: false, affinity: "family", camera: "Family Entry Cam", confidence: 86, throughput: 35 }
    ],
    zones: [
      { id: "north", label: "North Gate Plaza", area: "north", load: 76, note: "North exit pressure is building quickly." },
      { id: "west", label: "West Main Concourse", area: "west", load: 63, note: "Heavy but moving faster than baseline." },
      { id: "east", label: "East Concourse", area: "east", load: 48, note: "East side gives cleaner release for upper-bowl fans." },
      { id: "student", label: "Student Entry Zone", area: "student", load: 69, note: "Large coordinated exit from student seating." },
      { id: "club", label: "Club and Suites", area: "club", load: 33, note: "Premium zones remain controlled." },
      { id: "south", label: "South Gate Plaza", area: "south", load: 41, note: "Strong alternative exit path for family routes." }
    ],
    alerts: [
      { title: "Best exit gate", body: "Gate D is clearing the fastest for west and south sections after the game." },
      { title: "North congestion warning", body: "Avoid the north plaza unless parking forces it. Exit density is above the safe baseline." },
      { title: "Push guidance active", body: "SmartVenue is sending postgame path suggestions to reduce crowd buildup on the west concourse." }
    ],
    metrics: { baselineWait: 22, smartWait: 12, hotZones: 2, reroutedFans: 2690, verifiedFans: 842, manualReview: 71 }
  }
};

const routeTemplates = {
  west: {
    gate: ["Enter through the recommended gate lane.", "Stay on the west main concourse.", "Use Tunnel 14 for the lower bowl.", "You will arrive beside your WE section."],
    exit: ["Leave through the lower west aisle.", "Cut toward the south-west concourse split.", "Follow the lower-density exit lane.", "Clear into the south plaza before heading to parking."]
  },
  east: {
    gate: ["Enter through the east smart verification lane.", "Stay right on the club/east concourse channel.", "Use the east interior stairs.", "Your club access point will open near EC seating."],
    exit: ["Exit through the east club corridor.", "Follow the east concourse release path.", "Avoid the north release crowd.", "Clear the east plaza toward rideshare and parking."]
  },
  south: {
    gate: ["Enter through the south family gate.", "Stay on the outer south concourse.", "Merge into the lower bowl near Section SF.", "Keep to the family route markers for lower density."],
    exit: ["Leave through the south lower corridor.", "Use the family route toward the south plaza.", "Avoid central stairway crossover traffic.", "Exit to parking from the south side."]
  },
  student: {
    gate: ["Approach the student entrance but wait for live routing.", "If density spikes, SmartVenue will reroute you before the student queue hardens.", "Use the recommended side channel toward the student section.", "Stay in the guided lane for the best seat-entry time."],
    exit: ["Exit through the student release corridor.", "Follow the guided route away from the north choke point.", "Move down the side lane before entering the plaza.", "Clear the student zone before regrouping."]
  }
};

const state = {
  step: "signup",
  mode: "fan",
  scenarioKey: "arrival",
  selectedTicketId: demoTickets[0].id,
  uploadedTicketName: "",
  feedRefresh: 0,
  user: null,
  ticket: null,
  manualGateId: null,
  scanInFlight: false,
  smartEntryBoost: false,
  opsFlags: { overflowLane: false, smartBoost: false, rerouteBroadcast: false }
};

const signupView = document.querySelector("#signup-view");
const ticketView = document.querySelector("#ticket-view");
const experienceView = document.querySelector("#experience-view");
const progressTracker = document.querySelector("#progress-tracker");
const signupForm = document.querySelector("#signup-form");
const ticketChoiceList = document.querySelector("#ticket-choice-list");
const previewTicketTitle = document.querySelector("#preview-ticket-title");
const previewTicketMeta = document.querySelector("#preview-ticket-meta");
const previewTicketNote = document.querySelector("#preview-ticket-note");
const scanStatus = document.querySelector("#scan-status");
const scanTicketButton = document.querySelector("#scan-ticket-button");
const scannerStage = document.querySelector("#scanner-stage");
const ticketUpload = document.querySelector("#ticket-upload");
const ticketCode = document.querySelector("#ticket-code");
const backToSignup = document.querySelector("#back-to-signup");
const heroCopy = document.querySelector("#hero-copy");
const scenarioStrip = document.querySelector("#scenario-strip");
const summaryBand = document.querySelector("#summary-band");
const routePanel = document.querySelector("#route-panel");
const routeBadge = document.querySelector("#route-badge");
const gateGrid = document.querySelector("#gate-grid");
const stadiumMap = document.querySelector("#stadium-map");
const cameraGrid = document.querySelector("#camera-grid");
const alertList = document.querySelector("#alert-list");
const impactPanel = document.querySelector("#impact-panel");
const opsPanel = document.querySelector("#ops-panel");
const opsSurface = document.querySelector("#ops-surface");
const cameraSurface = document.querySelector("#camera-surface");
const cameraSync = document.querySelector("#camera-sync");
const refreshFeed = document.querySelector("#refresh-feed");
const restartDemo = document.querySelector("#restart-demo");
const modeToggle = document.querySelector("#mode-toggle");

function hashSeed(text) {
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) % 997;
  }
  return hash;
}

function jitter(key, span) {
  const seed = hashSeed(`${state.scenarioKey}:${state.feedRefresh}:${key}`);
  return (seed % (span * 2 + 1)) - span;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getSelectedTicket() {
  return demoTickets.find((ticket) => ticket.id === state.selectedTicketId) || demoTickets[0];
}

function getTicketFromCode(code) {
  const cleaned = code.trim().toUpperCase();
  const exactMatch = demoTickets.find((ticket) => ticket.code === cleaned);
  if (exactMatch) return exactMatch;
  if (!cleaned) return getSelectedTicket();
  if (cleaned.includes("ST")) return demoTickets.find((ticket) => ticket.id === "student-section");
  if (cleaned.includes("EC")) return demoTickets.find((ticket) => ticket.id === "east-club");
  if (cleaned.includes("SF")) return demoTickets.find((ticket) => ticket.id === "south-family");
  return demoTickets.find((ticket) => ticket.id === "west-lower");
}

function gateScore(gate, ticket) {
  const user = state.user || {};
  let score = gate.wait * 1.45 + gate.density * 0.17 + gate.walk * 0.85;
  if (gate.affinity === ticket.cluster) score -= 4;
  if (user.arrivalPriority === "shortest") score += gate.walk * 0.7;
  if (user.arrivalPriority === "smart" && gate.smartGate) score -= 4;
  if ((ticket.smartEntry || state.smartEntryBoost) && gate.smartGate) score -= 3;
  if (user.accessPreference === "space") score += gate.density * 0.12;
  if (user.accessPreference === "step-free" && (gate.id === "gate-f" || gate.id === "gate-d")) score -= 2;
  if (gate.status === "heavy") score += 3;
  return score;
}

function liveScenario() {
  const scenario = scenarioCatalog[state.scenarioKey];
  const ticket = state.ticket || getSelectedTicket();

  const gates = scenario.gates.map((gate) => {
    let wait = clamp(gate.wait + jitter(`${gate.id}-wait`, 2), 4, 30);
    let density = clamp(gate.density + jitter(`${gate.id}-density`, 4), 10, 92);
    let throughput = clamp(gate.throughput + jitter(`${gate.id}-throughput`, 2), 16, 54);
    let confidence = clamp(gate.confidence + jitter(`${gate.id}-confidence`, 2), 84, 97);

    if (state.smartEntryBoost && gate.smartGate) {
      wait = clamp(wait - 2, 3, 30);
      density = clamp(density - 4, 10, 92);
      throughput = clamp(throughput + 4, 16, 60);
    }
    if (state.opsFlags.smartBoost && gate.smartGate) {
      wait = clamp(wait - 1, 3, 30);
      density = clamp(density - 3, 10, 92);
      throughput = clamp(throughput + 3, 16, 60);
    }
    if (state.opsFlags.overflowLane && gate.id === "gate-c") {
      wait = clamp(wait - 4, 3, 30);
      density = clamp(density - 9, 10, 92);
      throughput = clamp(throughput + 6, 16, 60);
    }
    if (state.opsFlags.rerouteBroadcast && gate.affinity === ticket.cluster) {
      wait = clamp(wait - 1, 3, 30);
      density = clamp(density - 5, 10, 92);
    }

    const status = density >= 68 || wait >= 19 ? "heavy" : density >= 44 || wait >= 12 ? "steady" : "clear";
    return { ...gate, wait, density, throughput, confidence, status };
  });

  const zones = scenario.zones.map((zone) => {
    let load = clamp(zone.load + jitter(`${zone.id}-zone`, 5), 12, 92);
    if (state.opsFlags.rerouteBroadcast && (zone.id === "north" || zone.id === "student")) load = clamp(load - 6, 12, 92);
    if (state.opsFlags.overflowLane && zone.id === "east") load = clamp(load - 8, 12, 92);
    return { ...zone, load };
  });

  const metrics = {
    baselineWait: scenario.metrics.baselineWait,
    smartWait: clamp(
      scenario.metrics.smartWait -
        (state.smartEntryBoost ? 1 : 0) -
        (state.opsFlags.overflowLane ? 1 : 0) -
        (state.opsFlags.smartBoost ? 1 : 0),
      7,
      scenario.metrics.baselineWait
    ),
    hotZones: clamp(scenario.metrics.hotZones - (state.opsFlags.rerouteBroadcast ? 1 : 0), 1, 4),
    reroutedFans: scenario.metrics.reroutedFans + (state.opsFlags.rerouteBroadcast ? 260 : 0),
    verifiedFans: scenario.metrics.verifiedFans + (state.smartEntryBoost ? 58 : 0) + (state.opsFlags.smartBoost ? 84 : 0),
    manualReview: clamp(scenario.metrics.manualReview - (state.opsFlags.smartBoost ? 11 : 0), 18, 99)
  };

  const alerts = [...scenario.alerts];
  if (state.opsFlags.overflowLane) alerts.unshift({ title: "Overflow lane opened", body: "Operator action opened extra capacity at Gate C. East-side density is dropping in the last camera pass." });
  if (state.opsFlags.smartBoost) alerts.unshift({ title: "Smart verification boosted", body: "Camera verification throughput increased and manual review load is down." });
  if (state.opsFlags.rerouteBroadcast) alerts.unshift({ title: "Broadcast reroute live", body: "Fans are receiving a venue-wide recommendation to avoid the highest-pressure zones." });

  const bestGate = gates.slice().sort((left, right) => gateScore(left, ticket) - gateScore(right, ticket))[0];
  const selectedGate = state.manualGateId ? gates.find((gate) => gate.id === state.manualGateId) || bestGate : bestGate;
  const cameras = gates.slice(0, 4).map((gate) => ({
    name: gate.camera,
    zone: `${gate.name} / ${gate.affinity.toUpperCase()} flow`,
    confidence: gate.confidence,
    density: gate.density,
    trend: jitter(`${gate.id}-trend`, 6),
    note: gate.smartGate ? "Smart gate camera is feeding verification speed and lane health." : "Crowd camera is estimating queue buildup and directional movement."
  }));

  return { scenario, ticket, gates, zones, metrics, alerts, bestGate, selectedGate, cameras };
}

function updateProgress() {
  const order = ["signup", "scan", "experience"];
  const currentIndex = order.indexOf(state.step);
  progressTracker.querySelectorAll(".progress-step").forEach((node) => {
    const stepIndex = order.indexOf(node.dataset.step);
    node.classList.toggle("is-active", node.dataset.step === state.step);
    node.classList.toggle("is-complete", stepIndex < currentIndex);
  });
}

function renderTickets() {
  const selected = getSelectedTicket();
  if (!state.scanInFlight) {
    scanStatus.textContent = state.uploadedTicketName
      ? `Ticket file "${state.uploadedTicketName}" attached. Use Scan ticket and open event to continue.`
      : "Choose a demo ticket or enter a code to load the Beaver Stadium experience.";
  }
  ticketChoiceList.innerHTML = demoTickets
    .map((ticket) => `
      <button type="button" class="ticket-choice-item ${ticket.id === state.selectedTicketId ? "is-selected" : ""}" data-ticket-id="${ticket.id}">
        <div>
          <strong>${ticket.label}</strong>
          <span>${ticket.section}</span>
          <span>${ticket.arrivalWindow}</span>
        </div>
        <span class="ticket-chip">${ticket.smartEntry ? "Smart entry ready" : "Manual + smart routing"}</span>
      </button>
    `)
    .join("");

  previewTicketTitle.textContent = selected.label;
  previewTicketMeta.innerHTML = `
    <div class="ticket-stats">
      <div>
        <span>Section</span>
        <strong>${selected.sectionCode}</strong>
      </div>
      <div>
        <span>Row</span>
        <strong>${selected.row}</strong>
      </div>
      <div>
        <span>Seat</span>
        <strong>${selected.seatNumber}</strong>
      </div>
    </div>
    <div class="ticket-split">
      <div>
        <span>Assigned Gate</span>
        <strong class="ticket-emphasis">${selected.assignedGate}</strong>
      </div>
      <div>
        <span>Parking</span>
        <strong>${selected.parking}</strong>
      </div>
    </div>
    <span><strong>Ticket code:</strong> ${selected.code}</span>
    <span><strong>Arrival:</strong> ${selected.arrivalWindow}</span>
  `;
  previewTicketNote.textContent = selected.note;
}

function renderScenarioChips() {
  scenarioStrip.innerHTML = Object.entries(scenarioCatalog)
    .map(([key, scenario]) => `
      <button type="button" class="scenario-chip ${key === state.scenarioKey ? "is-selected" : ""}" data-scenario="${key}">
        ${scenario.label}
      </button>
    `)
    .join("");
}

function renderSummary(liveData) {
  cameraSync.textContent = `Last camera sync ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  summaryBand.innerHTML = `
    <article class="summary-tile">
      <div>
        <strong>${liveData.bestGate.name}</strong>
        <span>Fastest gate right now</span>
      </div>
      <div class="summary-icon">01</div>
    </article>
    <article class="summary-tile">
      <div>
        <strong>${liveData.selectedGate.wait} min</strong>
        <span>Predicted time in line</span>
      </div>
      <div class="summary-icon">02</div>
    </article>
    <article class="summary-tile">
      <div>
        <strong>${liveData.cameras[0].confidence}%</strong>
        <span>Top camera confidence</span>
      </div>
      <div class="summary-icon">03</div>
    </article>
    <article class="summary-tile">
      <div>
        <strong>${liveData.metrics.baselineWait - liveData.metrics.smartWait} min</strong>
        <span>Projected time saved</span>
      </div>
      <div class="summary-icon">04</div>
    </article>
  `;
}

function renderRoute(liveData) {
  const scenarioType = state.scenarioKey === "postgame" ? "exit" : "gate";
  const steps = routeTemplates[liveData.ticket.cluster][scenarioType];
  const usingRecommended = liveData.selectedGate.id === liveData.bestGate.id;
  routeBadge.textContent = usingRecommended ? "Live recommendation" : "Manual route selected";

  routePanel.innerHTML = `
    <div class="route-recommendation">
      <div class="route-highlight">
        <p class="mini-label">${liveData.scenario.label}</p>
        <h4>${liveData.selectedGate.name}${liveData.selectedGate.smartGate ? " Smart Lane" : ""}</h4>
        <p class="lead compact">
          ${state.scenarioKey === "postgame"
            ? `Exit through ${liveData.selectedGate.name} to reduce crowd pressure for ${liveData.ticket.section}.`
            : `Use ${liveData.selectedGate.name} to reach ${liveData.ticket.section} faster than the current venue baseline.`}
        </p>
      </div>

      <div class="route-detail-grid">
        <div class="route-metric">
          <strong>${liveData.selectedGate.wait} min</strong>
          <span>Predicted line time</span>
        </div>
        <div class="route-metric">
          <strong>${liveData.selectedGate.walk} min</strong>
          <span>Walking time from plaza</span>
        </div>
        <div class="route-metric">
          <strong>${liveData.selectedGate.density}%</strong>
          <span>Queue density</span>
        </div>
      </div>

      <ol class="route-steps">
        ${steps.map((step, index) => `
          <li class="route-step">
            <span>${index + 1}</span>
            <div>${step}</div>
          </li>
        `).join("")}
      </ol>

      <div class="route-actions">
        <button class="primary-button" type="button" id="lock-route">Lock this route</button>
        <button class="secondary-button" type="button" id="toggle-smart-entry">
          ${state.smartEntryBoost ? "Smart entry enabled" : "Enable smart entry assist"}
        </button>
      </div>
    </div>
  `;
}

function renderGates(liveData) {
  gateGrid.innerHTML = liveData.gates
    .slice()
    .sort((left, right) => gateScore(left, liveData.ticket) - gateScore(right, liveData.ticket))
    .map((gate) => `
      <article class="gate-card ${gate.id === liveData.bestGate.id ? "is-recommended" : ""}">
        <div class="gate-title">
          <strong>${gate.name}</strong>
          <span>${gate.smartGate ? "Camera + smart verification" : "Camera + queue monitoring"}</span>
        </div>
        <span class="status-label ${gate.status}">
          ${gate.status === "clear" ? "Clear" : gate.status === "steady" ? "Steady" : "Heavy"}
        </span>
        <div class="gate-stats">
          <div class="gate-stat-row"><span>Wait</span><strong>${gate.wait} min</strong></div>
          <div class="gate-stat-row"><span>Density</span><strong>${gate.density}%</strong></div>
          <div class="density-bar"><span style="width:${gate.density}%"></span></div>
          <div class="gate-stat-row"><span>Throughput</span><strong>${gate.throughput} fans/min</strong></div>
          <div class="gate-stat-row"><span>Camera confidence</span><strong>${gate.confidence}%</strong></div>
          <button class="secondary-button" type="button" data-gate-pick="${gate.id}">
            ${gate.id === liveData.selectedGate.id ? "Current route" : "Route me here"}
          </button>
        </div>
      </article>
    `)
    .join("");
}

function renderZones(liveData) {
  stadiumMap.innerHTML = `
    ${liveData.zones.map((zone) => {
      const level = zone.load >= 68 ? "is-heavy" : zone.load >= 45 ? "is-medium" : "is-light";
      return `
        <article class="zone-card ${zone.area} ${level}">
          <p class="mini-label">Zone load</p>
          <h4>${zone.label}</h4>
          <div class="gate-stat-row"><span>Density</span><strong>${zone.load}%</strong></div>
          <div class="density-bar"><span style="width:${zone.load}%"></span></div>
          <p>${zone.note}</p>
        </article>
      `;
    }).join("")}
    <div class="field-core">
      <div>
        <strong>${demoEvent.venue}</strong>
        <span>${demoEvent.kickoffLabel}</span>
      </div>
    </div>
  `;
}

function renderCameras(liveData) {
  cameraGrid.innerHTML = liveData.cameras
    .map((camera) => `
      <article class="camera-card">
        <div class="camera-title">
          <div>
            <p class="mini-label">${camera.zone}</p>
            <strong>${camera.name}</strong>
          </div>
          <span class="status-pill">${camera.confidence}% confidence</span>
        </div>
        <div class="camera-visual">
          <strong>Density reading ${camera.density}%</strong>
          <span class="camera-confidence">${camera.trend >= 0 ? "+" : ""}${camera.trend}% trend from the last pass</span>
        </div>
        <p>${camera.note}</p>
      </article>
    `)
    .join("");
}

function renderAlerts(liveData) {
  const visibleAlerts = state.mode === "fan" ? liveData.alerts.slice(0, 2) : liveData.alerts;
  alertList.innerHTML = visibleAlerts
    .map((alert, index) => `
      <article class="alert-card">
        <div class="alert-title">
          <strong>${index + 1 < 10 ? `0${index + 1}` : index + 1}</strong>
          <div>
            <strong>${alert.title}</strong>
            <p>${alert.body}</p>
          </div>
        </div>
      </article>
    `)
    .join("");
}

function renderImpact(liveData) {
  const waitSavings = liveData.metrics.baselineWait - liveData.metrics.smartWait;
  const waitScore = clamp((liveData.metrics.smartWait / liveData.metrics.baselineWait) * 100, 20, 100);
  const rerouteScore = clamp(Math.round(liveData.metrics.reroutedFans / 32), 18, 100);
  const verifyScore = clamp(Math.round(liveData.metrics.verifiedFans / 10), 20, 100);
  const hotZoneScore = clamp(100 - liveData.metrics.hotZones * 18, 32, 100);

  impactPanel.innerHTML = `
    <div class="impact-grid">
      <article class="impact-item">
        <strong>${waitSavings} min faster</strong>
        <span class="impact-caption">Average entry improvement over the baseline venue run.</span>
        <div class="impact-bar"><span style="width:${100 - waitScore}%"></span></div>
      </article>
      <article class="impact-item">
        <strong>${liveData.metrics.reroutedFans.toLocaleString()} fans rerouted</strong>
        <span class="impact-caption">Push guidance actively redistributing crowd pressure.</span>
        <div class="impact-bar"><span style="width:${rerouteScore}%"></span></div>
      </article>
      <article class="impact-item">
        <strong>${liveData.metrics.verifiedFans} smart verifications</strong>
        <span class="impact-caption">Vision-assisted gate checks that raise throughput.</span>
        <div class="impact-bar"><span style="width:${verifyScore}%"></span></div>
      </article>
      <article class="impact-item">
        <strong>${liveData.metrics.hotZones} live hot zones</strong>
        <span class="impact-caption">Crowd engine is keeping choke points lower than the baseline.</span>
        <div class="impact-bar"><span style="width:${hotZoneScore}%"></span></div>
      </article>
    </div>
  `;
}

function renderOps(liveData) {
  opsPanel.innerHTML = `
    <div class="ops-grid">
      <article class="ops-metric">
        <strong>${liveData.metrics.verifiedFans}</strong>
        <span>Verified fans through smart entry</span>
        <p class="ops-note">Higher counts mean faster smart lanes and less manual friction.</p>
      </article>
      <article class="ops-metric">
        <strong>${liveData.metrics.manualReview}</strong>
        <span>Manual review cases</span>
        <p class="ops-note">Good operator target is to keep this under 75 during surge windows.</p>
      </article>
      <article class="ops-metric">
        <strong>${liveData.metrics.hotZones}</strong>
        <span>Zones above threshold</span>
        <p class="ops-note">Trigger rerouting or overflow lanes when hot zones stay elevated.</p>
      </article>
    </div>

    <div class="ops-actions">
      <button class="secondary-button" type="button" data-ops-action="overflow">
        ${state.opsFlags.overflowLane ? "Overflow lane opened" : "Open Gate C overflow lane"}
      </button>
      <button class="secondary-button" type="button" data-ops-action="smart">
        ${state.opsFlags.smartBoost ? "Smart gate boosted" : "Boost smart verification"}
      </button>
      <button class="secondary-button" type="button" data-ops-action="broadcast">
        ${state.opsFlags.rerouteBroadcast ? "Reroute broadcast live" : "Broadcast reroute"}
      </button>
    </div>
  `;

  opsSurface.classList.toggle("is-hidden", state.mode !== "ops");
  cameraSurface.classList.toggle("is-hidden", state.mode !== "ops");
}

function renderExperience() {
  const liveData = liveScenario();
  const userName = state.user ? state.user.fullName.split(" ")[0] : "Fan";

  modeToggle.querySelectorAll("[data-mode]").forEach((chip) => {
    chip.classList.toggle("is-selected", chip.dataset.mode === state.mode);
  });
  renderScenarioChips();
  heroCopy.textContent = `${userName}, your ${liveData.ticket.label.toLowerCase()} ticket is connected. ${liveData.scenario.context} ${demoEvent.operatorNote}`;
  renderSummary(liveData);
  renderRoute(liveData);
  renderGates(liveData);
  renderZones(liveData);
  renderCameras(liveData);
  renderAlerts(liveData);
  renderImpact(liveData);
  renderOps(liveData);
}

function renderView() {
  signupView.classList.toggle("is-active", state.step === "signup");
  ticketView.classList.toggle("is-active", state.step === "scan");
  experienceView.classList.toggle("is-active", state.step === "experience");
  updateProgress();

  if (state.step === "scan") renderTickets();
  if (state.step === "experience") renderExperience();
}

signupForm.addEventListener("submit", (event) => {
  event.preventDefault();
  state.user = {
    fullName: document.querySelector("#full-name").value.trim(),
    email: document.querySelector("#email").value.trim(),
    arrivalPriority: document.querySelector("#arrival-priority").value,
    accessPreference: document.querySelector("#access-preference").value
  };
  state.step = "scan";
  renderView();
});

ticketChoiceList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-ticket-id]");
  if (!button) return;
  state.selectedTicketId = button.dataset.ticketId;
  renderTickets();
});

backToSignup.addEventListener("click", () => {
  state.step = "signup";
  renderView();
});

ticketUpload.addEventListener("change", () => {
  state.uploadedTicketName = ticketUpload.files && ticketUpload.files[0] ? ticketUpload.files[0].name : "";
  if (state.uploadedTicketName) {
    scanStatus.textContent = `Ticket file "${state.uploadedTicketName}" attached. Use Scan ticket and open event to continue.`;
  }
});

scanTicketButton.addEventListener("click", () => {
  if (state.scanInFlight) return;
  state.scanInFlight = true;
  scannerStage.classList.add("is-scanning");
  scanStatus.textContent = "Scanning ticket and matching it to the Beaver Stadium event feed...";

  window.setTimeout(() => {
    const ticket = getTicketFromCode(ticketCode.value);
    state.ticket = ticket;
    state.selectedTicketId = ticket.id;
    state.step = "experience";
    state.scanInFlight = false;
    scannerStage.classList.remove("is-scanning");
    scanStatus.textContent = `${ticket.label} recognized. Opening the live event experience now.`;
    renderView();
  }, 1400);
});

refreshFeed.addEventListener("click", () => {
  state.feedRefresh += 1;
  renderExperience();
});

restartDemo.addEventListener("click", () => {
  state.step = "signup";
  state.mode = "fan";
  state.scenarioKey = "arrival";
  state.selectedTicketId = demoTickets[0].id;
  state.uploadedTicketName = "";
  state.feedRefresh = 0;
  state.user = null;
  state.ticket = null;
  state.manualGateId = null;
  state.scanInFlight = false;
  state.smartEntryBoost = false;
  state.opsFlags = { overflowLane: false, smartBoost: false, rerouteBroadcast: false };
  signupForm.reset();
  ticketCode.value = "";
  ticketUpload.value = "";
  scanStatus.textContent = "Choose a demo ticket or enter a code to load the Beaver Stadium experience.";
  renderView();
});

modeToggle.addEventListener("click", (event) => {
  const button = event.target.closest("[data-mode]");
  if (!button) return;

  state.mode = button.dataset.mode;
  modeToggle.querySelectorAll("[data-mode]").forEach((chip) => {
    chip.classList.toggle("is-selected", chip.dataset.mode === state.mode);
  });
  renderExperience();
});

scenarioStrip.addEventListener("click", (event) => {
  const button = event.target.closest("[data-scenario]");
  if (!button) return;
  state.scenarioKey = button.dataset.scenario;
  state.manualGateId = null;
  renderExperience();
});

document.addEventListener("click", (event) => {
  const toggleSmartEntry = event.target.closest("#toggle-smart-entry");
  if (toggleSmartEntry) {
    state.smartEntryBoost = !state.smartEntryBoost;
    renderExperience();
    return;
  }

  const lockRoute = event.target.closest("#lock-route");
  if (lockRoute) {
    routeBadge.textContent = "Route locked";
    return;
  }

  const gatePick = event.target.closest("[data-gate-pick]");
  if (gatePick) {
    state.manualGateId = gatePick.dataset.gatePick;
    renderExperience();
    return;
  }

  const opsAction = event.target.closest("[data-ops-action]");
  if (opsAction) {
    const action = opsAction.dataset.opsAction;
    if (action === "overflow") state.opsFlags.overflowLane = !state.opsFlags.overflowLane;
    if (action === "smart") state.opsFlags.smartBoost = !state.opsFlags.smartBoost;
    if (action === "broadcast") state.opsFlags.rerouteBroadcast = !state.opsFlags.rerouteBroadcast;
    renderExperience();
  }
});

renderView();
