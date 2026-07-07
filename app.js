const agentCore = window.TravelAgentCore;

if (!agentCore) {
  throw new Error("TravelAgentCore did not load. Make sure agent.js is included before app.js.");
}

const { answerQuestion, toolDetails } = agentCore;

const trip = createBlankTripState();
const toolLabels = {
  parse_trip_request: "Read trip request",
  search_flights: "Flights",
  search_hotels: "Stay",
  find_activities: "Activities",
  estimate_budget: "Budget",
  build_itinerary: "Itinerary",
  save_to_trip: "Saved"
};

const dom = {
  messages: document.querySelector("#messages"),
  composer: document.querySelector("#composer"),
  input: document.querySelector("#tripInput"),
  quickActions: document.querySelectorAll("[data-prompt]"),
  cheaperBtn: document.querySelector("#cheaperBtn"),
  resetBtn: document.querySelector("#resetBtn"),
  agentMode: document.querySelector("#agentMode"),
  tripPrefs: document.querySelector("#tripPrefs"),
  tripTitle: document.querySelector("#tripTitle"),
  tripSubtitle: document.querySelector("#tripSubtitle"),
  tripTotal: document.querySelector("#tripTotal"),
  destinationCard: document.querySelector("#destinationCard"),
  destinationHero: document.querySelector("#destinationHero"),
  flightTitle: document.querySelector("#flightTitle"),
  hotelTitle: document.querySelector("#hotelTitle"),
  flightCosts: document.querySelector("#flightCosts"),
  stayCosts: document.querySelector("#stayCosts"),
  activityCosts: document.querySelector("#activityCosts"),
  otherCosts: document.querySelector("#otherCosts"),
  routeOrigin: document.querySelector("#routeOrigin"),
  routeStay: document.querySelector("#routeStay"),
  routeDestination: document.querySelector("#routeDestination"),
  timeline: document.querySelector("#timeline"),
  agentStatus: document.querySelector("#agentStatus"),
  agentExplainer: document.querySelector("#agentExplainer"),
  toolCards: document.querySelectorAll(".tool-card")
};

const defaultToolCopy = {
  search_flights: "Compares route, timing, and estimated group fare.",
  search_hotels: "Chooses a hotel area that fits the group and budget.",
  find_activities: "Builds a daily plan around the traveler preferences.",
  estimate_budget: "Tracking trip total as plans change."
};

function createBlankTripState() {
  return {
    isEmpty: true,
    destination: "Plan a new trip",
    region: "",
    destinationKey: "",
    origin: "Origin",
    airport: "",
    days: 0,
    travelers: 0,
    budget: "not set",
    style: "tell me what you want",
    total: 0,
    currency: "USD",
    flight: {
      title: "Flight search ready",
      route: "Add origin and destination",
      cost: 0
    },
    hotel: {
      title: "Stay search ready",
      area: "Destination",
      nights: 0,
      cost: 0
    },
    highlights: [],
    daysPlan: ["Describe the trip you want, and the agent will build flights, lodging, activities, and an estimated budget."],
    costBreakdown: {
      flights: [{ label: "Add origin and destination", cost: 0 }],
      stay: [{ label: "Add destination and trip length", cost: 0 }],
      activities: [{ label: "Activities will appear here", cost: 0 }],
      other: [{ label: "Food and local transport estimate", cost: 0 }]
    },
    lastBrief: "",
    notes: []
  };
}

function formatMoney(cost) {
  return `${trip.currency} ${Number(cost || 0)}`;
}

function renderCostList(element, items) {
  element.innerHTML = "";
  const safeItems = Array.isArray(items) && items.length ? items : [{ label: "Not planned yet", cost: 0 }];
  safeItems.forEach((item) => {
    const row = document.createElement("li");
    const label = document.createElement("span");
    const cost = document.createElement("strong");
    label.textContent = item.label || "Expense";
    cost.textContent = formatMoney(item.cost);
    row.append(label, cost);
    element.append(row);
  });
}

function fallbackCostBreakdown() {
  return {
    flights: [{ label: trip.flight.route || "Flight estimate", cost: trip.flight.cost || 0 }],
    stay: [{ label: `${trip.hotel.title || "Stay"} - ${trip.hotel.nights || 0} night${trip.hotel.nights === 1 ? "" : "s"}`, cost: trip.hotel.cost || 0 }],
    activities: trip.highlights.length
      ? trip.highlights.map((item) => ({ label: `Day ${item.day}: ${item.title}`, cost: item.cost || 0 }))
      : [{ label: "Activities estimate", cost: 0 }],
    other: [{ label: "Food and local transport", cost: Math.max(0, (trip.total || 0) - (trip.flight.cost || 0) - (trip.hotel.cost || 0)) }]
  };
}

function setDestinationTheme() {
  const value = trip.isEmpty ? "blank" : trip.destination.toLowerCase();
  dom.destinationCard.dataset.destination = value.includes("honolulu") || value.includes("hawaii")
    ? "island"
    : value.includes("tokyo")
      ? "city-night"
      : value.includes("paris")
        ? "classic"
        : value.includes("new york")
          ? "city"
          : value.includes("lisbon")
            ? "coast"
            : "custom";
  dom.destinationHero.textContent = trip.isEmpty ? "Where to?" : trip.destination;
}

function addMessage(role, text, tools = []) {
  const article = document.createElement("article");
  article.className = `message ${role}`;

  const paragraph = document.createElement("p");
  paragraph.textContent = text;
  article.append(paragraph);

  if (tools.length) {
    const row = document.createElement("div");
    row.className = "tool-row";
    tools.forEach((tool) => {
      const chip = document.createElement("span");
      chip.textContent = toolLabels[tool] || tool;
      row.append(chip);
    });
    article.append(row);
  }

  dom.messages.append(article);
  dom.messages.scrollTop = dom.messages.scrollHeight;
}

function setToolState(tools, summary) {
  const safeTools = Array.isArray(tools) ? tools : [];
  dom.toolCards.forEach((card) => {
    const name = card.dataset.tool;
    card.classList.toggle("active", safeTools.includes(name));
    if (safeTools.includes(name)) {
      card.classList.add("done");
      card.querySelector("p").textContent = toolDetails[name] || "Ran this planning step for the latest answer.";
    }
  });

  dom.agentStatus.textContent = safeTools.length
    ? `Updated ${safeTools.map((tool) => toolLabels[tool] || tool).join(" + ")}`
    : "Answered from trip memory";
  dom.agentExplainer.textContent = summary || "The agent answered from the current trip plan.";
}

function resetToolState() {
  dom.toolCards.forEach((card) => {
    const name = card.dataset.tool;
    card.classList.remove("active", "done");
    card.querySelector("p").textContent = defaultToolCopy[name] || "Ready for the next planning step.";
  });

  dom.agentStatus.textContent = "Ready for a new trip";
  dom.agentExplainer.textContent = "Tell the agent where you want to go, who is traveling, when, and what kind of trip you want.";
}

function renderTrip() {
  if (trip.isEmpty) {
    dom.tripTitle.textContent = "Plan a new trip";
    dom.tripSubtitle.textContent = "Tell the agent where you want to go, who is traveling, and what kind of trip you want.";
    dom.tripPrefs.innerHTML = "";
    ["origin", "travelers", "budget", "dates"].forEach((item) => {
      const chip = document.createElement("span");
      chip.textContent = item;
      dom.tripPrefs.append(chip);
    });
  } else {
    const budgetLabel = trip.budget === "budget"
      ? "budget-conscious"
      : trip.budget === "flexible"
        ? "flexible budget"
        : trip.budget;
    dom.tripTitle.textContent = `${trip.destination} - ${trip.days} day${trip.days === 1 ? "" : "s"}`;
    dom.tripSubtitle.textContent = `${trip.travelers} traveler${trip.travelers === 1 ? "" : "s"} - ${budgetLabel} - ${trip.style}`;
    dom.tripPrefs.innerHTML = "";
    [trip.origin, `${trip.travelers} traveler${trip.travelers === 1 ? "" : "s"}`, trip.budget, `${trip.days} days`].forEach((item) => {
      const chip = document.createElement("span");
      chip.textContent = item;
      dom.tripPrefs.append(chip);
    });
  }

  dom.tripTotal.textContent = `${trip.currency} ${trip.total}`;
  dom.flightTitle.textContent = trip.flight.title;
  dom.hotelTitle.textContent = trip.hotel.title;
  dom.routeOrigin.textContent = trip.origin;
  dom.routeStay.textContent = trip.hotel.area || "Stay";
  dom.routeDestination.textContent = trip.destination;
  setDestinationTheme();

  const costBreakdown = trip.costBreakdown || fallbackCostBreakdown();
  renderCostList(dom.flightCosts, costBreakdown.flights);
  renderCostList(dom.stayCosts, costBreakdown.stay);
  renderCostList(dom.activityCosts, costBreakdown.activities);
  renderCostList(dom.otherCosts, costBreakdown.other);

  dom.timeline.innerHTML = "";
  trip.daysPlan.forEach((plan, index) => {
    const item = document.createElement("article");
    const label = document.createElement("strong");
    const text = document.createElement("p");
    label.textContent = `Day ${index + 1}`;
    text.textContent = plan;
    item.append(label, text);
    dom.timeline.append(item);
  });
}

function applyTrip(nextTrip) {
  Object.keys(trip).forEach((key) => delete trip[key]);
  Object.assign(trip, nextTrip);
}

function resetPlanner() {
  applyTrip(createBlankTripState());
  dom.messages.innerHTML = "";
  dom.agentMode.textContent = "Local";
  dom.input.value = "";
  renderTrip();
  resetToolState();
  addMessage(
    "agent",
    "Fresh slate. Tell me the destination, origin, group size, trip length, budget, and what you want to do each day."
  );
  dom.input.focus();
}

async function callServerAgent(text) {
  if (location.protocol === "file:") return null;

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trip, message: text })
  });

  if (!response.ok) throw new Error(`Server returned ${response.status}`);
  return response.json();
}

async function handlePrompt(text, shouldEchoUser = true) {
  if (shouldEchoUser) addMessage("user", text);
  if (trip.isEmpty) delete trip.isEmpty;

  let result;
  try {
    const serverAnswer = await callServerAgent(text);
    if (serverAnswer?.trip && serverAnswer?.result) {
      applyTrip(serverAnswer.trip);
      result = serverAnswer.result;
      dom.agentMode.textContent = serverAnswer.mode === "ai-gateway" ? "AI Gateway" : "Local";
    }
  } catch (error) {
    dom.agentMode.textContent = "Local";
  }

  if (!result) {
    result = answerQuestion(trip, text);
    dom.agentMode.textContent = "Local";
  }

  renderTrip();
  setToolState(result.tools, result.summary);
  addMessage("agent", result.text, result.tools || []);
}

dom.composer.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = dom.input.value.trim();
  if (!value) return;
  handlePrompt(value);
  dom.input.value = "";
});

dom.input.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" || event.shiftKey) return;
  event.preventDefault();
  const value = dom.input.value.trim();
  if (!value) return;
  handlePrompt(value);
  dom.input.value = "";
});

dom.quickActions.forEach((button) => {
  button.addEventListener("click", () => {
    handlePrompt(button.dataset.prompt);
  });
});

dom.cheaperBtn.addEventListener("click", () => {
  handlePrompt("Make it cheaper");
});

dom.resetBtn.addEventListener("click", resetPlanner);

renderTrip();
