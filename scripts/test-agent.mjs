await import("../agent.js");

const { answerQuestion, createTripState } = globalThis.TravelAgentCore;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const trip = createTripState();

const budget = answerQuestion(trip, "What is included in the budget?");
assert(budget.text.includes("EUR 820"), "Budget answer should include the starting total.");
assert(budget.tools.includes("estimate_budget"), "Budget answer should run estimate_budget.");

const hotel = answerQuestion(trip, "Why did you pick this hotel?");
assert(hotel.text.includes("Hotel Baixa"), "Hotel answer should explain the selected hotel.");
assert(hotel.tools.includes("search_hotels"), "Hotel answer should run search_hotels.");

const happening = answerQuestion(trip, "What are you doing right now?");
assert(happening.text.includes("lightweight travel agent"), "Status answer should explain the agent behavior.");

const cheaper = answerQuestion(trip, "Make day 2 cheaper");
assert(trip.total === 780, "Cheaper refinement should update the trip total.");
assert(trip.highlights[0].title === "Campo de Ourique Market", "Cheaper refinement should update day 2 highlight.");
assert(cheaper.tools.includes("save_to_trip"), "Cheaper refinement should save the trip.");

const beach = answerQuestion(trip, "Add one beach afternoon");
assert(trip.daysPlan[3].includes("Cascais"), "Beach refinement should update day 4.");
assert(beach.tools.includes("build_itinerary"), "Beach refinement should rebuild the itinerary.");

console.log("Agent logic tests passed.");
