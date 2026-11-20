/*
 * Red FCU website — early theme init.
 *
 * Loaded synchronously in <head> so a saved light/dark choice is applied
 * before the first paint. If local storage is unavailable (blocked, full, or
 * disabled), the site silently falls back to the operating system preference.
 */
(function () {
  "use strict";

  var stored = null;

  try {
    stored = window.localStorage.getItem("redfcu-theme");
  } catch (error) {
    stored = null;
  }

  if (stored === "light" || stored === "dark") {
    document.documentElement.setAttribute("data-theme", stored);
  }
})();
