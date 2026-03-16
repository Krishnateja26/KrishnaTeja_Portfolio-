document.addEventListener("DOMContentLoaded", () => {
    /* =========================
       ELEMENTS
    ========================= */
    const navbar = document.querySelector(".navbar");
    const menuToggle = document.querySelector(".menu-toggle");
    const navLinks = document.querySelector(".nav-links");
    const glow = document.querySelector(".cursor-glow");
    const typingElement = document.getElementById("typing");

    // Chatbot elements
    const ktChatbot = document.getElementById("kt-chatbot");
    const ktChatToggle = document.getElementById("ktChatToggle");
    const ktChatPanel = document.getElementById("ktChatPanel");
    const ktChatClose = document.getElementById("ktChatClose");
    const ktChatForm = document.getElementById("ktChatForm");
    const ktChatInput = document.getElementById("ktChatInput");
    const ktChatMessages = document.getElementById("ktChatMessages");

    /* =========================
       SMOOTH SCROLLING
    ========================= */
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
        anchor.addEventListener("click", function (e) {
            const targetId = this.getAttribute("href");
            const target = document.querySelector(targetId);

            if (!target) return;

            e.preventDefault();
            target.scrollIntoView({ behavior: "smooth" });

            if (navLinks && menuToggle) {
                navLinks.classList.remove("active");
                menuToggle.classList.remove("active");
            }
        });
    });

    /* =========================
       NAVBAR SCROLL EFFECT
    ========================= */
    if (navbar) {
        window.addEventListener("scroll", () => {
            navbar.style.backgroundColor =
                window.scrollY > 50
                    ? "rgba(10,10,10,0.98)"
                    : "rgba(10,10,10,0.95)";
        });
    }

    /* =========================
       MOBILE MENU TOGGLE
    ========================= */
    if (menuToggle && navLinks) {
        menuToggle.addEventListener("click", () => {
            menuToggle.classList.toggle("active");
            navLinks.classList.toggle("active");
        });
    }

    /* =========================
       CURSOR GLOW
    ========================= */
    if (glow) {
        document.addEventListener("mousemove", (e) => {
            glow.style.left = `${e.clientX}px`;
            glow.style.top = `${e.clientY}px`;
        });
    }

    /* =========================
       TYPING EFFECT
    ========================= */
    if (typingElement) {
        const roles = [
            "a Data Analyst",
            "a Data Scientist",
            "a Machine Learning Engineer",
            "an AI Engineer"
        ];

        let roleIndex = 0;
        let charIndex = 0;
        let isDeleting = false;

        function typeEffect() {
            const currentRole = roles[roleIndex];
            typingElement.textContent = currentRole.slice(0, charIndex);

            if (!isDeleting && charIndex < currentRole.length) {
                charIndex++;
            } else if (isDeleting && charIndex > 0) {
                charIndex--;
            } else {
                isDeleting = !isDeleting;

                if (!isDeleting) {
                    roleIndex = (roleIndex + 1) % roles.length;
                }
            }

            const speed = isDeleting ? 60 : 100;
            setTimeout(typeEffect, speed);
        }

        typeEffect();
    }

    /* =========================
       CHATBOT UI
    ========================= */
    function ktAppendMessage(text, sender = "bot") {
        if (!ktChatMessages) return;

        const msg = document.createElement("div");
        msg.className = sender === "user" ? "kt-msg kt-user-msg" : "kt-msg kt-bot-msg";
        msg.textContent = text;

        ktChatMessages.appendChild(msg);
        ktChatMessages.scrollTop = ktChatMessages.scrollHeight;
    }

    if (ktChatToggle && ktChatPanel && ktChatbot) {
        ktChatToggle.addEventListener("click", () => {
            ktChatPanel.classList.add("active");
            ktChatbot.classList.add("open");
        });
    }

    if (ktChatClose && ktChatPanel && ktChatbot) {
        ktChatClose.addEventListener("click", () => {
            ktChatPanel.classList.remove("active");
            ktChatbot.classList.remove("open");
        });
    }

    if (ktChatForm && ktChatInput) {
        ktChatForm.addEventListener("submit", (e) => {
            e.preventDefault();

            const text = ktChatInput.value.trim();
            if (!text) return;

            ktAppendMessage(text, "user");
            ktChatInput.value = "";

            setTimeout(() => {
                ktAppendMessage(
                    "Hi, I'm KrishnaBot. Right now this is the chatbot UI shell. Next, it can be connected to a RAG backend to answer questions about Krishna Teja accurately.",
                    "bot"
                );
            }, 500);
        });
    }
});