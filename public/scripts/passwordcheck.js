function setupPasswordToggle(toggleId = "togglePasswords", fieldClass = "password-field") {
    const toggle = document.getElementById(toggleId);
    if (!toggle) return;
  
    toggle.addEventListener("change", () => {
      const fields = document.querySelectorAll(`.${fieldClass}`);
      fields.forEach((field) => {
        field.type = toggle.checked ? "text" : "password";
      });
    });
  }
  
  // Run after the DOM is loaded
  document.addEventListener("DOMContentLoaded", () => {
    setupPasswordToggle();
  });
  