const agentCore = window.TravelAgentCore;

if (!agentCore) {
  throw new Error("TravelAgentCore did not load. Make sure agent.js is included before app.js.");
}

const { answerQuestion, createTripState, toolDetails } = agentCore;

const trip = createTripState();
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
  agentMode: document.querySelector("#agentMode"),
  tripPrefs: document.querySelector("#tripPrefs"),
  tripTitle: document.querySelector("#tripTitle"),
  tripSubtitle: document.querySelector("#tripSubtitle"),
  tripTotal: document.querySelector("#tripTotal"),
  flightTitle: document.querySelector("#flightTitle"),
  flightMeta: document.querySelector("#flightMeta"),
  hotelTitle: document.querySelector("#hotelTitle"),
  hotelMeta: document.querySelector("#hotelMeta"),
  activityOneTitle: document.querySelector("#activityOneTitle"),
  activityOneCost: document.querySelector("#activityOneCost"),
  activityTwoTitle: document.querySelector("#activityTwoTitle"),
  activityTwoCost: document.querySelector("#activityTwoCost"),
  routeOrigin: document.querySelector("#routeOrigin"),
  routeStay: document.querySelector("#routeStay"),
  routeDestination: document.querySelector("#routeDestination"),
  timeline: document.querySelector("#timeline"),
  agentStatus: document.querySelector("#agentStatus"),
  agentExplainer: document.querySelector("#agentExplainer"),
  toolCards: document.querySelectorAll(".tool-card")
};

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

function renderTrip() {
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

  dom.tripTotal.textContent = `${trip.currency} ${trip.total}`;
  dom.flightTitle.textContent = trip.flight.title;
  dom.flightMeta.textContent = `${trip.flight.route} - ${trip.currency} ${trip.flight.cost}`;
  dom.hotelTitle.textContent = trip.hotel.title;
  dom.hotelMeta.textContent = `${trip.hotel.nights} night${trip.hotel.nights === 1 ? "" : "s"} - ${trip.currency} ${trip.hotel.cost}`;
  dom.activityOneTitle.textContent = trip.highlights[0]?.title || "Daily activity";
  dom.activityOneCost.textContent = `Day ${trip.highlights[0]?.day || 1} - ${trip.currency} ${trip.highlights[0]?.cost || 0}`;
  dom.activityTwoTitle.textContent = trip.highlights[1]?.title || "Activity plan";
  dom.activityTwoCost.textContent = `Day ${trip.highlights[1]?.day || 2} - ${trip.currency} ${trip.highlights[1]?.cost || 0}`;
  dom.routeOrigin.textContent = trip.origin;
  dom.routeStay.textContent = trip.hotel.area || "Stay";
  dom.routeDestination.textContent = trip.destination;

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

renderTrip();
