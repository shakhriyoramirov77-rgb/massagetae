// Vercel serverless function -- POST /api/ai-search
// Parses a free-text search query into structured filters. Mirrors
// callClaude() in server.js exactly, just reshaped for Vercel's
// (req, res) function signature instead of Node's raw http server.
const { anthropicRequest } = require('./_lib/anthropic');

const MODEL = 'claude-haiku-4-5-20251001';

const SYSTEM_PROMPT = `You translate a real-estate search query into strict JSON filters for a government land-auction search tool covering Tashkent and Samarkand, Uzbekistan.

Return ONLY a JSON object, no other text, matching exactly this shape:
{"category": string|null, "types": string[], "cities": string[], "priceMin": number|null, "priceMax": number|null, "scoreMin": number|null}

Rules:
- "category" is the buyer's intended building use, one of: shop, hospital, pharmacy, warehouse, school, restaurant, hotel. Use null if none is mentioned.
- "types" is the CURRENT physical asset type of listings to include, any of: "Factory", "Warehouse", "Land", "Retail". Use [] if none is specified (meaning: don't filter by type).
- "cities" is any of "Tashkent", "Samarkand". Use [] if neither city is mentioned (meaning: include both).
- "priceMin"/"priceMax" are in millions of Uzbek so'm. If the user gives a dollar amount, convert using 1 USD = 12700 so'm and express the result in millions of so'm (e.g. $200,000 -> 2540). Use null if not mentioned.
- "scoreMin" is a 0-100 minimum opportunity score threshold if the user asks for "best", "top", or gives an explicit score/opportunity number. Use null if not mentioned. If the user just says "best" with no number, use 70.
- Never include explanation text, markdown, or code fences -- the response body must be valid JSON and nothing else.`;

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'method not allowed' }); return; }
  try {
    const text = (req.body && req.body.text) || '';
    const json = await anthropicRequest({
      model: MODEL,
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: text }]
    });
    const raw = json.content && json.content[0] && json.content[0].text;
    const parsed = JSON.parse(raw);
    res.status(200).json(parsed);
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
};
