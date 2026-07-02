(() => {
  const destinationProfiles = {
    hawaii: {
      display: "Honolulu",
      region: "Hawaii",
      airport: "HNL",
      hotel: "Waikiki Shoreline Hotel",
      hotelArea: "Waikiki",
      baseFlight: 520,
      nightlyHotel: 340,
      activities: [
        "Waikiki beach welcome swim",
        "Diamond Head sunrise hike",
        "Pearl Harbor and downtown Honolulu",
        "North Shore food trucks and surf watch",
        "Manoa Falls rainforest walk",
        "Sunset catamaran sail"
      ]
    },
    honolulu: null,
    lisbon: {
      display: "Lisbon",
      region: "Portugal",
      airport: "LIS",
      hotel: "Hotel Baixa",
      hotelArea: "Baixa",
      baseFlight: 640,
      nightlyHotel: 180,
      activities: [
        "Pasteis de nata in Belem",
        "Time Out Market crawl",
        "Tram 28 and Alfama viewpoints",
        "Tile Museum and riverside walk",
        "Sintra day trip",
        "Fado dinner in Mouraria"
      ]
    },
    paris: {
      display: "Paris",
      region: "France",
      airport: "CDG",
      hotel: "Left Bank Garden Hotel",
      hotelArea: "Saint-Germain",
      baseFlight: 760,
      nightlyHotel: 260,
      activities: [
        "Seine walk and Eiffel Tower picnic",
        "Louvre highlights tour",
        "Montmartre food crawl",
        "Versailles gardens",
        "Le Marais shopping and falafel",
        "Evening jazz club"
      ]
    },
    tokyo: {
      display: "Tokyo",
      region: "Japan",
      airport: "HND",
      hotel: "Shinjuku Rail Hotel",
      hotelArea: "Shinjuku",
      baseFlight: 930,
      nightlyHotel: 220,
      activities: [
        "Shibuya crossing and ramen night",
        "Tsukiji breakfast and teamLab",
        "Asakusa temples and river cruise",
        "Harajuku and Meiji Shrine",
        "Kamakura day trip",
        "Izakaya crawl in Shinjuku"
      ]
    },
    newyork: {
      display: "New York",
      region: "New York",
      airport: "JFK",
      hotel: "Midtown Loop Hotel",
      hotelArea: "Midtown",
      baseFlight: 360,
      nightlyHotel: 280,
      activities: [
        "Central Park and Met Museum",
        "Brooklyn food walk",
        "Broadway night",
        "Statue ferry and downtown",
        "High Line and Chelsea Market",
        "Jazz in the Village"
      ]
    }
  };

  destinationProfiles.honolulu = destinationProfiles.hawaii;

  const toolDetails = {
    parse_trip_request: "Extracted destination, origin, travelers, days, budget, and activity preferences from the chat.",
    search_flights: "Generated realistic mock flight options from the origin to the destination airport.",
    search_hotels: "Picked a fake hotel that matches the destination, group size, and budget style.",
    find_activities: "Created one activity per day using the destination profile and user preferences.",
    estimate_budget: "Recomputed flights, lodging, activities, food, and local transport.",
    build_itinerary: "Rebuilt the day-by-day trip artifact from the latest trip state.",
    save_to_trip: "Saved the updated plan into the visible itinerary."
  };

  function createTripState() {
    const trip = {
      destination: "Honolulu",
      region: "Hawaii",
      destinationKey: "hawaii",
      origin: "SFO",
      airport: "HNL",
      days: 6,
      travelers: 4,
      budget: "flexible",
      style: "different activity every day",
      total: 0,
      currency: "USD",
      flight: {},
      hotel: {},
      highlights: [],
      daysPlan: [],
      lastBrief: "Trip for 4 to Hawaii, fly from SF to Honolulu, different activity every day, 6 days, flexible budget.",
      notes: [
        "This demo uses generated mock travel data.",
        "The chat can create a new trip or edit the visible plan.",
        "Flights, prices, hotels, and activities are plausible placeholders, not live quotes."
      ]
    };

    buildTrip(trip);
    return trip;
  }

  function normalize(text) {
    return text.toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
  }

  function includesAny(text, words) {
    return words.some((word) => text.includes(word));
  }

  function titleCase(value) {
    return value
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word[0].toUpperCase() + word.slice(1))
      .join(" ");
  }

  function detectOrigin(raw, normalized) {
    const airportMatch = raw.match(/\b([A-Z]{3})\b/);
    if (airportMatch) return airportMatch[1];
    if (includesAny(normalized, ["sf", "san francisco", "sfo"])) return "SFO";
    if (includesAny(normalized, ["new york", "nyc"])) return "JFK";
    if (normalized.includes("la ") || normalized.includes("los angeles") || normalized.includes("lax")) return "LAX";
    return null;
  }

  function detectDestination(raw, normalized) {
    if (includesAny(normalized, ["hawaii", "honolulu", "oahu"])) return destinationProfiles.hawaii;
    if (normalized.includes("lisbon")) return destinationProfiles.lisbon;
    if (normalized.includes("paris")) return destinationProfiles.paris;
    if (normalized.includes("tokyo")) return destinationProfiles.tokyo;
    if (includesAny(normalized, ["new york", "nyc"])) return destinationProfiles.newyork;

    const toMatch = raw.match(/\bto\s+([a-zA-Z\s]+?)(?:,| for | from | fly | i want | i am | im | there|$)/i);
    if (!toMatch) return null;

    const display = titleCase(toMatch[1].trim());
    return {
      display,
      region: display,
      airport: display.slice(0, 3).toUpperCase(),
      hotel: `${display} Central Hotel`,
      hotelArea: "central district",
      baseFlight: 620,
      nightlyHotel: 230,
      activities: [
        `${display} arrival walk`,
        `${display} food tour`,
        `${display} museum afternoon`,
        `${display} scenic lookout`,
        `${display} local market`,
        `${display} sunset dinner`
      ]
    };
  }

  function extractTripRequest(rawText) {
    const normalized = normalize(rawText);
    const profile = detectDestination(rawText, normalized);
    const origin = detectOrigin(rawText, normalized);
    const daysMatch = normalized.match(/\b(\d+)\s*(day|days|night|nights)\b/);
    const travelersMatch = normalized.match(/\b(?:for|trip for|group of)\s*(\d+)\b/) || normalized.match(/\b(\d+)\s*(people|travelers|friends|adults)\b/);

    const budget = includesAny(normalized, ["flexible", "splurge", "luxury"])
      ? "flexible"
      : includesAny(normalized, ["cheap", "cheaper", "budget", "low cost"])
        ? "budget"
        : includesAny(normalized, ["mid", "moderate"])
          ? "mid-budget"
          : null;

    const styleParts = [];
    if (includesAny(normalized, ["different activity", "activity every day", "every day"])) styleParts.push("different activity every day");
    if (includesAny(normalized, ["beach", "swim", "surf"])) styleParts.push("beach time");
    if (includesAny(normalized, ["food", "foodie", "restaurants"])) styleParts.push("food-focused");
    if (includesAny(normalized, ["hike", "adventure", "outdoor"])) styleParts.push("outdoorsy");
    if (includesAny(normalized, ["relax", "chill", "slow"])) styleParts.push("relaxed pace");

    return {
      profile,
      origin,
      days: daysMatch ? Number(daysMatch[1]) : null,
      travelers: travelersMatch ? Number(travelersMatch[1]) : null,
      budget,
      style: styleParts.length ? styleParts.join(", ") : null
    };
  }

  function hasTripRequest(rawText) {
    const text = normalize(rawText);
    return Boolean(
      detectDestination(rawText, text) ||
      text.match(/\b\d+\s*(day|days|night|nights)\b/) ||
      text.match(/\b(?:for|group of)\s*\d+\b/) ||
      includesAny(text, ["plan", "trip", "fly from", "flight from", "itinerary"])
    );
  }

  function applyTripRequest(trip, rawText) {
    const parsed = extractTripRequest(rawText);
    if (parsed.profile) {
      trip.destination = parsed.profile.display;
      trip.region = parsed.profile.region;
      trip.airport = parsed.profile.airport;
      trip.destinationKey = normalize(parsed.profile.region).replace(/\s/g, "");
    }
    if (parsed.origin) trip.origin = parsed.origin;
    if (parsed.days) trip.days = Math.max(1, Math.min(parsed.days, 14));
    if (parsed.travelers) trip.travelers = Math.max(1, Math.min(parsed.travelers, 12));
    if (parsed.budget) trip.budget = parsed.budget;
    if (parsed.style) trip.style = parsed.style;
    trip.lastBrief = rawText;
    buildTrip(trip);
  }

  function currentProfile(trip) {
    const key = normalize(trip.region).replace(/\s/g, "");
    if (key.includes("hawaii") || key.includes("honolulu")) return destinationProfiles.hawaii;
    if (key.includes("lisbon")) return destinationProfiles.lisbon;
    if (key.includes("paris")) return destinationProfiles.paris;
    if (key.includes("tokyo")) return destinationProfiles.tokyo;
    if (key.includes("newyork")) return destinationProfiles.newyork;
    return {
      display: trip.destination,
      region: trip.region,
      airport: trip.airport,
      hotel: `${trip.destination} Central Hotel`,
      hotelArea: "central district",
      baseFlight: 620,
      nightlyHotel: 230,
      activities: [
        `${trip.destination} arrival walk`,
        `${trip.destination} food tour`,
        `${trip.destination} museum afternoon`,
        `${trip.destination} scenic lookout`,
        `${trip.destination} local market`,
        `${trip.destination} sunset dinner`
      ]
    };
  }

  function budgetMultiplier(trip) {
    if (trip.budget === "budget") return 0.78;
    if (trip.budget === "flexible") return 1.18;
    return 1;
  }

  function buildTrip(trip) {
    const profile = currentProfile(trip);
    const activities = [...profile.activities];
    if (trip.style.includes("beach")) activities[2] = "Beach feature activity";
    if (trip.style.includes("food")) activities[1] = `${trip.destination} food crawl`;
    if (trip.style.includes("outdoorsy")) activities[2] = "Outdoor adventure day";
    if (trip.style.includes("relaxed")) activities[2] = "Slow cafe and scenic viewpoint day";

    const multiplier = budgetMultiplier(trip);
    const nights = Math.max(1, trip.days - 1);
    const flightCost = Math.round(profile.baseFlight * multiplier * trip.travelers);
    const hotelCost = Math.round(profile.nightlyHotel * multiplier * nights * Math.max(1, Math.ceil(trip.travelers / 2)));
    const activityCost = Math.round(85 * multiplier * trip.days * trip.travelers);
    const foodTransitCost = Math.round(75 * multiplier * trip.days * trip.travelers);

    trip.flight = {
      title: "Flight",
      route: `${trip.origin} to ${profile.airport}`,
      cost: flightCost,
      reason: `A plausible nonstop or one-stop route for ${trip.travelers} traveler${trip.travelers === 1 ? "" : "s"} from ${trip.origin} to ${profile.airport}.`
    };

    trip.hotel = {
      title: profile.hotel,
      area: profile.hotelArea,
      nights,
      cost: hotelCost,
      reason: `A ${trip.budget} stay in ${profile.hotelArea} that keeps the group close to daily activities.`
    };

    trip.daysPlan = Array.from({ length: trip.days }, (_, index) => {
      const activity = activities[index % activities.length];
      if (index === 0) return `Arrive in ${trip.destination}, check in near ${profile.hotelArea}, ${activity.toLowerCase()}.`;
      if (index === trip.days - 1) return `${activity}, relaxed final meal, then buffer time for departure.`;
      return `${activity}, local lunch, and an evening plan matched to the group pace.`;
    });

    trip.highlights = [
      { title: trip.daysPlan[0].split(",")[2]?.trim() || profile.activities[0], day: 1, cost: Math.round(45 * multiplier * trip.travelers) },
      { title: activities[1 % activities.length], day: Math.min(2, trip.days), cost: Math.round(70 * multiplier * trip.travelers) }
    ];

    trip.total = flightCost + hotelCost + activityCost + foodTransitCost;
  }

  function rebuildResponse(trip, text, summary) {
    buildTrip(trip);
    return {
      text,
      tools: ["parse_trip_request", "search_flights", "search_hotels", "find_activities", "estimate_budget", "build_itinerary", "save_to_trip"],
      summary
    };
  }

  function makeTripCheaper(trip) {
    trip.budget = "budget";
    buildTrip(trip);
    return rebuildResponse(
      trip,
      `Done. I moved this to a budget-conscious version: cheaper lodging, lower-cost activities, and a new estimate of ${trip.currency} ${trip.total}.`,
      "The agent changed the budget tier, regenerated hotel/activity costs, and saved the updated plan."
    );
  }

  function makeTripFlexible(trip) {
    trip.budget = "flexible";
    buildTrip(trip);
    return rebuildResponse(
      trip,
      `Done. I made the plan more flexible: nicer lodging, room for paid experiences, and a new estimate of ${trip.currency} ${trip.total}.`,
      "The agent changed the budget tier upward and rebuilt the mock itinerary."
    );
  }

  function addActivityPreference(trip, preference) {
    trip.style = `${trip.style}, ${preference}`.replace(/^,\s*/, "");
    const insertDay = Math.min(2, trip.days - 1);
    trip.daysPlan[insertDay] = `${titleCase(preference)} feature activity, local lunch, and an evening plan matched to the group pace.`;
    trip.highlights[1] = { title: `${titleCase(preference)} activity`, day: insertDay + 1, cost: Math.round(65 * budgetMultiplier(trip) * trip.travelers) };
    return {
      text: `Added a ${preference} angle and updated day ${insertDay + 1}. The trip now keeps ${trip.style} in mind.`,
      tools: ["find_activities", "estimate_budget", "build_itinerary", "save_to_trip"],
      summary: "The agent treated the follow-up as an itinerary edit and changed the day-by-day plan."
    };
  }

  function changeDays(trip, rawText) {
    const match = normalize(rawText).match(/\b(\d+)\s*(day|days|night|nights)\b/);
    if (!match) return null;
    trip.days = Math.max(1, Math.min(Number(match[1]), 14));
    return rebuildResponse(
      trip,
      `Updated the trip to ${trip.days} day${trip.days === 1 ? "" : "s"} and rebuilt the flights, hotel nights, activities, and estimate.`,
      "The agent changed trip length and regenerated the artifact."
    );
  }

  function answerQuestion(trip, rawText) {
    const text = normalize(rawText);

    const changedDays = changeDays(trip, rawText);
    if (changedDays && includesAny(text, ["make", "change", "switch", "update", "instead"])) return changedDays;

    if (hasTripRequest(rawText) && !includesAny(text, ["why", "what is included", "how much", "budget breakdown"])) {
      applyTripRequest(trip, rawText);
      return {
        text: `Built a ${trip.days}-day ${trip.destination} trip for ${trip.travelers} traveler${trip.travelers === 1 ? "" : "s"}, flying ${trip.flight.route}. I made up plausible flights, lodging, daily activities, and a ${trip.currency} ${trip.total} estimate. You can ask me to change any part of it.`,
        tools: ["parse_trip_request", "search_flights", "search_hotels", "find_activities", "estimate_budget", "build_itinerary", "save_to_trip"],
        summary: "The agent parsed the prompt, generated fake trip data, and rebuilt the whole itinerary artifact."
      };
    }

    if (includesAny(text, ["cheaper", "lower budget", "save money", "less expensive", "budget version"])) return makeTripCheaper(trip);
    if (includesAny(text, ["luxury", "nicer", "splurge", "flexible budget", "upgrade"])) return makeTripFlexible(trip);
    if (includesAny(text, ["beach", "swim", "surf"])) return addActivityPreference(trip, "beach");
    if (includesAny(text, ["hike", "adventure", "outdoor"])) return addActivityPreference(trip, "outdoorsy");
    if (includesAny(text, ["food", "restaurant", "foodie"])) return addActivityPreference(trip, "food-focused");
    if (includesAny(text, ["relax", "chill", "slow"])) return addActivityPreference(trip, "relaxed pace");

    if (includesAny(text, ["what is happening", "whats happening", "what are you doing", "how does this work", "agent doing", "tool"])) {
      return {
        text: "I parse your trip request, create fake but plausible flights/hotel/prices, build one activity per day, and update the visible trip artifact. Follow-up messages can change destination, days, budget, activities, hotel style, or the itinerary.",
        tools: ["parse_trip_request", "build_itinerary"],
        summary: "This explains the local fake-agent workflow."
      };
    }

    if (includesAny(text, ["budget", "cost", "price", "included", "total", "breakdown"])) {
      return {
        text: `The current estimate is ${trip.currency} ${trip.total}: ${trip.currency} ${trip.flight.cost} flights, ${trip.currency} ${trip.hotel.cost} lodging, plus mock activities, food, and local transport for ${trip.travelers} traveler${trip.travelers === 1 ? "" : "s"}.`,
        tools: ["estimate_budget"],
        summary: "The agent answered from the current trip budget state."
      };
    }

    if (includesAny(text, ["flight", "fly", "airport"])) {
      return {
        text: `The mock flight is ${trip.flight.route} at ${trip.currency} ${trip.flight.cost} total for the group. ${trip.flight.reason}`,
        tools: ["search_flights", "estimate_budget"],
        summary: "The agent explained the generated flight choice."
      };
    }

    if (includesAny(text, ["hotel", "stay", "lodging", "where should we stay"])) {
      return {
        text: `${trip.hotel.title} is the current mock hotel in ${trip.hotel.area}. It is ${trip.currency} ${trip.hotel.cost} for ${trip.hotel.nights} night${trip.hotel.nights === 1 ? "" : "s"}. ${trip.hotel.reason}`,
        tools: ["search_hotels"],
        summary: "The agent explained the generated hotel choice."
      };
    }

    const dayMatch = text.match(/\bday\s*(\d+)\b/);
    if (dayMatch) {
      const day = Math.max(1, Math.min(Number(dayMatch[1]), trip.days));
      return {
        text: `Day ${day}: ${trip.daysPlan[day - 1]}`,
        tools: ["build_itinerary"],
        summary: "The agent answered from the current day-by-day itinerary."
      };
    }

    return {
      text: `I can build or edit a trip. Try: "Trip for 4 to Hawaii, fly from SF to Honolulu, different activity every day, 6 days, flexible budget." Then ask me to make it cheaper, add beach time, change to 5 days, upgrade the hotel, or explain the budget.`,
      tools: [],
      summary: "The agent offered examples because it did not find a specific travel-planning intent."
    };
  }

  const target = typeof window !== "undefined" ? window : globalThis;
  target.TravelAgentCore = {
    answerQuestion,
    createTripState,
    toolDetails
  };
})();
