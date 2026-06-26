const messages = document.querySelector("#messages");
const composer = document.querySelector("#composer");
const input = document.querySelector("#tripInput");
const quickActions = document.querySelectorAll("[data-prompt]");
const cheaperBtn = document.querySelector("#cheaperBtn");
const tripTotal = document.querySelector("#tripTotal");
const dayTwoTitle = document.querySelector("#dayTwoTitle");
const dayTwoCost = document.querySelector("#dayTwoCost");
const dayTwoPlan = document.querySelector("#dayTwoPlan");
const toolCards = document.querySelectorAll(".tool-card");

let savedMoney = false;

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

  messages.append(article);
  messages.scrollTop = messages.scrollHeight;
}

function cycleToolState() {
  toolCards.forEach((card) => card.classList.remove("active"));
  const nextIndex = savedMoney ? 3 : 2;
  toolCards[nextIndex].classList.add("active");
  toolCards[nextIndex].classList.add("done");
}

function replanDayTwo() {
  savedMoney = true;
  tripTotal.textContent = "EUR 780";
  dayTwoTitle.textContent = "Campo de Ourique Market";
  dayTwoCost.textContent = "Day 2 - EUR 12";
  dayTwoPlan.textContent = "Market crawl, miradouro picnic, Bairro Alto bars.";
  cycleToolState();
  addMessage("user", "Make day 2 a bit cheaper.");
  addMessage(
    "agent",
    "Done. I replaced the guided food tour with a self-guided market crawl and trimmed the estimate to EUR 780.",
    ["recommend_food", "estimate_budget", "save_to_trip"]
  );
}

function answerPrompt(text) {
  const normalized = text.toLowerCase();
  addMessage("user", text);

  if (normalized.includes("central hotel")) {
    addMessage(
      "agent",
      "I kept Hotel Baixa because it is already the best central tradeoff. A Chiado upgrade adds about EUR 90.",
      ["search_hotels", "estimate_budget"]
    );
    return;
  }

  if (normalized.includes("beach")) {
    addMessage(
      "agent",
      "Added a Cascais afternoon on day 4 before the late flight. The train keeps it low-cost.",
      ["find_activities", "geocode_place", "build_itinerary"]
    );
    return;
  }

  if (normalized.includes("vegetarian")) {
    addMessage(
      "agent",
      "Updated meals toward vegetarian-friendly markets, bakeries, and modern Portuguese spots.",
      ["recommend_food", "build_itinerary"]
    );
    return;
  }

  addMessage(
    "agent",
    "I checked the itinerary against budget, pace, and location. The artifact is ready for another refinement.",
    ["estimate_budget", "build_itinerary"]
  );
}

composer.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = input.value.trim();
  if (!value) return;
  answerPrompt(value);
  input.value = "";
});

quickActions.forEach((button) => {
  button.addEventListener("click", () => {
    answerPrompt(button.dataset.prompt);
  });
});

cheaperBtn.addEventListener("click", replanDayTwo);
