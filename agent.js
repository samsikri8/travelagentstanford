export function createTripState() {
  return {
    destination: "Lisbon",
    days: 4,
    travelers: 2,
    style: "food-first, mid-budget",
    total: 820,
    flight: {
      title: "Flight",
      route: "SFO to LIS",
      cost: 410,
      reason: "It keeps the total under the mid-budget target while leaving enough room for a central hotel and food experiences."
    },
    hotel: {
      title: "Hotel Baixa",
      area: "Baixa",
      nights: 3,
      cost: 240,
      reason: "Baixa is central, flat enough for easy walking, close to transit, and convenient for Alfama, Chiado, and the river."
    },
    highlights: [
      { title: "Time Out Market", day: 2, cost: 25 },
      { title: "Tram 28 + Alfama", day: 3, cost: 0 }
    ],
    daysPlan: [
      "Arrive, pasteis de nata in Belem, sunset at Miradouro.",
      "Market crawl, Time Out Market, Bairro Alto bars.",
      "Tram 28, Alfama viewpoints, fado dinner.",
      "Tile museum, riverside walk, late flight home."
    ],
    notes: [
      "The demo uses local mock travel data, not live booking APIs.",
      "Every answer is generated from the trip state in agent.js.",
      "Refinements update the visible trip artifact so the UI behaves like an agent workspace."
    ]
  };
}

export const toolDetails = {
  search_flights: "Checked route, rough cost, and whether the flight leaves budget for the rest of the trip.",
  search_hotels: "Compared central neighborhoods, nightly cost, walking convenience, and transit access.",
  find_activities: "Looked for food, neighborhood, beach, and low-cost activities that fit the day-by-day pace.",
  recommend_food: "Adjusted restaurants and markets around the food-first preference.",
  estimate_budget: "Recomputed flight, hotel, activity, and daily spend estimates.",
  build_itinerary: "Reassembled the day-by-day plan so nearby stops happen together.",
  geocode_place: "Placed neighborhoods and day stops on the map preview.",
  save_to_trip: "Saved the new plan back into the visible trip artifact."
};

function normalize(text) {
  return text.toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
}

function includesAny(text, words) {
  return words.some((word) => text.includes(word));
}

function makeDayTwoCheaper(trip) {
  trip.total = 780;
  trip.highlights[0] = { title: "Campo de Ourique Market", day: 2, cost: 12 };
  trip.daysPlan[1] = "Market crawl, miradouro picnic, Bairro Alto bars.";
  return {
    text: "I replaced the guided food stop with a self-guided Campo de Ourique market crawl, kept the evening in Bairro Alto, and trimmed the estimate to EUR 780.",
    tools: ["recommend_food", "estimate_budget", "save_to_trip"],
    summary: "The agent changed an activity, recalculated budget, and saved the updated day 2 plan into the artifact."
  };
}

function addBeachAfternoon(trip) {
  trip.daysPlan[3] = "Cascais beach afternoon, riverside dinner, late flight home.";
  return {
    text: "I added Cascais on day 4. It works best there because the train is simple, the beach stop does not crowd the food-heavy days, and it still leaves time for the late flight.",
    tools: ["find_activities", "geocode_place", "build_itinerary"],
    summary: "The agent found a nearby beach option, placed it in the lowest-friction day, and rebuilt the day-by-day plan."
  };
}

function makeVegetarianFriendly(trip) {
  trip.daysPlan[1] = "Vegetarian-friendly market crawl, plant-forward petiscos, Bairro Alto bars.";
  return {
    text: "I shifted day 2 toward vegetarian-friendly markets, bakeries, and plant-forward petiscos while keeping the food-first feel.",
    tools: ["recommend_food", "find_activities", "build_itinerary"],
    summary: "The agent used dietary preference as a planning constraint and updated meal-focused stops."
  };
}

export function answerQuestion(trip, rawText) {
  const text = normalize(rawText);

  if (includesAny(text, ["cheaper", "lower budget", "save money", "less expensive"])) {
    return makeDayTwoCheaper(trip);
  }

  if (includesAny(text, ["beach", "cascais", "swim", "ocean"])) {
    return addBeachAfternoon(trip);
  }

  if (includesAny(text, ["vegetarian", "veggie", "dietary", "no meat"])) {
    return makeVegetarianFriendly(trip);
  }

  if (includesAny(text, ["what is happening", "whats happening", "what are you doing", "how does this work", "agent doing", "tool"])) {
    return {
      text: "I am acting like a lightweight travel agent: I classify your request, choose mock tools, update the trip state in the browser, and then re-render the itinerary artifact. No external API is being called yet.",
      tools: ["build_itinerary", "save_to_trip"],
      summary: "This answer explains the demo architecture: intent detection, simulated tools, trip-state updates, and artifact rendering."
    };
  }

  if (includesAny(text, ["budget", "cost", "price", "included", "total", "eur"])) {
    return {
      text: `The current estimate is EUR ${trip.total}: EUR ${trip.flight.cost} for flights, EUR ${trip.hotel.cost} for ${trip.hotel.nights} hotel nights, and the rest for activities, local transit, and food. It is a planning estimate, not a live quote.`,
      tools: ["estimate_budget"],
      summary: "The agent answered from the current budget state and broke down the estimate."
    };
  }

  if (includesAny(text, ["flight", "fly", "airport", "sfo", "lis"])) {
    return {
      text: `${trip.flight.route} is the flight placeholder. I chose it because ${trip.flight.reason} In a production version this would come from a flight search API.`,
      tools: ["search_flights", "estimate_budget"],
      summary: "The agent reviewed the flight choice and connected it to the budget constraint."
    };
  }

  if (includesAny(text, ["hotel", "stay", "baixa", "central", "neighborhood", "where should i stay"])) {
    return {
      text: `${trip.hotel.title} is the current stay. ${trip.hotel.reason} If you wanted more nightlife, I would compare Chiado or Bairro Alto next.`,
      tools: ["search_hotels", "geocode_place"],
      summary: "The agent explained why the hotel location fits the trip profile."
    };
  }

  if (includesAny(text, ["day 1", "first day", "arrival"])) {
    return {
      text: `Day 1 is intentionally gentle: ${trip.daysPlan[0]} It avoids over-planning after the long flight from SFO.`,
      tools: ["build_itinerary"],
      summary: "The agent answered from the day-by-day itinerary."
    };
  }

  if (includesAny(text, ["day 2", "second day", "market", "food"])) {
    return {
      text: `Day 2 is the food-led day: ${trip.daysPlan[1]} I grouped these stops because they fit the foodie preference without too much transit time.`,
      tools: ["recommend_food", "build_itinerary"],
      summary: "The agent explained the logic behind the food-focused day."
    };
  }

  if (includesAny(text, ["day 3", "third day", "alfama", "tram"])) {
    return {
      text: `Day 3 is the classic Lisbon wandering day: ${trip.daysPlan[2]} It is lower cost and balances the more food-heavy day 2.`,
      tools: ["find_activities", "build_itinerary"],
      summary: "The agent explained how day 3 balances the itinerary."
    };
  }

  if (includesAny(text, ["day 4", "last day", "final day"])) {
    return {
      text: `Day 4 is flexible: ${trip.daysPlan[3]} I keep this lighter because departure-day plans need more buffer.`,
      tools: ["build_itinerary", "estimate_budget"],
      summary: "The agent answered from the current final-day plan."
    };
  }

  if (includesAny(text, ["real api", "mock", "data", "code", "github", "production"])) {
    return {
      text: `${trip.notes.join(" ")} The GitHub repo contains the browser code that powers these responses and artifact updates.`,
      tools: [],
      summary: "The agent answered from implementation notes baked into the demo."
    };
  }

  return {
    text: "I can answer questions about the current Lisbon plan, budget, hotel choice, flight choice, day-by-day itinerary, mock tool calls, or what the agent is doing behind the scenes. Try asking: 'why this hotel?', 'what is included in the budget?', or 'what are you doing right now?'",
    tools: [],
    summary: "The agent did not find a specific travel intent, so it offered useful questions it can handle."
  };
}
