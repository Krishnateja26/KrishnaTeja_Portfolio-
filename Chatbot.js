let portfolioKnowledge = null;

async function loadPortfolioData() {
    try {
        const response = await fetch("portfolio-data.json");
        portfolioKnowledge = await response.json();
    } catch (error) {
        console.error("Failed to load portfolio data:", error);
    }
}

function flattenKnowledge(data) {
    const chunks = [];

    if (!data) return chunks;

    if (data.profile) {
        chunks.push({
            section: "profile",
            text: `${data.profile.summary} ${data.profile.current_status} ${data.profile.availability}`
        });
    }

    if (Array.isArray(data.education)) {
        data.education.forEach(item => {
            chunks.push({
                section: "education",
                text: `${item.degree} at ${item.institution}. ${item.notes ? item.notes.join(" ") : ""}`
            });
        });
    }

    if (data.skills) {
        Object.keys(data.skills).forEach(group => {
            chunks.push({
                section: "skills",
                text: `${group}: ${data.skills[group].join(", ")}`
            });
        });
    }

    if (Array.isArray(data.experience)) {
        data.experience.forEach(item => {
            chunks.push({
                section: "experience",
                text: `${item.summary} ${item.details ? item.details.join(" ") : ""}`
            });
        });
    }

    if (Array.isArray(data.projects)) {
        data.projects.forEach(item => {
            chunks.push({
                section: "projects",
                text: `${item.name}. ${item.category}. ${item.summary} ${item.highlights ? item.highlights.join(" ") : ""} ${item.keywords ? item.keywords.join(" ") : ""}`
            });
        });
    }

    if (Array.isArray(data.notable_interests)) {
        chunks.push({
            section: "interests",
            text: data.notable_interests.join(", ")
        });
    }

    if (data.career_targets) {
        chunks.push({
            section: "career",
            text: `${data.career_targets.roles.join(", ")}. ${data.career_targets.industries_of_interest.join(", ")}. ${data.career_targets.work_themes.join(", ")}`
        });
    }

    return chunks;
}

function getAliases(query, aliases) {
    let expanded = query.toLowerCase();

    if (!aliases) return expanded;

    Object.values(aliases).forEach(words => {
        words.forEach(word => {
            if (expanded.includes(word.toLowerCase())) {
                expanded += " " + words.join(" ");
            }
        });
    });

    return expanded;
}

function scoreText(query, text) {
    const queryWords = query.toLowerCase().split(/\s+/).filter(Boolean);
    const textLower = text.toLowerCase();
    let score = 0;

    queryWords.forEach(word => {
        if (textLower.includes(word)) score += 2;
    });

    if (query.includes("project")) score += textLower.includes("project") || textLower.includes("built") ? 4 : 0;
    if (query.includes("skill")) score += textLower.includes("skills") || textLower.includes("python") || textLower.includes("sql") ? 4 : 0;
    if (query.includes("education")) score += textLower.includes("degree") || textLower.includes("umbc") || textLower.includes("master") ? 4 : 0;
    if (query.includes("experience")) score += textLower.includes("experience") ? 4 : 0;
    if (query.includes("contact")) score += textLower.includes("contact") || textLower.includes("email") || textLower.includes("linkedin") ? 4 : 0;
    if (query.includes("healthcare")) score += textLower.includes("healthcare") || textLower.includes("mimic") || textLower.includes("covid") ? 5 : 0;
    if (query.includes("rag") || query.includes("chatbot")) score += textLower.includes("rag") || textLower.includes("chatbot") || textLower.includes("llamaindex") ? 5 : 0;

    return score;
}

function checkFAQ(query) {
    if (!portfolioKnowledge || !portfolioKnowledge.faq) return null;

    for (const item of portfolioKnowledge.faq) {
        for (const pattern of item.question_patterns) {
            if (query.includes(pattern)) {
                return item.answer;
            }
        }
    }

    return null;
}

function getBestMatches(query) {
    if (!portfolioKnowledge) return [];

    const expandedQuery = getAliases(query, portfolioKnowledge.search_aliases);
    const chunks = flattenKnowledge(portfolioKnowledge);

    const scored = chunks.map(chunk => ({
        ...chunk,
        score: scoreText(expandedQuery, chunk.text)
    }));

    return scored
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);
}

function generateAnswer(query) {
    const lowerQuery = query.toLowerCase().trim();

    if (!portfolioKnowledge) {
        return "I’m having trouble loading Krishna Teja’s information right now. Please try again in a moment.";
    }

    if (["hi", "hello", "hey"].some(word => lowerQuery === word || lowerQuery.startsWith(word + " "))) {
        return "Hi, I’m KrishnaBot. Ask me about Krishna Teja’s background, education, skills, projects, experience, or contact details.";
    }

    const faqAnswer = checkFAQ(lowerQuery);
    if (faqAnswer) return faqAnswer;

    const matches = getBestMatches(lowerQuery);

    if (matches.length === 0) {
        return portfolioKnowledge.chatbot_guidance?.fallback_message ||
            "I couldn’t find an exact answer for that yet. Try asking about Krishna Teja’s background, education, skills, projects, experience, or contact information.";
    }

    return matches.map(match => match.text).join(" ");
}

function appendMessage(message, type = "bot") {
    const messagesContainer = document.getElementById("ktChatMessages");
    if (!messagesContainer) return;

    const msgDiv = document.createElement("div");
    msgDiv.classList.add("kt-msg");

    if (type === "user") {
        msgDiv.classList.add("kt-user-msg");
    } else {
        msgDiv.classList.add("kt-bot-msg");
    }

    msgDiv.textContent = message;
    messagesContainer.appendChild(msgDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function handleChatSend() {
    const input = document.getElementById("ktChatInput");
    if (!input) return;

    const query = input.value.trim();
    if (!query) return;

    appendMessage(query, "user");

    setTimeout(() => {
        const answer = generateAnswer(query);
        appendMessage(answer, "bot");
    }, 350);

    input.value = "";
}

document.addEventListener("DOMContentLoaded", async () => {
    await loadPortfolioData();

    const chatForm = document.getElementById("ktChatForm");
    const sendBtn = document.getElementById("ktChatSend");

    if (chatForm) {
        chatForm.addEventListener("submit", function (e) {
            e.preventDefault();
            handleChatSend();
        });
    }

    if (sendBtn) {
        sendBtn.addEventListener("click", function (e) {
            e.preventDefault();
            handleChatSend();
        });
    }
});