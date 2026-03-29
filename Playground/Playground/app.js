const tickets = [
  {
    code: "PSU-BVR-WE07-1842",
    label: "Student White Out",
    seat: "Section WE, Row 7, Seat 18",
    gate: "Gate C",
    parking: "Lot 32",
    arrival: "Student entry rerouted from Gate A due to surge.",
  },
  {
    code: "PSU-BVR-ADA02-0911",
    label: "ADA Priority",
    seat: "Section ADA, Row 2, Seat 11",
    gate: "Gate B",
    parking: "ADA Shuttle Drop",
    arrival: "Protected corridor is active with low conflict routing.",
  },
  {
    code: "PSU-BVR-EA14-2210",
    label: "General Admission",
    seat: "Section EA, Row 14, Seat 22",
    gate: "Gate E",
    parking: "Jordan East",
    arrival: "Ticket windows are busy. Mobile scan lane is fastest.",
  },
];

const scenarios = [
  {
    phase: "Pregame surge",
    status: "Live routing",
    highlights: [
      { label: "Fastest gate", value: "Gate C", detail: "11 min faster than Gate A" },
      { label: "Queue density", value: "64%", detail: "Student side remains most crowded" },
      { label: "ADA safety", value: "Protected", detail: "North corridor conflict risk is low" },
      { label: "Arrival ETA", value: "7 min", detail: "Using the recommended path" },
    ],
    route: {
      title: "Shift to Gate C via Curtin Road",
      description: "Gate A is seeing a student surge. Cameras show Gate C moving smoothly with similar walking distance.",
      steps: [
        "Walk east on Curtin Road toward the blue digital signage.",
        "Follow the SmartVenue arrows to Gate C mobile scan lane.",
        "Enter through the lower-density corridor to student seating.",
      ],
    },
    zones: [
      { name: "Gate A student lane", density: "High", wait: "22 min", color: "#ef5b62" },
      { name: "Gate C mobile scan", density: "Low", wait: "11 min", color: "#18b67a" },
      { name: "Gate E ticket windows", density: "Medium", wait: "16 min", color: "#f5a524" },
    ],
    metrics: [
      { label: "Avg. gate wait", before: "18 min", after: "9 min" },
      { label: "Max queue length", before: "310 fans", after: "182 fans" },
      { label: "ADA conflict risk", before: "28%", after: "11%" },
      { label: "Entry clearance", before: "34 min", after: "22 min" },
    ],
    interventions: [
      { title: "Reroute 20% of Gate A arrivals", detail: "Digital signage and app prompts shift flow to Gate C." },
      { title: "Open mobile-only scan lane", detail: "Gate C throughput increases for pre-registered tickets." },
    ],
  },
  {
    phase: "Halftime balancing",
    status: "Concourse rebalance",
    highlights: [
      { label: "Fastest concession", value: "West Club 2", detail: "7 min shorter than South Grill" },
      { label: "Queue density", value: "48%", detail: "Concourse traffic is stabilizing" },
      { label: "ADA safety", value: "Priority", detail: "Protected corridor kept clear" },
      { label: "Restroom load", value: "Balanced", detail: "East and west clusters are near parity" },
    ],
    route: {
      title: "Use West Club 2 for halftime service",
      description: "South Grill is saturated. West Club 2 has lower wait and smoother walking flow from your seating section.",
      steps: [
        "Exit your section toward the west concourse ribbon.",
        "Stay on the green service route to bypass the student cluster.",
        "Use West Club 2 and return through the same protected aisle.",
      ],
    },
    zones: [
      { name: "South Grill", density: "High", wait: "19 min", color: "#ef5b62" },
      { name: "West Club 2", density: "Low", wait: "8 min", color: "#18b67a" },
      { name: "North restroom bank", density: "Medium", wait: "9 min", color: "#f5a524" },
    ],
    metrics: [
      { label: "Concession wait", before: "17 min", after: "8 min" },
      { label: "Queue imbalance", before: "2.3x", after: "1.2x" },
      { label: "Protected corridor risk", before: "19%", after: "8%" },
      { label: "Service throughput", before: "420/hr", after: "615/hr" },
    ],
    interventions: [
      { title: "Push alternate concession card", detail: "The app highlights an underused service node with similar travel cost." },
      { title: "Restrict spillover near ADA corridor", detail: "Ops staff keep the adjacent edge clear during halftime burst." },
    ],
  },
  {
    phase: "Postgame exit",
    status: "Exit redistribution",
    highlights: [
      { label: "Best exit", value: "Gate F", detail: "14 min faster than habitual Gate A exit" },
      { label: "Queue density", value: "71%", detail: "High outbound demand from lower bowl" },
      { label: "ADA safety", value: "Escorted", detail: "Protected egress route is active" },
      { label: "Clearance ETA", value: "26 min", detail: "Down from 39 min baseline" },
    ],
    route: {
      title: "Exit via Gate F in phased release",
      description: "Traditional north-side exits are over capacity. SmartVenue is phasing nearby sections toward Gate F for faster clearance.",
      steps: [
        "Hold for the first release pulse shown on your phone.",
        "Take the outer concourse lane toward Gate F.",
        "Follow staff guidance near the northwest egress corridor.",
      ],
    },
    zones: [
      { name: "Gate A outbound", density: "High", wait: "27 min", color: "#ef5b62" },
      { name: "Gate F outbound", density: "Medium", wait: "13 min", color: "#18b67a" },
      { name: "North ADA egress", density: "Protected", wait: "6 min", color: "#2f77ff" },
    ],
    metrics: [
      { label: "Exit clearance", before: "39 min", after: "26 min" },
      { label: "Peak node load", before: "415 fans", after: "250 fans" },
      { label: "Route conflicts", before: "31", after: "12" },
      { label: "Secondary gate usage", before: "18%", after: "37%" },
    ],
    interventions: [
      { title: "Phase release by seating zone", detail: "Sections nearest Gate A are held briefly to reduce simultaneous surge." },
      { title: "Broadcast alternate exit guidance", detail: "Staff tablets, signage, and app alerts reinforce Gate F usage." },
    ],
  },
];

const state = {
  step: 0,
  selectedTicket: tickets[0],
  scenarioIndex: 0,
  opsMode: false,
  profile: null,
};

const screens = [
  document.getElementById("signupScreen"),
  document.getElementById("ticketScreen"),
  document.getElementById("eventScreen"),
];

const progressFill = document.getElementById("progressFill");
const statusBadge = document.getElementById("statusBadge");
const signupForm = document.getElementById("signupForm");
const ticketOptions = document.getElementById("ticketOptions");
const ticketInput = document.getElementById("ticketInput");
const scanButton = document.getElementById("scanButton");
const eventTitle = document.getElementById("eventTitle");
const ticketSummary = document.getElementById("ticketSummary");
const gateChip = document.getElementById("gateChip");
const highlightsGrid = document.getElementById("highlightsGrid");
const routeTitle = document.getElementById("routeTitle");
const routeDescription = document.getElementById("routeDescription");
const routeSteps = document.getElementById("routeSteps");
const zoneList = document.getElementById("zoneList");
const metricsGrid = document.getElementById("metricsGrid");
const interventionList = document.getElementById("interventionList");
const fanModeButton = document.getElementById("fanModeButton");
const opsModeButton = document.getElementById("opsModeButton");
const opsPanel = document.getElementById("opsPanel");
const simulateButton = document.getElementById("simulateButton");
const resetButton = document.getElementById("resetButton");

function renderTicketOptions() {
  ticketOptions.innerHTML = "";

  tickets.forEach((ticket) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ticket-option";
    if (ticket.code === state.selectedTicket.code) {
      button.classList.add("is-selected");
    }

    button.innerHTML = `
      <p class="eyebrow">Demo Pass</p>
      <h3>${ticket.label}</h3>
      <p>${ticket.seat}</p>
      <small>${ticket.code}</small>
    `;

    button.addEventListener("click", () => {
      state.selectedTicket = ticket;
      ticketInput.value = ticket.code;
      renderTicketOptions();
    });

    ticketOptions.appendChild(button);
  });
}

function renderScreen() {
  screens.forEach((screen, index) => {
    screen.classList.toggle("is-active", index === state.step);
  });

  const widths = ["33%", "66%", "100%"];
  const labels = ["Sign up", "Ticket scan", "Live event"];
  progressFill.style.width = widths[state.step];
  statusBadge.textContent = labels[state.step];
}

function renderEvent() {
  const scenario = scenarios[state.scenarioIndex];
  const ticket = state.selectedTicket;
  const fanName = state.profile?.name?.split(" ")[0] || "Fan";

  eventTitle.textContent = `${fanName}'s Beaver Stadium Live`;
  ticketSummary.textContent = `${ticket.seat} • ${ticket.parking}`;
  gateChip.textContent = ticket.gate;

  highlightsGrid.innerHTML = scenario.highlights.map((item) => `
    <article class="highlight-card">
      <p>${item.label}</p>
      <strong>${item.value}</strong>
      <p>${item.detail}</p>
    </article>
  `).join("");

  routeTitle.textContent = scenario.route.title;
  routeDescription.textContent = `${scenario.route.description} ${ticket.arrival}`;
  routeSteps.innerHTML = scenario.route.steps.map((step, index) => `
    <div class="route-step">
      <div class="route-step-index">${index + 1}</div>
      <div>${step}</div>
    </div>
  `).join("");

  zoneList.innerHTML = scenario.zones.map((zone) => `
    <article class="zone-row">
      <div class="zone-meta">
        <span class="zone-swatch" style="background:${zone.color}"></span>
        <div>
          <strong>${zone.name}</strong>
          <p>${zone.density} density zone</p>
        </div>
      </div>
      <strong>${zone.wait}</strong>
    </article>
  `).join("");

  metricsGrid.innerHTML = scenario.metrics.map((metric) => `
    <article class="metric-card">
      <p>${metric.label}</p>
      <strong>${metric.after}</strong>
      <p>Before: ${metric.before}</p>
    </article>
  `).join("");

  interventionList.innerHTML = scenario.interventions.map((item) => `
    <article class="intervention-card">
      <strong>${item.title}</strong>
      <p>${item.detail}</p>
    </article>
  `).join("");
}

function setOpsMode(enabled) {
  state.opsMode = enabled;
  fanModeButton.classList.toggle("is-active", !enabled);
  opsModeButton.classList.toggle("is-active", enabled);
  opsPanel.hidden = !enabled;
}

signupForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(signupForm);
  state.profile = {
    name: formData.get("name"),
    email: formData.get("email"),
    fanType: formData.get("fanType"),
    arrival: formData.get("arrival"),
  };
  state.step = 1;
  renderScreen();
});

scanButton.addEventListener("click", () => {
  const manualCode = ticketInput.value.trim();
  const matchedTicket = tickets.find((ticket) => ticket.code === manualCode);

  if (manualCode && matchedTicket) {
    state.selectedTicket = matchedTicket;
  } else if (manualCode && !matchedTicket) {
    state.selectedTicket = {
      ...tickets[0],
      code: manualCode,
      label: "Custom ticket",
      seat: "Section WE, Row 9, Seat 14",
      gate: "Gate C",
      parking: "Lot 32",
      arrival: "Custom scan recognized. SmartVenue generated the best Beaver Stadium route.",
    };
  }

  state.step = 2;
  renderScreen();
  renderEvent();
});

fanModeButton.addEventListener("click", () => setOpsMode(false));
opsModeButton.addEventListener("click", () => setOpsMode(true));

simulateButton.addEventListener("click", () => {
  state.scenarioIndex = (state.scenarioIndex + 1) % scenarios.length;
  renderEvent();
});

resetButton.addEventListener("click", () => {
  state.step = 0;
  state.scenarioIndex = 0;
  state.selectedTicket = tickets[0];
  state.profile = null;
  signupForm.reset();
  ticketInput.value = tickets[0].code;
  renderTicketOptions();
  renderScreen();
  setOpsMode(false);
});

ticketInput.value = state.selectedTicket.code;
renderTicketOptions();
renderScreen();
renderEvent();
setOpsMode(false);
