document.addEventListener("DOMContentLoaded", () => {
    /* =========================
       ELEMENTS
    ========================= */
    const navbar = document.querySelector(".navbar");
    const menuToggle = document.querySelector(".menu-toggle");
    const navLinks = document.querySelector(".nav-links");
    const glow = document.querySelector(".cursor-glow");
    const typingElement = document.getElementById("typing");
    const matrixLoader = document.getElementById("matrixLoader");
    const loaderPercent = document.getElementById("loaderPercent");
    const loaderProgressBar = document.getElementById("loaderProgressBar");
    const loaderLine = document.getElementById("loaderLine");
    const loaderCommand = document.getElementById("loaderCommand");
    const loaderDots = document.getElementById("loaderDots");
    const enterPortfolio = document.getElementById("enterPortfolio");

    // Chatbot elements
    const ktChatbot = document.getElementById("kt-chatbot");
    const ktChatToggle = document.getElementById("ktChatToggle");
    const ktChatPanel = document.getElementById("ktChatPanel");
    const ktChatClose = document.getElementById("ktChatClose");
    const ktChatForm = document.getElementById("ktChatForm");
    const ktChatInput = document.getElementById("ktChatInput");
    const ktChatMessages = document.getElementById("ktChatMessages");
    let chatScrollY = 0;

    function setVisualViewportHeight() {
        const height = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        document.documentElement.style.setProperty("--kt-visual-height", `${height}px`);
    }

    setVisualViewportHeight();
    window.addEventListener("resize", setVisualViewportHeight);
    if (window.visualViewport) {
        window.visualViewport.addEventListener("resize", setVisualViewportHeight);
        window.visualViewport.addEventListener("scroll", setVisualViewportHeight);
    }

    function lockPageForChat() {
        chatScrollY = window.scrollY || document.documentElement.scrollTop || 0;
        document.body.style.position = "fixed";
        document.body.style.top = `-${chatScrollY}px`;
        document.body.style.left = "0";
        document.body.style.right = "0";
        document.body.style.width = "100%";
    }

    function unlockPageForChat() {
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.left = "";
        document.body.style.right = "";
        document.body.style.width = "";
        window.scrollTo(0, chatScrollY);
    }


    /* =========================
       MATRIX ENTRY LOADER
    ========================= */
    if (matrixLoader) {
        document.body.classList.add("loader-active");

        const loaderSteps = [
            { percent: 8, line: "Loading Krishna Teja's digital profile..." },
            { percent: 19, line: "Opening matrix entry environment..." },
            { percent: 31, line: "Indexing machine learning projects..." },
            { percent: 44, line: "Scanning analytics and BI skill modules..." },
            { percent: 58, line: "Connecting KrishnaBot knowledge layer..." },
            { percent: 72, line: "Verifying AI, ML, SQL, and RAG systems..." },
            { percent: 86, line: "Preparing portfolio interface..." },
            { percent: 96, line: "Finalizing access controls..." },
            { percent: 100, line: "Access granted. Entering portfolio..." }
        ];

        let loaderIndex = 0;
        let loaderComplete = false;
        let commandTyped = false;
        let dotIndex = 1;

        const dotsTimer = window.setInterval(() => {
            if (!loaderDots || loaderComplete) return;

            dotIndex = dotIndex === 3 ? 1 : dotIndex + 1;
            loaderDots.textContent = ".".repeat(dotIndex);
        }, 420);

        function typeLoaderCommand() {
            if (!loaderCommand || commandTyped) return;

            commandTyped = true;
            const command = "boot --profile krishna_teja";
            let index = 0;

            const commandTimer = window.setInterval(() => {
                loaderCommand.textContent = command.slice(0, index);
                index += 1;

                if (index > command.length) {
                    window.clearInterval(commandTimer);
                }
            }, 42);
        }

        function setLoaderProgress(step) {
            const value = step.percent === 100
                ? "100"
                : String(step.percent).padStart(2, "0");
            if (loaderPercent) loaderPercent.textContent = `${value}%`;
            if (loaderProgressBar) loaderProgressBar.style.width = `${step.percent}%`;
            if (loaderLine) loaderLine.textContent = step.line;

            if (step.percent === 100 && enterPortfolio) {
                if (loaderLine) loaderLine.textContent = "Access granted. Enter Portfolio is ready.";
                enterPortfolio.disabled = false;
                enterPortfolio.classList.add("is-ready");
                matrixLoader.classList.add("is-complete");
            }
        }

        function closeLoader() {
            if (loaderComplete) return;

            loaderComplete = true;
            window.clearInterval(dotsTimer);
            setLoaderProgress(loaderSteps[loaderSteps.length - 1]);
            matrixLoader.classList.add("is-hidden");
            document.body.classList.remove("loader-active");

            window.setTimeout(() => {
                matrixLoader.remove();
            }, 850);
        }

        setLoaderProgress(loaderSteps[0]);
        window.setTimeout(typeLoaderCommand, 450);

        const loaderTimer = window.setInterval(() => {
            loaderIndex += 1;

            if (loaderIndex >= loaderSteps.length) {
                window.clearInterval(loaderTimer);
                return;
            }

            setLoaderProgress(loaderSteps[loaderIndex]);
        }, 375);

        if (enterPortfolio) {
            enterPortfolio.addEventListener("click", () => {
                window.clearInterval(loaderTimer);
                closeLoader();
            });
        }
    }

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
       CHATBOT UI (open/close only —
       message handling lives in Chatbot.js)
    ========================= */
    if (ktChatToggle && ktChatPanel && ktChatbot) {
        ktChatToggle.addEventListener("click", () => {
            ktChatPanel.classList.add("active");
            ktChatbot.classList.add("open");
            lockPageForChat();
        });
    }

    if (ktChatClose && ktChatPanel && ktChatbot) {
        ktChatClose.addEventListener("click", () => {
            ktChatPanel.classList.remove("active");
            ktChatbot.classList.remove("open");
            unlockPageForChat();
        });
    }
});
