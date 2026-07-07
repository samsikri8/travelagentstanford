import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

await import("./agent.js");

const { answerQuestion } = globalThis.TravelAgentCore;
const root = fileURLToPath(new URL(".", import.meta.url));

loadDotEnv();

const port = Number(process.env.PORT || 4174);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml"
};

function loadDotEnv() {
  const envPath = join(root, ".env");
  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...valueParts] = trimmed.split("=");
    const value = valueParts.join("=").trim().replace(/^["']|["']$/g, "");
    if (!process.env[key.trim()]) process.env[key.trim()] = value;
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = Buffer.concat(chunks).toString("utf8");
  return body ? JSON.parse(body) : {};
}

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function fallbackTripResponse(trip, message) {
  const result = answerQuestion(trip, message);
  return {
    mode: "local",
    trip,
    result
  };
}

function repairTripShape(previousTrip, candidate) {
  if (!candidate || typeof candidate !== "object") return previousTrip;

  const trip = {
    ...previousTrip,
    ...candidate
  };

  trip.currency ||= "USD";
  trip.travelers = Number(trip.travelers || previousTrip.travelers || 1);
  trip.days = Number(trip.days || previousTrip.days || 1);
  trip.total = Number(trip.total || previousTrip.total || 0);
  trip.flight ||= previousTrip.flight;
  trip.hotel ||= previousTrip.hotel;
  trip.highlights = Array.isArray(trip.highlights) ? trip.highlights : previousTrip.highlights;
  trip.daysPlan = Array.isArray(trip.daysPlan) ? trip.daysPlan : previousTrip.daysPlan;
  trip.costBreakdown = trip.costBreakdown && typeof trip.costBreakdown === "object"
    ? trip.costBreakdown
    : previousTrip.costBreakdown;
  return trip;
}

function repairResultShape(candidate) {
  const result = candidate && typeof candidate === "object" ? candidate : {};
  return {
    text: typeof result.text === "string" && result.text.trim()
      ? result.text
      : "I updated the trip plan. You can keep changing the destination, days, budget, hotel, or activities.",
    tools: Array.isArray(result.tools) ? result.tools.filter((tool) => typeof tool === "string") : [],
    summary: typeof result.summary === "string" ? result.summary : "Updated from the travel planning model."
  };
}

function buildSystemPrompt() {
  return [
    "You are the planning engine for a travel agent web app.",
    "Return only valid JSON, no markdown.",
    "The app uses fake but plausible data unless real data is provided.",
    "Given the previous trip state and a user message, update the trip if requested and answer conversationally.",
    "The response JSON shape must be:",
    "{",
    "  \"trip\": { same fields as previous trip, with updated destination/origin/days/travelers/budget/style/currency/total/flight/hotel/highlights/daysPlan/costBreakdown },",
    "  \"result\": { \"text\": string, \"tools\": string[], \"summary\": string }",
    "}",
    "costBreakdown must include flights, stay, activities, and other arrays. Each item must have label and cost.",
    "Use concise text. For tools, choose from parse_trip_request, search_flights, search_hotels, find_activities, estimate_budget, build_itinerary, save_to_trip.",
    "Keep all prices as whole numbers. Keep daysPlan length equal to trip.days."
  ].join("\n");
}

async function callAiGateway(trip, message) {
  const key = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_AI_GATEWAY_API_KEY;
  if (!key) return null;

  const model = process.env.AI_GATEWAY_MODEL || "openai/gpt-4.1-mini";
  const response = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      stream: false,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: JSON.stringify({ previousTrip: trip, message }) }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI Gateway ${response.status}: ${errorText.slice(0, 300)}`);
  }

  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI Gateway returned no message content.");

  const parsed = JSON.parse(content);
  return {
    mode: "ai-gateway",
    trip: repairTripShape(trip, parsed.trip),
    result: repairResultShape(parsed.result)
  };
}

async function handleChat(req, res) {
  try {
    const { trip, message } = await readJson(req);
    if (!trip || !message) {
      sendJson(res, 400, { error: "Expected { trip, message }." });
      return;
    }

    try {
      const aiResponse = await callAiGateway(trip, message);
      if (aiResponse) {
        sendJson(res, 200, aiResponse);
        return;
      }
    } catch (error) {
      console.warn(error.message);
    }

    sendJson(res, 200, fallbackTripResponse(trip, message));
  } catch (error) {
    sendJson(res, 500, { error: error.message });
  }
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
  const requested = normalize(pathname).replace(/^\/+/, "").replace(/^(\.\.[/\\])+/, "");
  const filePath = join(root, requested);

  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const data = await readFile(filePath);
    res.writeHead(200, { "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

const server = createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/api/chat") {
    await handleChat(req, res);
    return;
  }

  if (req.method === "GET") {
    await serveStatic(req, res);
    return;
  }

  res.writeHead(405);
  res.end("Method not allowed");
});

server.listen(port, () => {
  console.log(`Travel Agent running at http://127.0.0.1:${port}/`);
  console.log(process.env.AI_GATEWAY_API_KEY ? "AI Gateway enabled." : "No AI_GATEWAY_API_KEY found; using local fallback.");
});
