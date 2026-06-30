const agentCore = window.TravelAgentCore;

if (!agentCore) {
  throw new Error("TravelAgentCore did not load. Make sure agent.js is included before app.js.");
}

const { answerQuestion, createTripState, toolDetails } = agentCore;

const trip = createTripState();

const dom = {
  messages: document.querySelector("#messages"),
  composer: document.querySelector("#composer"),
  input: document.querySelector("#tripInput"),
  quickActions: document.querySelectorAll("[data-prompt]"),
  cheaperBtn: document.querySelector("#cheaperBtn"),
  tripTotal: document.querySelector("#tripTotal"),
  flightTitle: document.querySelector("#flightTitle"),
  flightMeta: document.querySelector("#flightMeta"),
  hotelTitle: document.querySelector("#hotelTitle"),
  hotelMeta: document.querySelector("#hotelMeta"),
  dayTwoTitle: document.querySelector("#dayTwoTitle"),
  dayTwoCost: document.querySelector("#dayTwoCost"),
  dayOnePlan: document.querySelector("#dayOnePlan"),
  dayTwoPlan: document.querySelector("#dayTwoPlan"),
  dayThreePlan: document.querySelector("#dayThreePlan"),
  dayFourPlan: document.querySelector("#dayFourPlan"),
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
      chip.textContent = tool;
      row.append(chip);
    });
    article.append(row);
  }

  dom.messages.append(article);
  dom.messages.scrollTop = dom.messages.scrollHeight;
}

function setToolState(tools, summary) {
  dom.toolCards.forEach((card) => {
    const name = card.dataset.tool;
    card.classList.toggle("active", tools.includes(name));
    if (tools.includes(name)) {
      card.classList.add("done");
      card.querySelector("p").textContent = toolDetails[name] || "Ran this planning step for the latest answer.";
    }
  });

  dom.agentStatus.textContent = tools.length ? `Ran ${tools.join(" -> ")}` : "Answered from trip memory";
  dom.agentExplainer.textContent = summary;
}

function renderTrip() {
  dom.tripTotal.textContent = `EUR ${trip.total}`;
  dom.flightTitle.textContent = trip.flight.title;
  dom.flightMeta.textContent = `${trip.flight.route} - EUR ${trip.flight.cost}`;
  dom.hotelTitle.textContent = trip.hotel.title;
  dom.hotelMeta.textContent = `${trip.hotel.nights} nights - EUR ${trip.hotel.cost}`;
  dom.dayTwoTitle.textContent = trip.highlights[0].title;
  dom.dayTwoCost.textContent = `Day ${trip.highlights[0].day} - ${trip.highlights[0].cost ? `EUR ${trip.highlights[0].cost}` : "free"}`;
  dom.dayOnePlan.textContent = trip.daysPlan[0];
  dom.dayTwoPlan.textContent = trip.daysPlan[1];
  dom.dayThreePlan.textContent = trip.daysPlan[2];
  dom.dayFourPlan.textContent = trip.daysPlan[3];
}

function handlePrompt(text, shouldEchoUser = true) {
  if (shouldEchoUser) addMessage("user", text);
  const result = answerQuestion(trip, text);
  renderTrip();
  setToolState(result.tools, result.summary);
  addMessage("agent", result.text, result.tools);
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
  handlePrompt("Make day 2 cheaper");
});

renderTrip();
