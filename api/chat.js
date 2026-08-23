// Vercel serverless function -- POST /api/chat
// Mirrors callClaudeChat() in server.js: a real back-and-forth advisor
// conversation, separate from the structured AI Search parser above.
const { anthropicRequest } = require('./_lib/anthropic');

const MODEL = 'claude-haiku-4-5-20251001';

const CHAT_SYSTEM_PROMPT = `You are the Massagetae chat advisor, embedded in a buyer-side tool for scoring government land/property auctions in Tashkent and Samarkand, Uzbekistan.

You help buyers think through auction decisions: interpreting opportunity scores, comparing categories (shop, hospital, pharmacy, warehouse, school, restaurant, hotel), weighing infrastructure/demand tradeoffs, and general questions about how the platform's scoring works. You are not a licensed financial or legal advisor -- for binding legal, tax, or investment decisions, tell the person to consult a qualified professional.

Keep answers conversational and concise (a few sentences unless they ask for depth). This is a prototype with illustrative data, not a live feed of e-auksion.uz -- say so if someone asks whether a specific listing is real.`;

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'method not allowed' }); return; }
  try {
    const messages = Array.isArray(req.body && req.body.messages) ? req.body.messages : [];
    const clean = messages
      .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
      .slice(-40) // cap history sent per request -- keeps cost/latency bounded
      .map(m => ({ role: m.role, content: m.content.trim().slice(0, 4000) }));
    if (!clean.length || clean[clean.length - 1].role !== 'user') {
      throw new Error('messages must end with a non-empty user turn');
    }
    const json = await anthropicRequest({
      model: MODEL,
      max_tokens: 600,
      system: CHAT_SYSTEM_PROMPT,
      messages: clean
    });
    const reply = json.content && json.content[0] && json.content[0].text;
    if (!reply) throw new Error('empty reply');
    res.status(200).json({ reply });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
};
