/*
 * Red FCU website — release data and the hidden staff editor.
 *
 * Two jobs:
 *   1. Load assets/data/release.json and fill every [data-release] element,
 *      so the current version lives in one file instead of five pages.
 *   2. Provide the staff release editor behind Left Alt + F2.
 *
 * The editor is a local preview tool, not an authentication system. The
 * account list in assets/data/staff.json is a public file, and anything
 * edited here is stored in this browser only until release.json is
 * published. Nothing is sent anywhere; every request is same-origin.
 */
(function () {
  "use strict";

  var RELEASE_PATH = "assets/data/release.json";
  var STAFF_PATH = "assets/data/staff.json";
  var STORAGE_SESSION = "codepilot-staff";
  var STORAGE_DRAFT = "codepilot-release-draft";
  var SESSION_HOURS = 12;

  var VERSION_RE = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;
  var DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

  var MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  /* Used only if release.json cannot be fetched (for example when the page
     is opened straight from disk). The HTML already carries the same values. */
  var FALLBACK_RELEASE = {
    version: "3.0.0",
    released: "2026-10-23",
    package: "Codepilot-AI.unitypackage",
    sizeKB: 360
  };

  var root = document.documentElement;
  var body = document.body;

  /* 404.html is served at arbitrary addresses, so it declares a base path. */
  var basePath = body ? body.getAttribute("data-site-base") || "" : "";

  var storage = null;

  try {
    storage = window.localStorage;
    storage.getItem(STORAGE_SESSION);
  } catch (error) {
    storage = null;
  }

  var session = null;
  var baseRelease = FALLBACK_RELEASE;
  var draft = null;
  var roster = null;
  var ui = {};
  var badge = null;
  var lastFocused = null;
  var altSide = "AltLeft";

  /* ------------------------------------------------------------------ */
  /* Small helpers                                                       */
  /* ------------------------------------------------------------------ */

  function sitePath(path) {
    return basePath + path;
  }

  function readJSON(key) {
    if (!storage) {
      return null;
    }

    try {
      var raw = storage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function writeJSON(key, value) {
    if (!storage) {
      return false;
    }

    try {
      storage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  }

  function removeKey(key) {
    if (!storage) {
      return;
    }

    try {
      storage.removeItem(key);
    } catch (error) {
      /* Ignore blocked storage. */
    }
  }

  function formatDate(iso) {
    var match = DATE_RE.exec(String(iso));

    if (!match) {
      return String(iso);
    }

    var month = MONTHS[parseInt(match[2], 10) - 1];

    if (!month) {
      return String(iso);
    }

    return parseInt(match[3], 10) + " " + month + " " + match[1];
  }

  function isRealDate(iso) {
    if (!DATE_RE.test(iso)) {
      return false;
    }

    var parts = iso.split("-");
    var year = parseInt(parts[0], 10);
    var month = parseInt(parts[1], 10);
    var day = parseInt(parts[2], 10);
    var date = new Date(Date.UTC(year, month - 1, day));

    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  }

  function sanitiseRelease(data) {
    if (!data || typeof data !== "object") {
      return null;
    }

    var version = String(data.version || "").trim().replace(/^v/i, "");
    var released = String(data.released || "").trim();
    var pkg = String(data.package || "").trim();
    var size = parseInt(data.sizeKB, 10);

    if (!VERSION_RE.test(version) || !isRealDate(released) || !pkg) {
      return null;
    }

    if (!isFinite(size) || size <= 0) {
      return null;
    }

    return {
      version: version,
      released: released,
      package: pkg,
      sizeKB: size
    };
  }

  function sha256(text) {
    if (
      !window.crypto ||
      !window.crypto.subtle ||
      typeof window.TextEncoder !== "function"
    ) {
      return Promise.reject(new Error("unsupported"));
    }

    var bytes = new window.TextEncoder().encode(text);

    return window.crypto.subtle.digest("SHA-256", bytes).then(function (buffer) {
      var view = new Uint8Array(buffer);
      var out = "";

      for (var i = 0; i < view.length; i += 1) {
        out += (view[i] < 16 ? "0" : "") + view[i].toString(16);
      }

      return out;
    });
  }

  /* ------------------------------------------------------------------ */
  /* Release data                                                        */
  /* ------------------------------------------------------------------ */

  var TOKENS = {
    version: function (data) {
      return data.version;
    },
    "v-version": function (data) {
      return "v" + data.version;
    },
    date: function (data) {
      return formatDate(data.released);
    },
    package: function (data) {
      return data.package;
    },
    size: function (data) {
      return data.sizeKB + "\u00a0KB";
    }
  };

  function applyRelease(data, editable) {
    var nodes = document.querySelectorAll("[data-release]");

    for (var i = 0; i < nodes.length; i += 1) {
      var key = nodes[i].getAttribute("data-release");
      var format = TOKENS[key];

      if (!format) {
        continue;
      }

      nodes[i].textContent = format(data);

      if (editable) {
        nodes[i].setAttribute("title", "Staff preview — Left Alt + F2 to edit");
      } else {
        nodes[i].removeAttribute("title");
      }
    }
  }

  function activeRelease() {
    return session && draft ? draft : baseRelease;
  }

  function setStaffOn(on) {
    if (on) {
      root.classList.add("staff-on");
    } else {
      root.classList.remove("staff-on");
    }
  }

  function showBadge(data) {
    if (!badge) {
      badge = document.createElement("button");
      badge.type = "button";
      badge.className = "staff-badge";
      badge.addEventListener("click", function () {
        openPanel();
      });
      document.body.appendChild(badge);
    }

    badge.textContent = "Staff preview: v" + data.version;
    badge.setAttribute(
      "aria-label",
      "Open the staff release editor. This browser is previewing version " +
        data.version +
        "."
    );
  }

  function hideBadge() {
    if (badge && badge.parentNode) {
      badge.parentNode.removeChild(badge);
    }

    badge = null;
  }

  function refreshPreview() {
    var data = activeRelease();

    applyRelease(data, Boolean(session && draft));
    setStaffOn(Boolean(session && draft));

    if (session && draft) {
      showBadge(data);
    } else {
      hideBadge();
    }
  }

  function restoreSession() {
    var saved = readJSON(STORAGE_SESSION);

    if (!saved || typeof saved.username !== "string") {
      return;
    }

    if (typeof saved.expires !== "number" || saved.expires < Date.now()) {
      removeKey(STORAGE_SESSION);
      return;
    }

    session = saved;
    draft = sanitiseRelease(readJSON(STORAGE_DRAFT));
  }

  function loadRelease() {
    if (typeof window.fetch !== "function") {
      return;
    }

    window
      .fetch(sitePath(RELEASE_PATH), { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("HTTP " + response.status);
        }

        return response.json();
      })
      .then(function (data) {
        var clean = sanitiseRelease(data);

        if (!clean) {
          return;
        }

        baseRelease = clean;

        if (!(session && draft)) {
          applyRelease(baseRelease, false);
        } else if (ui.json) {
          renderJSON(activeRelease());
        }
      })
      .catch(function () {
        /* Keep the values already written into the HTML. */
      });
  }

  /* ------------------------------------------------------------------ */
  /* Panel markup                                                        */
  /* ------------------------------------------------------------------ */

  var PANEL_HTML = [
    '<div class="staff-scrim" data-staff-close></div>',
    '<section class="staff-panel" role="dialog" aria-modal="true" aria-labelledby="staff-title" tabindex="-1" data-staff-panel>',
    '  <div class="staff-head">',
    "    <div>",
    '      <p class="kicker">Staff tools</p>',
    '      <h2 id="staff-title">Release editor</h2>',
    "    </div>",
    '    <button class="staff-close" type="button" data-staff-close aria-label="Close staff tools">',
    '      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M5 5l14 14M19 5L5 19"></path></svg>',
    "    </button>",
    "  </div>",

    '  <div class="staff-view" data-staff-view="signin">',
    '    <p class="staff-note">This editor is a local preview tool, not a Discord sign-in. No request leaves this page and nothing you type is sent anywhere. The account list is the public file <code>assets/data/staff.json</code>.</p>',
    '    <form class="staff-form" data-staff-signin novalidate>',
    '      <div class="staff-field">',
    '        <label for="staff-user">Discord username or user ID</label>',
    '        <input id="staff-user" type="text" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="username" required>',
    "      </div>",
    '      <div class="staff-field" data-staff-code-wrap hidden>',
    '        <label for="staff-code">Staff code</label>',
    '        <input id="staff-code" type="password" autocomplete="off" spellcheck="false">',
    "      </div>",
    '      <p class="staff-msg" data-staff-msg role="status"></p>',
    '      <div class="staff-actions">',
    '        <button class="btn btn-primary" type="submit">Unlock editor</button>',
    '        <button class="staff-linkbtn" type="button" data-staff-pick>Load staff.json from disk</button>',
    '        <input type="file" accept="application/json,.json" data-staff-file hidden>',
    "      </div>",
    "    </form>",
    '    <p class="staff-hint">Left Alt + F2 opens this panel. Escape closes it.</p>',
    "  </div>",

    '  <div class="staff-view" data-staff-view="editor" hidden>',
    '    <p class="staff-who" data-staff-who></p>',
    '    <form class="staff-form" data-staff-editor novalidate>',
    '      <div class="staff-grid">',
    '        <div class="staff-field">',
    '          <label for="staff-version">Version</label>',
    '          <input id="staff-version" type="text" inputmode="numeric" autocomplete="off" spellcheck="false" placeholder="3.0.1">',
    "        </div>",
    '        <div class="staff-field">',
    '          <label for="staff-date">Release date</label>',
    '          <input id="staff-date" type="date">',
    "        </div>",
    '        <div class="staff-field">',
    '          <label for="staff-package">Package file</label>',
    '          <input id="staff-package" type="text" autocomplete="off" spellcheck="false" placeholder="Codepilot-AI.unitypackage">',
    "        </div>",
    '        <div class="staff-field">',
    '          <label for="staff-size">Size in KB</label>',
    '          <input id="staff-size" type="number" min="1" step="1" inputmode="numeric" placeholder="360">',
    "        </div>",
    "      </div>",
    '      <p class="staff-msg" data-staff-edit-msg role="status"></p>',
    '      <div class="staff-actions">',
    '        <button class="btn btn-primary" type="submit">Preview on this page</button>',
    '        <button class="btn btn-secondary" type="button" data-staff-save>Download release.json</button>',
    '        <button class="btn btn-secondary" type="button" data-staff-copy>Copy JSON</button>',
    '        <button class="btn btn-secondary" type="button" data-staff-reset>Reset</button>',
    '        <button class="staff-linkbtn" type="button" data-staff-signout>Sign out</button>',
    "      </div>",
    "    </form>",

    '    <details class="staff-details">',
    "      <summary>How these changes reach visitors</summary>",
    "      <p>A preview only changes this browser. Visitors keep seeing the published file until you commit a new one.</p>",
    "      <ol>",
    "        <li>Press <strong>Download release.json</strong>.</li>",
    "        <li>Replace <code>assets/data/release.json</code> in your copy of the site with the downloaded file.</li>",
    "        <li>Upload it to the repository at the same path and commit. GitHub Pages republishes within a minute or two.</li>",
    "      </ol>",
    '      <pre class="staff-code" data-staff-json></pre>',
    "    </details>",

    '    <details class="staff-details">',
    "      <summary>Staff code hash</summary>",
    "      <p>Generate the SHA-256 value to paste into an account's <code>codeHash</code> field in <code>staff.json</code>. Use a long, unique code: the file is public and hashes can be attacked offline.</p>",
    '      <div class="staff-field">',
    '        <label for="staff-code-source">Code to hash</label>',
    '        <input id="staff-code-source" type="text" autocomplete="off" spellcheck="false">',
    "      </div>",
    '      <div class="staff-actions">',
    '        <button class="btn btn-secondary" type="button" data-staff-hash>Hash code</button>',
    "      </div>",
    '      <p class="staff-hash" data-staff-hash-out role="status"></p>',
    "    </details>",
    "  </div>",
    "</section>"
  ].join("");

  function buildPanel() {
    var layer = document.createElement("div");

    layer.className = "staff-layer";
    layer.setAttribute("data-staff-layer", "");
    layer.hidden = true;
    layer.innerHTML = PANEL_HTML;
    document.body.appendChild(layer);

    ui = {
      layer: layer,
      panel: layer.querySelector("[data-staff-panel]"),
      signin: layer.querySelector('[data-staff-view="signin"]'),
      editor: layer.querySelector('[data-staff-view="editor"]'),
      signinForm: layer.querySelector("[data-staff-signin]"),
      editorForm: layer.querySelector("[data-staff-editor]"),
      user: layer.querySelector("#staff-user"),
      code: layer.querySelector("#staff-code"),
      codeWrap: layer.querySelector("[data-staff-code-wrap]"),
      msg: layer.querySelector("[data-staff-msg]"),
      editMsg: layer.querySelector("[data-staff-edit-msg]"),
      pick: layer.querySelector("[data-staff-pick]"),
      file: layer.querySelector("[data-staff-file]"),
      who: layer.querySelector("[data-staff-who]"),
      version: layer.querySelector("#staff-version"),
      date: layer.querySelector("#staff-date"),
      package: layer.querySelector("#staff-package"),
      size: layer.querySelector("#staff-size"),
      json: layer.querySelector("[data-staff-json]"),
      save: layer.querySelector("[data-staff-save]"),
      copy: layer.querySelector("[data-staff-copy]"),
      reset: layer.querySelector("[data-staff-reset]"),
      signout: layer.querySelector("[data-staff-signout]"),
      codeSource: layer.querySelector("#staff-code-source"),
      hash: layer.querySelector("[data-staff-hash]"),
      hashOut: layer.querySelector("[data-staff-hash-out]")
    };
  }

  /* ------------------------------------------------------------------ */
  /* Opening and closing                                                 */
  /* ------------------------------------------------------------------ */

  function isOpen() {
    return Boolean(ui.layer && !ui.layer.hidden);
  }

  function isVisible(node) {
    if (node.closest("[hidden]")) {
      return false;
    }

    /* Closed <details> keeps its content in the box tree in some browsers,
       so offsetParent alone is not enough. */
    var details = node.closest("details");

    if (details && !details.open && !node.closest("summary")) {
      return false;
    }

    return node.offsetParent !== null;
  }

  function focusables() {
    if (!ui.layer) {
      return [];
    }

    var nodes = ui.layer.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), summary, [tabindex]:not([tabindex="-1"])'
    );
    var visible = [];

    for (var i = 0; i < nodes.length; i += 1) {
      if (isVisible(nodes[i])) {
        visible.push(nodes[i]);
      }
    }

    return visible;
  }

  function openPanel() {
    if (!ui.layer) {
      return;
    }

    if (isOpen()) {
      return;
    }

    lastFocused = document.activeElement;

    if (session) {
      enterEditor();
    } else {
      showSignin();
    }

    ui.layer.hidden = false;
    ui.layer.classList.add("is-open");
    document.body.classList.add("staff-open");

    var target = session ? ui.version : ui.user;

    if (target) {
      target.focus();
      target.select();
    }
  }

  function closePanel() {
    if (!ui.layer || !isOpen()) {
      return;
    }

    ui.layer.classList.remove("is-open");
    ui.layer.hidden = true;
    document.body.classList.remove("staff-open");

    if (lastFocused && typeof lastFocused.focus === "function") {
      lastFocused.focus();
    }

    lastFocused = null;
  }

  function togglePanel() {
    if (isOpen()) {
      closePanel();
    } else {
      openPanel();
    }
  }

  function showSignin() {
    ui.signin.hidden = false;
    ui.editor.hidden = true;
    setMessage(ui.msg, "");
    setMessage(ui.editMsg, "");
  }

  /* ------------------------------------------------------------------ */
  /* Signing in                                                          */
  /* ------------------------------------------------------------------ */

  function setMessage(node, text, ok) {
    if (!node) {
      return;
    }

    node.textContent = text;
    node.classList.toggle("is-ok", Boolean(ok));
  }

  function pickAccounts(data) {
    var list = data && Array.isArray(data) ? data : data && data.accounts;
    var out = [];

    if (!Array.isArray(list)) {
      return out;
    }

    for (var i = 0; i < list.length; i += 1) {
      var account = list[i];

      if (!account || typeof account !== "object") {
        continue;
      }

      if (account.enabled === false) {
        continue;
      }

      if (!account.username && !account.userId) {
        continue;
      }

      out.push(account);
    }

    return out;
  }

  function loadRoster() {
    if (roster) {
      return Promise.resolve(roster);
    }

    if (typeof window.fetch !== "function") {
      return Promise.reject(new Error("unsupported"));
    }

    return window
      .fetch(sitePath(STAFF_PATH), { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("HTTP " + response.status);
        }

        return response.json();
      })
      .then(function (data) {
        roster = pickAccounts(data);
        return roster;
      });
  }

  function findAccount(query) {
    var needle = query.trim().toLowerCase();

    for (var i = 0; i < roster.length; i += 1) {
      var account = roster[i];
      var name = String(account.username || "").toLowerCase();

      if (name && name === needle) {
        return account;
      }

      if (account.userId && String(account.userId) === query.trim()) {
        return account;
      }
    }

    return null;
  }

  function normaliseHash(value) {
    return String(value || "")
      .trim()
      .replace(/^sha256:/i, "")
      .toLowerCase();
  }

  function grant(account) {
    session = {
      username: String(account.username || account.userId),
      displayName: String(account.displayName || account.username || account.userId),
      expires: Date.now() + SESSION_HOURS * 3600 * 1000
    };

    writeJSON(STORAGE_SESSION, session);
    draft = sanitiseRelease(readJSON(STORAGE_DRAFT));
    setMessage(ui.msg, "");
    refreshPreview();
    enterEditor();

    if (ui.version) {
      ui.version.focus();
      ui.version.select();
    }
  }

  function handleSignIn(event) {
    event.preventDefault();

    var query = ui.user.value.trim();

    if (!query) {
      setMessage(ui.msg, "Enter the Discord username or user ID on the staff list.");
      ui.user.focus();
      return;
    }

    setMessage(ui.msg, "Checking the staff list…");

    loadRoster()
      .then(function () {
        var account = findAccount(query);

        if (!account) {
          setMessage(
            ui.msg,
            "That account is not on the staff list in assets/data/staff.json."
          );
          ui.user.focus();
          ui.user.select();
          return;
        }

        var expected = normaliseHash(account.codeHash);

        if (!expected) {
          grant(account);
          return;
        }

        if (!ui.code.value) {
          ui.codeWrap.hidden = false;
          setMessage(ui.msg, "This account also needs its staff code.");
          ui.code.focus();
          return;
        }

        sha256(ui.code.value)
          .then(function (hash) {
            if (hash === expected) {
              grant(account);
            } else {
              setMessage(ui.msg, "That staff code does not match this account.");
              ui.code.focus();
              ui.code.select();
            }
          })
          .catch(function () {
            setMessage(
              ui.msg,
              "This browser cannot compute the staff code hash. Open the site over HTTPS or on localhost and try again."
            );
          });
      })
      .catch(function () {
        setMessage(
          ui.msg,
          "The staff list could not be loaded. If you opened this page from disk, use “Load staff.json from disk”, or serve the folder over HTTP."
        );
      });
  }

  function handleRosterFile() {
    var file = ui.file.files && ui.file.files[0];

    if (!file) {
      return;
    }

    var reader = new window.FileReader();

    reader.onload = function () {
      try {
        roster = pickAccounts(JSON.parse(String(reader.result)));
        setMessage(
          ui.msg,
          roster.length +
            (roster.length === 1 ? " account" : " accounts") +
            " loaded from " +
            file.name +
            ".",
          true
        );
        ui.user.focus();
      } catch (error) {
        roster = null;
        setMessage(ui.msg, "That file is not valid staff JSON.");
      }
    };

    reader.onerror = function () {
      setMessage(ui.msg, "That file could not be read.");
    };

    reader.readAsText(file);
    ui.file.value = "";
  }

  /* ------------------------------------------------------------------ */
  /* Editing                                                             */
  /* ------------------------------------------------------------------ */

  function fillEditor(data) {
    ui.version.value = data.version;
    ui.date.value = data.released;
    ui.package.value = data.package;
    ui.size.value = String(data.sizeKB);
  }

  function readEditor() {
    var version = ui.version.value.trim().replace(/^v/i, "");
    var released = ui.date.value.trim();
    var pkg = ui.package.value.trim();
    var size = parseInt(ui.size.value, 10);
    var errors = [];

    if (!VERSION_RE.test(version)) {
      errors.push("Version must look like 3.0.1.");
    }

    if (!isRealDate(released)) {
      errors.push("Pick a valid release date.");
    }

    if (!/\.unitypackage$/i.test(pkg)) {
      errors.push("The package file must end in .unitypackage.");
    }

    if (!isFinite(size) || size <= 0) {
      errors.push("Size must be a positive number of KB.");
    }

    return {
      ok: errors.length === 0,
      errors: errors,
      data: {
        version: version,
        released: released,
        package: pkg,
        sizeKB: size
      }
    };
  }

  function renderJSON(data) {
    if (ui.json) {
      ui.json.textContent = JSON.stringify(
        {
          version: data.version,
          released: data.released,
          package: data.package,
          sizeKB: data.sizeKB
        },
        null,
        2
      );
    }
  }

  function enterEditor() {
    var data = activeRelease();

    ui.signin.hidden = true;
    ui.editor.hidden = false;
    ui.who.textContent = session
      ? "Signed in as " + session.displayName + ". Changes stay in this browser."
      : "";

    fillEditor(data);
    renderJSON(data);
    setMessage(ui.editMsg, "");
  }

  function handleApply(event) {
    if (event) {
      event.preventDefault();
    }

    var result = readEditor();

    if (!result.ok) {
      setMessage(ui.editMsg, result.errors.join(" "));
      return false;
    }

    draft = result.data;
    writeJSON(STORAGE_DRAFT, draft);
    refreshPreview();
    renderJSON(draft);
    setMessage(
      ui.editMsg,
      "Previewing v" +
        draft.version +
        " in this browser. Download release.json to publish it.",
      true
    );

    return true;
  }

  function handleReset() {
    draft = null;
    removeKey(STORAGE_DRAFT);
    refreshPreview();
    fillEditor(baseRelease);
    renderJSON(baseRelease);
    setMessage(ui.editMsg, "Showing the published values again.", true);
  }

  function handleSignOut() {
    session = null;
    draft = null;
    removeKey(STORAGE_SESSION);
    removeKey(STORAGE_DRAFT);
    refreshPreview();
    showSignin();
    ui.codeWrap.hidden = true;
    ui.code.value = "";
    ui.user.value = "";
    setMessage(ui.msg, "Signed out. This browser shows the published release again.", true);
    ui.user.focus();
  }

  function handleDownload() {
    var result = readEditor();

    if (!result.ok) {
      setMessage(ui.editMsg, result.errors.join(" "));
      return;
    }

    var text =
      "{\n" +
      '  "_help": "This file is the single source for the release details shown across the site. Every page fills its version, date, package name and size from here. Edit it, commit it, and GitHub Pages publishes the change. The staff editor (Left Alt + F2) writes a copy of this file for you.",\n' +
      '  "version": ' + JSON.stringify(result.data.version) + ",\n" +
      '  "released": ' + JSON.stringify(result.data.released) + ",\n" +
      '  "package": ' + JSON.stringify(result.data.package) + ",\n" +
      '  "sizeKB": ' + result.data.sizeKB + "\n" +
      "}\n";

    if (!window.Blob || !window.URL || !window.URL.createObjectURL) {
      setMessage(ui.editMsg, "This browser cannot download files from a page. Use Copy JSON instead.");
      return;
    }

    var blob = new window.Blob([text], { type: "application/json" });
    var link = document.createElement("a");

    link.href = window.URL.createObjectURL(blob);
    link.download = "release.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    window.setTimeout(function () {
      window.URL.revokeObjectURL(link.href);
    }, 1000);

    setMessage(
      ui.editMsg,
      "Downloaded release.json. Replace assets/data/release.json with it and commit.",
      true
    );
  }

  function copyText(text, done, failed) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, failed);
      return;
    }

    failed();
  }

  function handleCopy() {
    var result = readEditor();

    if (!result.ok) {
      setMessage(ui.editMsg, result.errors.join(" "));
      return;
    }

    copyText(
      JSON.stringify(result.data, null, 2) + "\n",
      function () {
        setMessage(ui.editMsg, "JSON copied. Paste it into assets/data/release.json.", true);
      },
      function () {
        setMessage(
          ui.editMsg,
          "Copying is blocked in this browser. Select the JSON below instead."
        );
      }
    );
  }

  function handleHash() {
    var value = ui.codeSource.value;

    if (!value) {
      ui.hashOut.textContent = "Enter a code first.";
      return;
    }

    sha256(value)
      .then(function (hash) {
        ui.hashOut.textContent = hash;
      })
      .catch(function () {
        ui.hashOut.textContent =
          "Hashing needs a secure page. Open the site over HTTPS or on localhost.";
      });
  }

  /* ------------------------------------------------------------------ */
  /* Wiring                                                              */
  /* ------------------------------------------------------------------ */

  function bind() {
    ui.layer.addEventListener("click", function (event) {
      if (event.target.closest("[data-staff-close]")) {
        closePanel();
      }
    });

    ui.signinForm.addEventListener("submit", handleSignIn);
    ui.editorForm.addEventListener("submit", handleApply);

    ui.pick.addEventListener("click", function () {
      ui.file.click();
    });

    ui.file.addEventListener("change", handleRosterFile);
    ui.save.addEventListener("click", handleDownload);
    ui.copy.addEventListener("click", handleCopy);
    ui.reset.addEventListener("click", handleReset);
    ui.signout.addEventListener("click", handleSignOut);
    ui.hash.addEventListener("click", handleHash);

    ui.editorForm.addEventListener("input", function () {
      var result = readEditor();

      if (result.ok) {
        renderJSON(result.data);
      }
    });

    document.addEventListener("click", function (event) {
      if (!session || !event.target.closest) {
        return;
      }

      if (event.target.closest("[data-release]")) {
        event.preventDefault();
        openPanel();
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.code === "AltLeft" || event.code === "AltRight") {
        altSide = event.code;
      }

      if (
        event.key === "F2" &&
        event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.shiftKey &&
        !event.repeat
      ) {
        /* The user asked for left Alt specifically; ignore right Alt. */
        if (altSide !== "AltRight") {
          event.preventDefault();
          togglePanel();
        }

        return;
      }

      if (!isOpen()) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        closePanel();
        return;
      }

      if (event.key === "Tab") {
        var items = focusables();

        if (!items.length) {
          return;
        }

        var first = items[0];
        var last = items[items.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* Start                                                               */
  /* ------------------------------------------------------------------ */

  buildPanel();
  bind();

  restoreSession();

  if (session) {
    refreshPreview();
  }

  loadRelease();
})();
