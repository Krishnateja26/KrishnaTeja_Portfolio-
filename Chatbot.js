let portfolioKnowledge = null;

// Set this to your deployed Cloudflare Worker URL (see worker/README.md).
// Until then, the chatbot automatically falls back to the local, offline matcher below.
const WORKER_URL = "https://krishnateja-portfolio-chatbot.mura20004.workers.dev";

let chatHistory = [];
let lastProjectResults = [];

async function loadPortfolioData() {
    try {
        const response = await fetch("portfolio-data.json", { cache: "no-store" });
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

const STOPWORDS = new Set([
    "the", "is", "are", "was", "were", "a", "an", "and", "or", "of", "to", "in", "on",
    "for", "with", "his", "her", "he", "she", "they", "what", "who", "whom", "when",
    "where", "why", "how", "does", "do", "did", "has", "have", "had", "this", "that",
    "these", "those", "it", "its", "as", "at", "by", "from", "about", "into", "over",
    "after", "before", "him", "them", "i", "you", "your", "my", "me", "we", "us",
    "can", "could", "would", "should", "will", "not", "no", "yes", "krishna", "teja"
]);

function meaningfulWords(text) {
    return text.toLowerCase().split(/\s+/).filter(word => word && !STOPWORDS.has(word));
}

function normalizeText(text) {
    return text.toLowerCase().replace(/[^a-z0-9+#.\s-]/g, " ").replace(/\s+/g, " ").trim();
}

function hasAny(text, terms) {
    return terms.some(term => text.includes(term));
}

function isShortAcknowledgement(query) {
    return ["good", "ok", "okay", "great", "nice", "cool", "thanks", "thank you", "got it", "sounds good"]
        .includes(normalizeText(query));
}

function looksLikeBadInput(query) {
    const normalized = normalizeText(query);
    if (!normalized) return true;

    const compact = normalized.replace(/\s+/g, "");
    const words = normalized.split(" ").filter(Boolean);
    const knownShortTerms = [
        "hi", "hello", "hey", "email", "linkedin", "github", "contact", "python", "sql",
        "fastapi", "mongodb", "project", "projects", "experience", "internship", "temple", "wiki"
    ];

    if (compact.length >= 8 && !/[aeiou]/.test(compact)) return true;
    if (words.length <= 2 && !hasAny(normalized, knownShortTerms)) return true;

    return false;
}

const SENSITIVE_TOPIC_WORDS = [
    "birthday", "birth date", "date of birth", "dob", "how old", " age ",
    "religion", "religious", "hindu", "muslim", "christian", "jewish", "atheist",
    "married", "marriage", "girlfriend", "boyfriend", "dating", "relationship status",
    "political", "politics", "salary", "income", "net worth", "weight", "height",
    "ethnicity", "race", "sexuality", "sexual orientation", "disability",
    "medical condition", "illness", "criminal", "terrorist", "illegal", "arrested"
];

function isSensitivePersonalQuery(lowerQuery) {
    const padded = ` ${lowerQuery} `;
    return SENSITIVE_TOPIC_WORDS.some(word => padded.includes(word));
}

function scoreText(query, text) {
    const queryWords = meaningfulWords(query);
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
        .filter(item => item.score >= 4)
        .sort((a, b) => b.score - a.score)
        .slice(0, 1);
}

/* =========================
   TOP-MATCHING PROJECTS
   (used by the local fallback, and mirrors what the
   Gemini-backed worker is instructed to do as well)
========================= */
function scoreProject(expandedQuery, project) {
    const text = `${project.name} ${project.category} ${project.summary} ${(project.highlights || []).join(" ")} ${(project.keywords || []).join(" ")}`.toLowerCase();
    const words = meaningfulWords(expandedQuery);
    let score = 0;

    words.forEach(word => {
        if (text.includes(word)) score += 2;
    });

    (project.keywords || []).forEach(keyword => {
        if (expandedQuery.includes(keyword.toLowerCase())) score += 3;
    });

    return score;
}

function isBroadProjectQuery(lowerQuery) {
    return hasAny(lowerQuery, [
        "what projects",
        "his projects",
        "worked on",
        "portfolio projects",
        "tell me about his projects"
    ]) && !hasAny(lowerQuery, [
        "python", "sql", "fastapi", "mongodb", "healthcare", "rag", "chatbot", "ml",
        "machine learning", "power bi", "dashboard", "flask", "streamlit"
    ]);
}

function isProjectQuery(lowerQuery, expandedQuery) {
    if (lowerQuery.includes("project")) return true;
    if (!portfolioKnowledge || !Array.isArray(portfolioKnowledge.projects)) return false;

    return portfolioKnowledge.projects.some(project =>
        (project.keywords || []).some(keyword => expandedQuery.includes(keyword.toLowerCase()))
    );
}

function getTopProjects(expandedQuery, limit = 3) {
    if (!portfolioKnowledge || !Array.isArray(portfolioKnowledge.projects)) return [];

    return portfolioKnowledge.projects
        .map(project => ({ ...project, score: scoreProject(expandedQuery, project) }))
        .filter(project => project.score >= 4)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
}

function formatProjectList(projects) {
    return projects
        .map((project, index) => {
            let line = `${index + 1}. ${project.name} — ${project.summary}`;
            if (project.github) line += ` GitHub: ${project.github}`;
            if (project.live_demo) line += ` | Live demo: ${project.live_demo}`;
            return line;
        })
        .join("\n");
}

function getAllSkills() {
    if (!portfolioKnowledge?.skills) return [];
    return Object.values(portfolioKnowledge.skills).flat().map(skill => skill.toLowerCase());
}

function getExperienceByTerm(term) {
    return (portfolioKnowledge?.experience || []).find(item =>
        `${item.type} ${item.summary}`.toLowerCase().includes(term)
    );
}

function formatExperience(item, detailLimit = 4) {
    if (!item) return "";
    const details = item.details ? item.details.slice(0, detailLimit).join(" ") : "";
    return `${item.type}: ${item.summary}${details ? " " + details : ""}`;
}

function getRelevantProjects(expandedQuery, limit = 3) {
    let projects = getTopProjects(expandedQuery, limit);

    if (projects.length === 0 && Array.isArray(portfolioKnowledge?.projects)) {
        projects = portfolioKnowledge.projects
            .filter(project => scoreProject(expandedQuery, project) > 0)
            .slice(0, limit);
    }

    lastProjectResults = projects;
    return projects;
}

function formatProjectDetail(project) {
    if (!project) return "";

    let answer = `${project.name}: ${project.summary}`;
    if (project.highlights?.length) {
        answer += `\nKey details: ${project.highlights.slice(0, 3).join(" ")}`;
    }
    if (project.github) answer += `\nGitHub: ${project.github}`;
    if (project.live_demo) answer += `\nLive demo: ${project.live_demo}`;
    return answer;
}

function answerProjectFollowup(lowerQuery) {
    if (!hasAny(lowerQuery, ["tell me more", "more about", "first one", "second one", "third one"])) return null;

    const ordinalMap = {
        "first": 0,
        "1st": 0,
        "one": 0,
        "second": 1,
        "2nd": 1,
        "two": 1,
        "third": 2,
        "3rd": 2,
        "three": 2
    };
    const key = Object.keys(ordinalMap).find(term => lowerQuery.includes(term));
    const index = key ? ordinalMap[key] : 0;

    return lastProjectResults[index] ? formatProjectDetail(lastProjectResults[index]) : null;
}

function answerContactQuery(lowerQuery) {
    const profile = portfolioKnowledge?.profile;
    if (!profile) return null;

    if (hasAny(lowerQuery, ["email", "mail"])) {
        return `Yes. Krishna Teja's email is ${profile.email}.`;
    }

    if (lowerQuery.includes("linkedin") || lowerQuery.includes("linked in")) {
        return `Yes. Krishna Teja has a LinkedIn profile: ${profile.linkedin}`;
    }

    if (lowerQuery.includes("github")) {
        return `Yes. Krishna Teja's GitHub profile is ${profile.github}.`;
    }

    if (hasAny(lowerQuery, ["contact", "reach", "connect"])) {
        return `You can reach Krishna Teja here:\nEmail: ${profile.email}\nLinkedIn: ${profile.linkedin}\nGitHub: ${profile.github}`;
    }

    return null;
}

function answerExperienceQuery(lowerQuery) {
    if (hasAny(lowerQuery, ["temple allen", "temple"])) {
        const temple = getExperienceByTerm("temple allen");
        return temple
            ? `Yes. Krishna Teja is working at Temple Allen Industries from April 2026 to present. ${formatExperience(temple, 5)}`
            : null;
    }

    if (hasAny(lowerQuery, ["wiki charities", "wikicharities", "wiki"])) {
        const wiki = getExperienceByTerm("wikicharities");
        return wiki
            ? `Yes. Krishna Teja worked at WikiCharities from February to April 2026. ${formatExperience(wiki, 4)}`
            : null;
    }

    if (hasAny(lowerQuery, ["internship", "internships", "intern"])) {
        const temple = getExperienceByTerm("temple allen");
        const wiki = getExperienceByTerm("wikicharities");
        return [
            temple ? `Current internship: Krishna Teja is working at Temple Allen Industries from April 2026 to present. ${temple.details.slice(0, 3).join(" ")}` : "",
            wiki ? `Past internship: Krishna Teja worked at WikiCharities from February to April 2026. ${wiki.details.slice(0, 3).join(" ")}` : ""
        ].filter(Boolean).join("\n\n");
    }

    if (hasAny(lowerQuery, ["work experience", "professional experience", "experience"])) {
        return (portfolioKnowledge?.experience || []).slice(0, 3)
            .map(item => formatExperience(item, 3))
            .join("\n\n");
    }

    return null;
}

function answerSkillQuery(lowerQuery, expandedQuery) {
    const skills = getAllSkills();
    const skillTerms = [
        "python", "sql", "fastapi", "mongodb", "machine learning", "ml", "data analysis",
        "power bi", "tableau", "flask", "streamlit", "rag", "llamaindex", "chromadb"
    ];
    const askedSkills = skillTerms.filter(skill => lowerQuery.includes(skill));

    if (askedSkills.length === 0 && !hasAny(lowerQuery, ["know", "worked with", "experience with", "used"])) {
        return null;
    }

    const matchedSkills = askedSkills.filter(skill => {
        if (skill === "ml") return skills.includes("classification") || skills.includes("regression");
        return skills.some(item => item.includes(skill));
    });

    if (matchedSkills.length === 0) return null;

    if (lowerQuery.includes("python")) {
        expandedQuery += " python machine learning data analysis fastapi flask pyspark pandas numpy";
    }

    const readableSkills = matchedSkills.map(skill => {
        if (skill === "ml") return "machine learning";
        if (skill === "python") return "Python";
        if (skill === "sql") return "SQL";
        if (skill === "fastapi") return "FastAPI";
        if (skill === "mongodb") return "MongoDB";
        return skill;
    });
    let projects = getRelevantProjects(expandedQuery, 3);
    if (lowerQuery.includes("sql")) {
        projects = projects.filter(project => {
            const text = `${project.name} ${project.summary} ${(project.highlights || []).join(" ")} ${(project.keywords || []).join(" ")}`.toLowerCase();
            return hasAny(text, ["sql", "mysql", "mariadb", "sql-backed", "data pipeline"]);
        });
        lastProjectResults = projects;
    }
    const temple = getExperienceByTerm("temple allen");

    let answer = `Yes. Krishna Teja knows ${readableSkills.join(", ")}.`;
    if (temple && hasAny(expandedQuery, ["python", "sql", "fastapi", "mongodb", "data analysis"])) {
        answer += " He has used related skills in work experience at Temple Allen Industries, including automation, analytics, SQL-backed workflows, Python, and internal platform development.";
    }
    if (projects.length > 0) {
        answer += `\nRelevant project${projects.length > 1 ? "s" : ""}:\n${formatProjectList(projects)}`;
    }

    return answer;
}

function generateAnswer(query) {
    const lowerQuery = normalizeText(query);

    if (!portfolioKnowledge) {
        return "I’m having trouble loading Krishna Teja’s information right now. Please try again in a moment.";
    }

    if (isShortAcknowledgement(lowerQuery)) {
        return "Glad that helps. Ask me anything else about Krishna Teja's projects, skills, experience, education, or contact details.";
    }

    if (looksLikeBadInput(lowerQuery)) {
        return "Please check your input. It does not look like a proper question yet. Try asking about Krishna Teja's skills, projects, work experience, internships, email, or LinkedIn.";
    }

    if (["hi", "hello", "hey"].some(word => lowerQuery === word || lowerQuery.startsWith(word + " "))) {
        return "Hi, I’m KrishnaBot. Ask me about Krishna Teja’s background, education, skills, projects, experience, or contact details.";
    }

    if (isSensitivePersonalQuery(lowerQuery)) {
        return "I don't have information regarding personal matters outside of Krishna Teja's professional background. I can share details about his skills, projects, education, experience, or how to contact him.";
    }

    const expandedQuery = getAliases(lowerQuery, portfolioKnowledge.search_aliases);

    const followupAnswer = answerProjectFollowup(lowerQuery);
    if (followupAnswer) return followupAnswer;

    const contactAnswer = answerContactQuery(lowerQuery);
    if (contactAnswer) return contactAnswer;

    const experienceAnswer = answerExperienceQuery(lowerQuery);
    if (experienceAnswer) return experienceAnswer;

    const skillAnswer = answerSkillQuery(lowerQuery, expandedQuery);
    if (skillAnswer) return skillAnswer;

    if (isProjectQuery(lowerQuery, expandedQuery)) {
        let topProjects = isBroadProjectQuery(lowerQuery)
            ? portfolioKnowledge.projects.slice(0, 3)
            : getRelevantProjects(expandedQuery, 3);
        let intro;
        lastProjectResults = topProjects;

        if (topProjects.length > 0) {
            intro = isBroadProjectQuery(lowerQuery)
                ? "Here are a few of his key projects:"
                : topProjects.length === 1
                ? "Here's the project that best matches that:"
                : `Here are the ${topProjects.length} projects that best match that:`;
        } else if (Array.isArray(portfolioKnowledge.projects) && portfolioKnowledge.projects.length > 0) {
            // Broad question ("what projects has he worked on") with no specific
            // technology mentioned to rank against — show the top few as-is.
            topProjects = portfolioKnowledge.projects.slice(0, 3);
            lastProjectResults = topProjects;
            intro = "Here are a few of his key projects:";
        }

        if (topProjects.length > 0) {
            return `${intro}\n${formatProjectList(topProjects)}`;
        }
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

/* =========================
   GEMINI (VIA CLOUDFLARE WORKER)
   Falls back to generateAnswer() above on any failure,
   so the chatbot never breaks if the worker isn't deployed
   or a free-tier quota is hit.
========================= */
async function askGemini(query) {
    if (!WORKER_URL || WORKER_URL.includes("REPLACE-WITH")) {
        throw new Error("worker not configured");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
        const res = await fetch(WORKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: query, history: chatHistory.slice(-6) }),
            signal: controller.signal
        });

        if (!res.ok) throw new Error(`worker responded with ${res.status}`);

        const data = await res.json();
        if (!data.reply || !data.reply.trim()) throw new Error("empty reply from worker");

        return data.reply.trim();
    } finally {
        clearTimeout(timeout);
    }
}

/* =========================
   MESSAGE RENDERING
========================= */
function linkifyIntoNodes(text) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    const nodes = [];

    parts.forEach(part => {
        if (urlRegex.test(part)) {
            const link = document.createElement("a");
            link.href = part;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.className = "kt-msg-link";
            link.textContent = part;
            nodes.push(link);
        } else if (part) {
            nodes.push(document.createTextNode(part));
        }
        urlRegex.lastIndex = 0;
    });

    return nodes;
}

function appendMessage(message, type = "bot") {
    const messagesContainer = document.getElementById("ktChatMessages");
    if (!messagesContainer) return;

    const msgDiv = document.createElement("div");
    msgDiv.classList.add("kt-msg");

    if (type === "user") {
        msgDiv.classList.add("kt-user-msg");
        msgDiv.textContent = message;
    } else {
        msgDiv.classList.add("kt-bot-msg");
        linkifyIntoNodes(message).forEach(node => msgDiv.appendChild(node));
    }

    messagesContainer.appendChild(msgDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function appendTypingIndicator() {
    const messagesContainer = document.getElementById("ktChatMessages");
    if (!messagesContainer) return null;

    const el = document.createElement("div");
    el.className = "kt-msg kt-bot-msg kt-typing";
    el.textContent = "KrishnaBot is typing…";

    messagesContainer.appendChild(el);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    return el;
}

function removeTypingIndicator(el) {
    if (el && el.parentNode) el.parentNode.removeChild(el);
}

async function handleChatSend() {
    const input = document.getElementById("ktChatInput");
    if (!input) return;

    const query = input.value.trim();
    if (!query) return;

    appendMessage(query, "user");
    chatHistory.push({ role: "user", text: query });
    input.value = "";

    const typingEl = appendTypingIndicator();

    let answer;
    try {
        answer = await askGemini(query);
    } catch (error) {
        answer = generateAnswer(query);
    }

    removeTypingIndicator(typingEl);
    appendMessage(answer, "bot");

    chatHistory.push({ role: "model", text: answer });
    if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);
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
