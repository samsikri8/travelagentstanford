await import("../agent.js");

const { answerQuestion, createTripState } = globalThis.TravelAgentCore;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const trip = createTripState();

const build = answerQuestion(
  trip,
  "Trip for 4 to Hawaii, fly from SF to Honolulu, I want to do a different activity every day, I am there for 6 days, my budget is flexible"
);
assert(build.text.includes("6-day Honolulu trip"), "Initial prompt should build a Honolulu trip.");
assert(trip.destination === "Honolulu", "Trip destination should be Honolulu.");
assert(trip.origin === "SFO", "Trip origin should normalize SF to SFO.");
assert(trip.travelers === 4, "Trip should capture 4 travelers.");
assert(trip.days === 6, "Trip should capture 6 days.");
assert(trip.daysPlan.length === 6, "Trip should generate one plan per day.");
assert(build.tools.includes("parse_trip_request"), "Initial prompt should parse the trip request.");

const budget = answerQuestion(trip, "What is included in the budget?");
assert(budget.text.includes("USD"), "Budget answer should use USD.");
assert(budget.tools.includes("estimate_budget"), "Budget answer should run estimate_budget.");

const hotel = answerQuestion(trip, "Why did you pick this hotel?");
assert(hotel.text.includes(trip.hotel.title), "Hotel answer should explain the selected hotel.");
assert(hotel.tools.includes("search_hotels"), "Hotel answer should run search_hotels.");

const fiveDays = answerQuestion(trip, "Make it 5 days instead");
assert(trip.days === 5, "Day edit should update trip length.");
assert(trip.daysPlan.length === 5, "Day edit should rebuild the itinerary length.");
assert(fiveDays.tools.includes("build_itinerary"), "Day edit should rebuild itinerary.");

const cheaper = answerQuestion(trip, "Make it cheaper");
assert(trip.budget === "budget", "Cheaper edit should update the budget tier.");
assert(cheaper.text.includes("budget-conscious"), "Cheaper answer should confirm budget-conscious plan.");

const beach = answerQuestion(trip, "Add more beach time");
assert(trip.style.includes("beach"), "Beach edit should update trip style.");
assert(beach.tools.includes("find_activities"), "Beach edit should run activity planning.");

console.log("Agent logic tests passed.");
