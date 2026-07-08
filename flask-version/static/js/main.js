document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const consoleEl = document.getElementById("console");
  const hasSearch = params.has("q") || document.querySelector(".callout--error");

  if (consoleEl && (hasSearch || document.referrer.includes("/login"))) {
    // no-op placeholder for future enhancement; console is always visible
    // at the bottom of the page so no scroll-jacking is needed.
  }
});
