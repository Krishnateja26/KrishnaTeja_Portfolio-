const contactForm = document.getElementById("contact-form");

if (contactForm) {
  contactForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const submitBtn = contactForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;

    document.getElementById("contact-time").value = new Date().toLocaleString();

    submitBtn.innerHTML = 'Sending... <i class="fa-regular fa-paper-plane"></i>';
    submitBtn.disabled = true;

    try {
      await emailjs.sendForm(
        "service_6lsf0kt",
        "template_ixskvpv",
        contactForm
      );

      alert("Message sent successfully!");
      contactForm.reset();
    } catch (error) {
      console.error("EmailJS Error:", error);
      alert("Failed to send message. Please try again.");
    } finally {
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  });
}