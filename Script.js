document.addEventListener("DOMContentLoaded", function () {

    // ================= Smooth Scrolling =================
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document
                .querySelector(this.getAttribute("href"))
                .scrollIntoView({ behavior: "smooth" });
        });
    });

    // ================= Navbar Scroll Effect =================
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        window.scrollY > 50
            ? navbar.style.backgroundColor = 'rgba(10,10,10,0.98)'
            : navbar.style.backgroundColor = 'rgba(10,10,10,0.95)';
    });

    // ================= Mobile Menu Toggle =================
    const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');

menuToggle.addEventListener('click', () => {
    menuToggle.classList.toggle('active');
    navLinks.classList.toggle('active');
});

    // ================= Cursor Glow =================
    const glow = document.querySelector('.cursor-glow');
    document.addEventListener('mousemove', e => {
        glow.style.left = e.clientX + 'px';
        glow.style.top = e.clientY + 'px';
    });

  /*  // ================= Reveal on Scroll =================
    const reveals = document.querySelectorAll('.reveal');

    function revealOnScroll() {
        reveals.forEach(el => {
            const top = el.getBoundingClientRect().top;
            if (top < window.innerHeight - 100) {
                el.classList.add('active');
            }
        });
    }

    window.addEventListener('scroll', revealOnScroll);
    revealOnScroll();
*/

// ================= Typing Effect =================
    const roles = [
        "a Data Analyst",
        "a Data Scientist",
        "a Machine Learning Engineer",
        "an AI Engineer"
    ];

    let index = 0;
    let charIndex = 0;
    let isDeleting = false;
    const typingElement = document.getElementById("typing");

    function typeEffect() {
        const current = roles[index];
        typingElement.textContent = current.slice(0, charIndex);

        if (!isDeleting && charIndex < current.length) {
            charIndex++;
        } else if (isDeleting && charIndex > 0) {
            charIndex--;
        } else {
            isDeleting = !isDeleting;
            if (!isDeleting) {
                index = (index + 1) % roles.length;
            }
        }

        setTimeout(typeEffect, 100);
    }

    typeEffect();

});
