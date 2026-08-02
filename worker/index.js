// Cloudflare Worker: proxies chatbot questions to the Gemini API.
// The Gemini API key lives only as a Worker secret (GEMINI_API_KEY) —
// it is never sent to, or visible from, the browser.
//
// Deploy: see worker/README.md

const ALLOWED_ORIGINS = new Set([
    "https://krishnateja26.github.io",
    "http://localhost:8791",
    "http://localhost:8792",
    "http://127.0.0.1:8791",
    "http://127.0.0.1:8792"
]);

const PORTFOLIO_DATA_URL = "https://krishnateja26.github.io/KrishnaTeja_Portfolio-/portfolio-data.json";

// gemini-3.6-flash: validated working with this account's key in the Finz Accounting project README.
const GEMINI_MODEL = "gemini-3.6-flash";

function corsHeaders(origin) {
    return {
        "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Vary": "Origin"
    };
}

function buildSystemPrompt(knowledge) {
    const guidance = knowledge.chatbot_guidance || {};

    return [
        `You are KrishnaBot, the portfolio chatbot for ${knowledge.profile?.full_name || "Krishna Teja"}.`,
        `Tone: ${guidance.tone || "professional, concise, helpful, and confident"}.`,
        "Rules:",
        "- Answer ONLY using the knowledge JSON provided below. Never invent employers, dates, achievements, GitHub links, or metrics that are not present in it.",
        "- Keep replies short: 2-5 sentences, or a short numbered list. This is a chat widget, not an essay.",
        "- Plain text only. Do not use markdown formatting (no **bold**, no _italics_, no # headers, no backticks). When you give a numbered list, put EACH item on its own line separated by a real newline character — never run list items together in one paragraph.",
        "- When asked about projects (or a specific technology/domain), pick the 3 most relevant projects from the `projects` array based on overlap with the question. This is REQUIRED, not optional: for every project you mention, you MUST include its exact `github` field value as a bare URL on the same line (and its `live_demo` field value too, if present). If a project has no `github` field, say so rather than omitting the link silently. Never fabricate a link that isn't literally in the data.",
        "- Only answer questions about Krishna Teja's professional background: skills, projects, education, work experience, and how to contact him. If asked about anything else — personal/private topics (age, birthday, religion, relationships, politics, health, etc.), unrelated general knowledge, other people, or opinions — politely decline and redirect to what you can help with. Do not speculate or answer 'I don't know' style questions about topics outside this data; just redirect.",
        "- For contact requests, list the contact form, email, LinkedIn, and GitHub as a numbered list (one per line), using the exact values in the data.",
        "Knowledge JSON:",
        JSON.stringify(knowledge)
    ].join("\n");
}

export default {
    async fetch(request, env) {
        const origin = request.headers.get("Origin") || "";
        const headers = corsHeaders(origin);

        if (request.method === "OPTIONS") {
            return new Response(null, { headers });
        }

        if (request.method !== "POST") {
            return new Response("Method not allowed", { status: 405, headers });
        }

        if (!ALLOWED_ORIGINS.has(origin)) {
            return new Response(JSON.stringify({ error: "origin not allowed" }), {
                status: 403,
                headers: { ...headers, "Content-Type": "application/json" }
            });
        }

        let body;
        try {
            body = await request.json();
        } catch {
            return new Response(JSON.stringify({ error: "invalid json" }), {
                status: 400,
                headers: { ...headers, "Content-Type": "application/json" }
            });
        }

        const message = (body.message || "").toString().slice(0, 800).trim();
        const history = Array.isArray(body.history) ? body.history.slice(-6) : [];

        if (!message) {
            return new Response(JSON.stringify({ error: "empty message" }), {
                status: 400,
                headers: { ...headers, "Content-Type": "application/json" }
            });
        }

        let knowledge;
        try {
            const knowledgeRes = await fetch(PORTFOLIO_DATA_URL, {
                cf: { cacheTtl: 300, cacheEverything: true }
            });
            knowledge = await knowledgeRes.json();
        } catch {
            return new Response(JSON.stringify({ error: "knowledge fetch failed" }), {
                status: 502,
                headers: { ...headers, "Content-Type": "application/json" }
            });
        }

        const contents = [
            ...history.map(turn => ({
                role: turn.role === "user" ? "user" : "model",
                parts: [{ text: String(turn.text || "").slice(0, 500) }]
            })),
            { role: "user", parts: [{ text: message }] }
        ];

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`;

        let geminiRes;
        try {
            geminiRes = await fetch(geminiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    system_instruction: { parts: [{ text: buildSystemPrompt(knowledge) }] },
                    contents,
                    generationConfig: {
                        temperature: 0.4,
                        maxOutputTokens: 1024
                    }
                })
            });
        } catch {
            return new Response(JSON.stringify({ error: "gemini request failed" }), {
                status: 502,
                headers: { ...headers, "Content-Type": "application/json" }
            });
        }

        if (!geminiRes.ok) {
            const errText = await geminiRes.text();
            return new Response(JSON.stringify({ error: "gemini error", detail: errText.slice(0, 300) }), {
                status: 502,
                headers: { ...headers, "Content-Type": "application/json" }
            });
        }

        const data = await geminiRes.json();
        const reply = (data?.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("");

        if (!reply.trim()) {
            return new Response(JSON.stringify({ error: "empty reply" }), {
                status: 502,
                headers: { ...headers, "Content-Type": "application/json" }
            });
        }

        return new Response(JSON.stringify({ reply }), {
            headers: { ...headers, "Content-Type": "application/json" }
        });
    }
};
