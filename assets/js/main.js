/*
 * Red FCU website — shared behaviour.
 *
 * Handles the theme toggle, the mobile navigation, and the footer year.
 * No dependencies, no tracking, no network requests.
 */
(function () {
  "use strict";

  var root = document.documentElement;
  var STORAGE_KEY = "redfcu-theme";
  var storage = null;

  try {
    storage = window.localStorage;
    storage.getItem(STORAGE_KEY);
  } catch (error) {
    storage = null;
  }

  var systemLight =
    typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-color-scheme: light)")
      : null;

  function systemTheme() {
    return systemLight && systemLight.matches ? "light" : "dark";
  }

  function effectiveTheme() {
    var attribute = root.getAttribute("data-theme");
    return attribute === "light" || attribute === "dark"
      ? attribute
      : systemTheme();
  }

  function rememberTheme(theme) {
    if (!storage) {
      return;
    }

    try {
      storage.setItem(STORAGE_KEY, theme);
    } catch (error) {
      /* Storage can fail (quota, private mode). The session still works. */
    }
  }

  function themeLabel(theme) {
    return theme === "dark" ? "Switch to light theme" : "Switch to dark theme";
  }

  /* ------------------------------------------------------------------ */
  /* Theme toggle                                                        */
  /* ------------------------------------------------------------------ */

  var themeToggle = document.querySelector("[data-theme-toggle]");

  function syncThemeToggle() {
    if (!themeToggle) {
      return;
    }

    var label = themeLabel(effectiveTheme());
    themeToggle.setAttribute("aria-label", label);
    themeToggle.setAttribute("title", label);
  }

  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      var next = effectiveTheme() === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      rememberTheme(next);
      syncThemeToggle();
    });

    syncThemeToggle();
  }

  if (systemLight) {
    var handleSystemChange = function () {
      if (!root.hasAttribute("data-theme")) {
        syncThemeToggle();
      }
    };

    if (typeof systemLight.addEventListener === "function") {
      systemLight.addEventListener("change", handleSystemChange);
    } else if (typeof systemLight.addListener === "function") {
      systemLight.addListener(handleSystemChange);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Mobile navigation                                                   */
  /* ------------------------------------------------------------------ */

  var navToggle = document.querySelector("[data-nav-toggle]");
  var siteNav = document.getElementById("site-nav");
  var navLabel = document.querySelector("[data-nav-label]");

  function navIsOpen() {
    return navToggle && navToggle.getAttribute("aria-expanded") === "true";
  }

  function setNav(open, restoreFocus) {
    if (!navToggle || !siteNav) {
      return;
    }

    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    siteNav.classList.toggle("is-open", open);

    if (navLabel) {
      navLabel.textContent = open ? "Close" : "Menu";
    }

    if (restoreFocus) {
      navToggle.focus();
    }
  }

  if (navToggle && siteNav) {
    navToggle.addEventListener("click", function () {
      setNav(!navIsOpen(), false);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && navIsOpen()) {
        setNav(false, true);
      }
    });

    document.addEventListener("click", function (event) {
      if (!navIsOpen()) {
        return;
      }

      var target = event.target;

      if (siteNav.contains(target) || navToggle.contains(target)) {
        return;
      }

      setNav(false, false);
    });

    siteNav.addEventListener("click", function (event) {
      if (event.target.closest("a")) {
        setNav(false, false);
      }
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 1099 && navIsOpen()) {
        setNav(false, false);
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* Footer year                                                         */
  /* ------------------------------------------------------------------ */

  var year = String(new Date().getFullYear());
  var yearNodes = document.querySelectorAll("[data-year]");

  for (var i = 0; i < yearNodes.length; i += 1) {
    yearNodes[i].textContent = year;
  }

  /*
   * Styles that depend on JavaScript (collapsed mobile navigation, header
   * controls) are gated behind this class. If this file fails to load, the
   * header controls stay hidden and the navigation stays expanded.
   */
  root.classList.add("ready");
})();
