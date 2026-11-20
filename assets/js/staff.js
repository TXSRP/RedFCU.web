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
  var STORAGE_SESSION = "redfcu-staff";
  var STORAGE_DRAFT = "redfcu-release-draft";
  var SESSION_HOURS = 12;

  var VERSION_RE = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;
  var DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

  /* Staff ranks, weakest first. Each step adds exactly one power:
       viewer      read the panel only
       editor      preview release changes
       maintainer  also replace their own staff code
       admin       also replace other people's codes (not the owner's),
                   and review Verified Creator applications
       owner       also hire, and replace the owner code
     An unknown or missing role falls back to viewer. */
  var RANKS = {
    owner: { label: "Owner", level: 5, edit: true, rotate: "all", hire: true, review: true },
    admin: { label: "Admin", level: 4, edit: true, rotate: "team", hire: false, review: true },
    maintainer: { label: "Maintainer", level: 3, edit: true, rotate: "self", hire: false, review: false },
    editor: { label: "Editor", level: 2, edit: true, rotate: "none", hire: false, review: false },
    viewer: { label: "Viewer", level: 1, edit: false, rotate: "none", hire: false, review: false }
  };

  var RANK_ORDER = ["viewer", "editor", "maintainer", "admin", "owner"];

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
  var review = null;
  var reviewBadgeCanvas = null;
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

  var KDF = {
    id: "pbkdf2-sha256",
    iterations: 600000,
    saltBytes: 16,
    keyBytes: 32
  };

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
  /* Staff codes                                                         */
  /*                                                                     */
  /* Codes are derived with PBKDF2-HMAC-SHA256, a per-account random     */
  /* salt, and a high iteration count, then stored as one string:        */
  /*   pbkdf2-sha256$<iterations>$<salt base64>$<key base64>             */
  /* A bare 64-hex value from an older staff.json is still accepted so   */
  /* nobody is locked out mid-upgrade; the editor asks for a rotation.   */
  /* ------------------------------------------------------------------ */

  function kdfAvailable() {
    return Boolean(
      window.crypto &&
        window.crypto.subtle &&
        typeof window.crypto.getRandomValues === "function" &&
        typeof window.TextEncoder === "function" &&
        typeof window.btoa === "function" &&
        typeof window.atob === "function"
    );
  }

  function toBase64(bytes) {
    var binary = "";

    for (var i = 0; i < bytes.length; i += 1) {
      binary += String.fromCharCode(bytes[i]);
    }

    return window.btoa(binary);
  }

  function fromBase64(text) {
    var binary = window.atob(text);
    var bytes = new Uint8Array(binary.length);

    for (var i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }

    return bytes;
  }

  function randomBytes(length) {
    var bytes = new Uint8Array(length);
    window.crypto.getRandomValues(bytes);
    return bytes;
  }

  function deriveCode(code, salt, iterations) {
    return window.crypto.subtle
      .importKey("raw", new window.TextEncoder().encode(code), "PBKDF2", false, [
        "deriveBits"
      ])
      .then(function (key) {
        return window.crypto.subtle.deriveBits(
          {
            name: "PBKDF2",
            salt: salt,
            iterations: iterations,
            hash: "SHA-256"
          },
          key,
          KDF.keyBytes * 8
        );
      })
      .then(function (buffer) {
        return new Uint8Array(buffer);
      });
  }

  function createCodeHash(code) {
    if (!kdfAvailable()) {
      return Promise.reject(new Error("unsupported"));
    }

    var salt = randomBytes(KDF.saltBytes);

    return deriveCode(code, salt, KDF.iterations).then(function (key) {
      return (
        KDF.id +
        "$" +
        KDF.iterations +
        "$" +
        toBase64(salt) +
        "$" +
        toBase64(key)
      );
    });
  }

  function sameText(left, right) {
    var a = String(left || "");
    var b = String(right || "");

    if (a.length !== b.length) {
      return false;
    }

    var diff = 0;

    for (var i = 0; i < a.length; i += 1) {
      diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return diff === 0;
  }

  function verifyCode(code, stored) {
    var value = String(stored || "").trim();

    if (!value) {
      return Promise.resolve({ ok: true, legacy: false });
    }

    if (/^pbkdf2-sha256\$/i.test(value)) {
      var parts = value.split("$");
      var iterations = parseInt(parts[1], 10);

      if (
        parts.length !== 4 ||
        !(iterations >= 1) ||
        iterations > 5000000 ||
        !parts[2] ||
        !parts[3]
      ) {
        return Promise.resolve({ ok: false, legacy: false });
      }

      var salt;

      try {
        salt = fromBase64(parts[2]);
      } catch (error) {
        return Promise.resolve({ ok: false, legacy: false });
      }

      return deriveCode(code, salt, iterations).then(function (key) {
        return { ok: sameText(toBase64(key), parts[3].trim()), legacy: false };
      });
    }

    return sha256(code).then(function (hash) {
      return { ok: sameText(hash, normaliseHash(value)), legacy: true };
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
    '        <button class="btn btn-primary" type="submit" data-staff-apply>Preview on this page</button>',
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

    '    <details class="staff-details" data-staff-review>',
    "      <summary>Review a creator application</summary>",
    "      <p>Admin and owner only. Choose the <code>.json</code> file an applicant downloaded. It is read in this browser and is never uploaded. The file is unsigned and self-reported, so confirm who sent it and check the evidence yourself.</p>",
    '      <div class="staff-actions">',
    '        <button class="btn btn-secondary" type="button" data-review-pick>Choose application file</button>',
    '        <input type="file" accept="application/json,.json" data-review-file hidden>',
    "      </div>",
    '      <p class="staff-msg" data-review-msg role="status"></p>',

    '      <div class="staff-review" data-review-body hidden tabindex="-1">',
    '        <div class="review-top">',
    "          <div>",
    '            <p class="staff-gen-label">Applicant</p>',
    '            <h3 class="review-name" data-review-name></h3>',
    '            <p class="review-sub" data-review-sub></p>',
    "          </div>",
    '          <span class="program-status program-status-open" data-review-state>In review</span>',
    "        </div>",

    '        <dl class="review-facts">',
    '          <div><dt>Project</dt><dd data-review-project></dd></div>',
    '          <div><dt>Project URL</dt><dd><a data-review-url target="_blank" rel="noopener"></a></dd></div>',
    '          <div><dt>Role claimed</dt><dd data-review-role></dd></div>',
    '          <div><dt>Platforms</dt><dd data-review-platforms></dd></div>',
    '          <div><dt>Discord</dt><dd data-review-discord></dd></div>',
    '          <div><dt>Discord user ID</dt><dd data-review-discord-id></dd></div>',
    '          <div><dt>File created</dt><dd data-review-created></dd></div>',
    "        </dl>",

    '        <p class="staff-gen-label">Evidence</p>',
    '        <div class="review-evidence" data-review-evidence></div>',

    '        <div data-review-notes-wrap hidden>',
    '          <p class="staff-gen-label">Notes</p>',
    '          <div class="review-evidence" data-review-notes></div>',
    "        </div>",

    '        <p class="staff-gen-label">Confirmations made by the applicant</p>',
    '        <ul class="review-confirm" data-review-confirm></ul>',

    '        <fieldset class="review-checks">',
    "          <legend>Review checklist</legend>",
    "          <p>All five must be checked before a decision. Accept only when you have opened the evidence links and are satisfied that the applicant speaks for the project.</p>",
    '          <label><input type="checkbox" data-review-check> I confirmed the applicant&rsquo;s Discord identity with them.</label>',
    '          <label><input type="checkbox" data-review-check> I opened the project URL and the evidence links.</label>',
    '          <label><input type="checkbox" data-review-check> I checked that the evidence supports ownership or authorization.</label>',
    '          <label><input type="checkbox" data-review-check> I found no conflicting claim or unresolved concern.</label>',
    '          <label><input type="checkbox" data-review-check> I understand a decision is final for this file and must be sent to the applicant myself.</label>',
    "        </fieldset>",

    '        <div class="staff-field">',
    '          <label for="staff-review-reason">Decline reason <span class="optional">Optional</span></label>',
    '          <textarea id="staff-review-reason" data-review-reason rows="2" placeholder="Included in the decline message if you fill it in"></textarea>',
    "        </div>",

    '        <div class="staff-actions">',
    '          <button class="btn btn-primary" type="button" data-review-accept disabled>Accept application</button>',
    '          <button class="btn btn-danger" type="button" data-review-decline disabled>Decline application</button>',
    '          <button class="staff-linkbtn" type="button" data-review-clear>Close review</button>',
    "        </div>",
    '        <p class="staff-msg" data-review-decision-msg role="status"></p>',

    '        <div class="staff-decision" data-review-accepted hidden tabindex="-1">',
    '          <p class="staff-gen-label">Verification ID</p>',
    '          <p class="staff-hash staff-gen-code" data-review-id></p>',
    '          <p class="staff-gen-label">Message to send to the applicant</p>',
    '          <pre class="staff-code" data-review-accept-message></pre>',
    '          <div class="staff-actions">',
    '            <button class="staff-linkbtn" type="button" data-review-copy-accept>Copy message</button>',
    '            <button class="btn btn-secondary" type="button" data-review-badge>Download badge PNG</button>',
    "          </div>",
    '          <p class="staff-msg" data-review-badge-msg role="status"></p>',
    '          <img class="review-badge" data-review-badge-preview alt="RedFCU Verified Creator badge preview" width="220" height="220" hidden>',
    "        </div>",

    '        <div class="staff-decision" data-review-declined hidden>',
    '          <p class="staff-gen-label">Message to send to the applicant</p>',
    '          <pre class="staff-code" data-review-decline-message></pre>',
    '          <div class="staff-actions">',
    '            <button class="staff-linkbtn" type="button" data-review-copy-decline>Copy message</button>',
    "          </div>",
    "        </div>",

    '        <div class="staff-actions" data-review-restart hidden>',
    '          <button class="btn btn-secondary" type="button" data-review-another>Start another review</button>',
    "        </div>",
    "      </div>",
    "    </details>",

    '    <details class="staff-details" data-staff-hire>',
    "      <summary>New staff account</summary>",
    "      <p>Owner only. Fill this in once and copy the account entry into <code>staff.json</code>. A six-word staff code is generated for you and shown a single time. Only its PBKDF2 hash is written to the file. Give the code to the person privately; the file is public, so a short code can be attacked offline.</p>",
    '      <div class="staff-grid">',
    '        <div class="staff-field">',
    '          <label for="staff-new-username">Discord username</label>',
    '          <input id="staff-new-username" type="text" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="username">',
    "        </div>",
    '        <div class="staff-field">',
    '          <label for="staff-new-display">Display name</label>',
    '          <input id="staff-new-display" type="text" autocomplete="off" spellcheck="false" placeholder="Name shown in the editor">',
    "        </div>",
    '        <div class="staff-field">',
    '          <label for="staff-new-id">Discord user ID</label>',
    '          <input id="staff-new-id" type="text" inputmode="numeric" autocomplete="off" spellcheck="false" placeholder="000000000000000000">',
    "        </div>",
    '        <div class="staff-field">',
    '          <label for="staff-new-role">Rank</label>',
    '          <select id="staff-new-role">',
    '            <option value="viewer">Viewer &mdash; read only</option>',
    '            <option value="editor" selected>Editor &mdash; preview release changes</option>',
    '            <option value="maintainer">Maintainer &mdash; also replace own code</option>',
    '            <option value="admin">Admin &mdash; also replace anyone&rsquo;s code</option>',
    '            <option value="owner">Owner &mdash; also hire</option>',
    "          </select>",
    "        </div>",
    "      </div>",
    '      <div class="staff-actions">',
    '        <button class="btn btn-secondary" type="button" data-staff-generate>Hire staff account</button>',
    "      </div>",
    '      <p class="staff-msg" data-staff-generate-msg role="status"></p>',
    '      <div class="staff-confirm" data-staff-confirm hidden>',
    '        <p class="staff-gen-label">Confirm it is you</p>',
    "        <p>Hiring takes the owner account and its staff code again. A different account is refused.</p>",
    '        <form class="staff-form" data-staff-confirm-form novalidate>',
    '          <div class="staff-field">',
    '            <label for="staff-confirm-user">Owner username or user ID</label>',
    '            <input id="staff-confirm-user" type="text" autocomplete="off" autocapitalize="none" spellcheck="false">',
    "          </div>",
    '          <div class="staff-field">',
    '            <label for="staff-confirm-code">Owner staff code</label>',
    '            <input id="staff-confirm-code" type="password" autocomplete="off" spellcheck="false">',
    "          </div>",
    '          <div class="staff-actions">',
    '            <button class="btn btn-primary" type="submit">Confirm and generate</button>',
    '            <button class="staff-linkbtn" type="button" data-staff-confirm-cancel>Cancel</button>',
    "          </div>",
    "        </form>",
    "      </div>",
    '      <div class="staff-gen" data-staff-generate-result hidden>',
    '        <p class="staff-gen-label">Staff code &mdash; give this to the person, once</p>',
    '        <p class="staff-hash staff-gen-code" data-staff-generate-code></p>',
    '        <div class="staff-actions">',
    '          <button class="staff-linkbtn" type="button" data-staff-copy-code>Copy staff code</button>',
    "        </div>",
    '        <p class="staff-gen-label">codeHash &mdash; public, goes in staff.json</p>',
    '        <p class="staff-hash" data-staff-generate-hash></p>',
    '        <div class="staff-actions">',
    '          <button class="staff-linkbtn" type="button" data-staff-copy-hash>Copy codeHash</button>',
    "        </div>",
    '        <p class="staff-gen-label">Account entry</p>',
    '        <pre class="staff-code" data-staff-generate-json></pre>',
    '        <div class="staff-actions">',
    '          <button class="staff-linkbtn" type="button" data-staff-copy-account>Copy account JSON</button>',
    "        </div>",
    "      </div>",
    "    </details>",

    '    <details class="staff-details" data-staff-replace>',
    "      <summary>Replace a staff code</summary>",
    "      <p>For a forgotten or leaked code. Nothing can be decoded from a stored hash, so the only way back is a new code: this generates one, derives it with PBKDF2-SHA256 (600,000 iterations and a random salt), and prints the entry to paste into <code>staff.json</code>. The old code stops working as soon as the new hash is published.</p>",
    '      <div class="staff-field">',
    '        <label for="staff-reset-user">Username or user ID</label>',
    '        <input id="staff-reset-user" type="text" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="username">',
    "      </div>",
    '      <div class="staff-actions">',
    '        <button class="btn btn-secondary" type="button" data-staff-replace-code>Generate new code</button>',
    "      </div>",
    '      <p class="staff-msg" data-staff-replace-msg role="status"></p>',
    '      <div class="staff-gen" data-staff-replace-result hidden>',
    '        <p class="staff-gen-label">New staff code &mdash; give it to the person, once</p>',
    '        <p class="staff-hash staff-gen-code" data-staff-replace-code-out></p>',
    '        <div class="staff-actions">',
    '          <button class="staff-linkbtn" type="button" data-staff-replace-copy-code>Copy staff code</button>',
    "        </div>",
    '        <p class="staff-gen-label">New codeHash &mdash; replaces the old value</p>',
    '        <p class="staff-hash" data-staff-replace-hash></p>',
    '        <div class="staff-actions">',
    '          <button class="staff-linkbtn" type="button" data-staff-replace-copy-hash>Copy codeHash</button>',
    "        </div>",
    '        <p class="staff-gen-label">Account entry, ready to paste</p>',
    '        <pre class="staff-code" data-staff-replace-json></pre>',
    '        <div class="staff-actions">',
    '          <button class="staff-linkbtn" type="button" data-staff-replace-copy-account>Copy account JSON</button>',
    "        </div>",
    "      </div>",
    "    </details>",

    '    <details class="staff-details">',
    "      <summary>Derive a codeHash from a code</summary>",
    "      <p>Runs PBKDF2-SHA256 with 600,000 iterations and a fresh random salt, then prints the whole value to paste into an account's <code>codeHash</code> field in <code>staff.json</code>. The file is public, so this only slows an offline guessing attack: choose a long, unique code.</p>",
    '      <div class="staff-field">',
    '        <label for="staff-code-source">Code to hash</label>',
    '        <input id="staff-code-source" type="text" autocomplete="off" spellcheck="false">',
    "      </div>",
    '      <div class="staff-actions">',
    '        <button class="btn btn-secondary" type="button" data-staff-hash>Derive codeHash</button>',
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
      hashOut: layer.querySelector("[data-staff-hash-out]"),
      genUser: layer.querySelector("#staff-new-username"),
      genDisplay: layer.querySelector("#staff-new-display"),
      genId: layer.querySelector("#staff-new-id"),
      genRole: layer.querySelector("#staff-new-role"),
      genBtn: layer.querySelector("[data-staff-generate]"),
      genMsg: layer.querySelector("[data-staff-generate-msg]"),
      genConfirm: layer.querySelector("[data-staff-confirm]"),
      genConfirmForm: layer.querySelector("[data-staff-confirm-form]"),
      genConfirmUser: layer.querySelector("#staff-confirm-user"),
      genConfirmCode: layer.querySelector("#staff-confirm-code"),
      genConfirmCancel: layer.querySelector("[data-staff-confirm-cancel]"),
      genResult: layer.querySelector("[data-staff-generate-result]"),
      genCode: layer.querySelector("[data-staff-generate-code]"),
      genHash: layer.querySelector("[data-staff-generate-hash]"),
      genJSON: layer.querySelector("[data-staff-generate-json]"),
      genCopyCode: layer.querySelector("[data-staff-copy-code]"),
      genCopyHash: layer.querySelector("[data-staff-copy-hash]"),
      genCopyAccount: layer.querySelector("[data-staff-copy-account]"),
      replaceUser: layer.querySelector("#staff-reset-user"),
      replaceBtn: layer.querySelector("[data-staff-replace-code]"),
      replaceMsg: layer.querySelector("[data-staff-replace-msg]"),
      replaceResult: layer.querySelector("[data-staff-replace-result]"),
      replaceCode: layer.querySelector("[data-staff-replace-code-out]"),
      replaceHash: layer.querySelector("[data-staff-replace-hash]"),
      replaceJSON: layer.querySelector("[data-staff-replace-json]"),
      replaceCopyCode: layer.querySelector("[data-staff-replace-copy-code]"),
      replaceCopyHash: layer.querySelector("[data-staff-replace-copy-hash]"),
      replaceCopyAccount: layer.querySelector("[data-staff-replace-copy-account]"),
      apply: layer.querySelector("[data-staff-apply]"),
      hireSection: layer.querySelector("[data-staff-hire]"),
      replaceSection: layer.querySelector("[data-staff-replace]"),
      reviewSection: layer.querySelector("[data-staff-review]"),
      reviewPick: layer.querySelector("[data-review-pick]"),
      reviewFile: layer.querySelector("[data-review-file]"),
      reviewMsg: layer.querySelector("[data-review-msg]"),
      reviewBody: layer.querySelector("[data-review-body]"),
      reviewName: layer.querySelector("[data-review-name]"),
      reviewSub: layer.querySelector("[data-review-sub]"),
      reviewState: layer.querySelector("[data-review-state]"),
      reviewProject: layer.querySelector("[data-review-project]"),
      reviewUrl: layer.querySelector("[data-review-url]"),
      reviewRole: layer.querySelector("[data-review-role]"),
      reviewPlatforms: layer.querySelector("[data-review-platforms]"),
      reviewDiscord: layer.querySelector("[data-review-discord]"),
      reviewDiscordId: layer.querySelector("[data-review-discord-id]"),
      reviewCreated: layer.querySelector("[data-review-created]"),
      reviewEvidence: layer.querySelector("[data-review-evidence]"),
      reviewNotesWrap: layer.querySelector("[data-review-notes-wrap]"),
      reviewNotes: layer.querySelector("[data-review-notes]"),
      reviewConfirm: layer.querySelector("[data-review-confirm]"),
      reviewChecks: layer.querySelectorAll("[data-review-check]"),
      reviewReason: layer.querySelector("[data-review-reason]"),
      reviewAccept: layer.querySelector("[data-review-accept]"),
      reviewDecline: layer.querySelector("[data-review-decline]"),
      reviewClear: layer.querySelector("[data-review-clear]"),
      reviewDecisionMsg: layer.querySelector("[data-review-decision-msg]"),
      reviewAccepted: layer.querySelector("[data-review-accepted]"),
      reviewID: layer.querySelector("[data-review-id]"),
      reviewAcceptMessage: layer.querySelector("[data-review-accept-message]"),
      reviewCopyAccept: layer.querySelector("[data-review-copy-accept]"),
      reviewBadgeBtn: layer.querySelector("[data-review-badge]"),
      reviewBadgeMsg: layer.querySelector("[data-review-badge-msg]"),
      reviewBadgePreview: layer.querySelector("[data-review-badge-preview]"),
      reviewDeclined: layer.querySelector("[data-review-declined]"),
      reviewDeclineMessage: layer.querySelector("[data-review-decline-message]"),
      reviewCopyDecline: layer.querySelector("[data-review-copy-decline]"),
      reviewRestart: layer.querySelector("[data-review-restart]"),
      reviewAnother: layer.querySelector("[data-review-another]")
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
      /* A remembered session reopens the panel without a sign-in, so the
         roster may not have been fetched yet. Hire and code rotation both
         need it; loadRoster() is cached, so this is cheap on every open. */
      loadRoster().catch(function () {});
    } else {
      showSignin();
    }

    ui.layer.hidden = false;
    ui.layer.classList.add("is-open");
    document.body.classList.add("staff-open");

    var target = session ? (ui.version.disabled ? ui.panel : ui.version) : ui.user;

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
    if (!roster) {
      return null;
    }

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
      role: String(account.role || "").toLowerCase(),
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

        var hasCode = String(account.codeHash || "").trim();

        if (!hasCode) {
          grant(account);
          return;
        }

        if (!ui.code.value) {
          ui.codeWrap.hidden = false;
          setMessage(ui.msg, "This account also needs its staff code.");
          ui.code.focus();
          return;
        }

        verifyCode(ui.code.value, account.codeHash)
          .then(function (result) {
            if (!result.ok) {
              setMessage(ui.msg, "That staff code does not match this account.");
              ui.code.focus();
              ui.code.select();
              return;
            }

            grant(account);

            if (result.legacy) {
              setMessage(
                ui.replaceMsg,
                "This account still uses the old single-hash code. Open “Replace a staff code” and generate a PBKDF2 code, then upload the new hash."
              );
            }
          })
          .catch(function () {
            setMessage(
              ui.msg,
              "This browser cannot derive the staff code hash. Open the site over HTTPS or on localhost and try again."
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

  function applyPermissions(account) {
    var rank = rankOf(account);
    var editable = rank.edit;

    [ui.version, ui.date, ui.package, ui.size].forEach(function (field) {
      field.disabled = !editable;
    });

    ui.apply.hidden = !editable;
    ui.save.hidden = !editable;
    ui.copy.hidden = !editable;
    ui.reset.hidden = !editable;

    ui.hireSection.hidden = !rank.hire;
    ui.replaceSection.hidden = rank.rotate === "none";
    ui.reviewSection.hidden = !rank.review;
  }

  function enterEditor() {
    var data = activeRelease();
    /* The roster may not have loaded yet when a remembered session reopens the
       panel, so fall back to what the session itself recorded. */
    var account =
      signedInAccount() ||
      (session
        ? { username: session.username, displayName: session.displayName, role: session.role }
        : null);

    ui.signin.hidden = true;
    ui.editor.hidden = false;
    ui.who.textContent = session
      ? "Signed in as " +
        session.displayName +
        " \u00b7 " +
        rankLabel(account) +
        ". Changes stay in this browser."
      : "";

    fillEditor(data);
    renderJSON(data);
    setMessage(ui.editMsg, "");
    applyPermissions(account);
  }

  function requireEdit() {
    var account = signedInAccount();

    if (rankOf(account).edit) {
      return true;
    }

    setMessage(
      ui.editMsg,
      "Your rank (" + rankLabel(account) + ") is read-only, so it cannot change release details."
    );

    return false;
  }

  function handleApply(event) {
    if (event) {
      event.preventDefault();
    }

    if (!requireEdit()) {
      return false;
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
    if (!requireEdit()) {
      return;
    }

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
    if (!requireEdit()) {
      return;
    }

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
    if (!requireEdit()) {
      return;
    }

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

  var CODE_WORDS = [
    "amber", "anchor", "arbor", "aspen", "basalt", "birch", "bison", "bloom",
    "cedar", "cipher", "clover", "comet", "coral", "crag", "delta", "dune",
    "ember", "falcon", "fern", "fjord", "flint", "forge", "garnet", "glacier",
    "glade", "granite", "grove", "harbor", "hazel", "heron", "hollow", "indigo",
    "ivy", "jasper", "juniper", "kestrel", "lagoon", "larch", "lumen", "maple",
    "meadow", "mesa", "moss", "nectar", "oak", "onyx", "osprey", "pebble",
    "pine", "quartz", "quill", "raven", "reef", "ridge", "river", "rowan",
    "sage", "slate", "solar", "spruce", "summit", "thistle", "timber", "valley",
    "violet", "willow", "zephyr"
  ];

  function randomBelow(max) {
    if (window.crypto && typeof window.crypto.getRandomValues === "function") {
      var buffer = new Uint32Array(1);
      var limit = Math.floor(4294967296 / max) * max;
      var value = 0;

      do {
        window.crypto.getRandomValues(buffer);
        value = buffer[0];
      } while (value >= limit);

      return value % max;
    }

    return Math.floor(Math.random() * max);
  }

  function makeStaffCode() {
    var words = [];
    var used = {};
    var needed = 6;

    while (words.length < needed) {
      var word = CODE_WORDS[randomBelow(CODE_WORDS.length)];

      if (!used[word]) {
        used[word] = true;
        words.push(word);
      }
    }

    var digits = String(randomBelow(10000));

    while (digits.length < 4) {
      digits = "0" + digits;
    }

    return words.join("-") + "-" + digits;
  }

  function copyResult(text, message, target) {
    var node = target || ui.genMsg;

    if (!text) {
      return;
    }

    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      navigator.clipboard.writeText(text).then(
        function () {
          setMessage(node, message, true);
        },
        function () {
          setMessage(
            node,
            "Copying is blocked in this browser. Select the text and copy it manually."
          );
        }
      );
      return;
    }

    setMessage(
      node,
      "Copying is not available in this browser. Select the text and copy it manually."
    );
  }

  function clearGeneratedAccount() {
    if (ui.genConfirm && !ui.genConfirm.hidden) {
      hideHireConfirm();
      setMessage(ui.genMsg, "Details changed. Press Hire staff account again.");
      return;
    }

    if (!ui.genResult || ui.genResult.hidden) {
      return;
    }

    ui.genResult.hidden = true;
    ui.genCode.textContent = "";
    ui.genHash.textContent = "";
    ui.genJSON.textContent = "";
    setMessage(ui.genMsg, "Details changed. Hire the account again for a matching code and entry.");
  }

  function readNewAccount() {
    var username = ui.genUser.value.trim().replace(/^@/, "");
    var displayName = ui.genDisplay.value.trim();
    var userId = ui.genId.value.trim();
    var errors = [];

    if (!username) {
      errors.push("Enter the Discord username first.");
    }

    if (userId && !/^\d{5,25}$/.test(userId)) {
      errors.push(
        "A Discord user ID is digits only, usually 17 to 19 of them. Leave it empty if you do not have it."
      );
    }

    return {
      ok: errors.length === 0,
      errors: errors,
      details: {
        username: username,
        displayName: displayName || username,
        userId: userId,
        role: ui.genRole.value
      }
    };
  }

  function signedInAccount() {
    var found = session ? findAccount(session.username) : null;

    if (found) {
      return found;
    }

    /* Fall back to what the saved session recorded, so hire and rotation work
       on the first click even if the roster is still being fetched. */
    return session
      ? {
          username: session.username,
          displayName: session.displayName,
          role: session.role
        }
      : null;
  }

  function rankOf(account) {
    var key = String((account && account.role) || "").toLowerCase();
    return RANKS[key] || RANKS.viewer;
  }

  function rankLabel(account) {
    return rankOf(account).label;
  }

  function isOwner(account) {
    return Boolean(account) && String(account.role || "").toLowerCase() === "owner";
  }

  function isSameAccount(a, b) {
    if (!a || !b) {
      return false;
    }

    if (
      a.username &&
      b.username &&
      String(a.username).toLowerCase() === String(b.username).toLowerCase()
    ) {
      return true;
    }

    return Boolean(a.userId) && String(a.userId) === String(b.userId || "");
  }

  function canRotateCode(me, target) {
    var how = rankOf(me).rotate;

    if (how === "all") {
      return true;
    }

    if (isSameAccount(me, target)) {
      return how === "team" || how === "self";
    }

    return how === "team" && rankOf(target).level < RANKS.owner.level;
  }

  function hideHireConfirm() {
    ui.genConfirm.hidden = true;
    ui.genConfirmUser.value = "";
    ui.genConfirmCode.value = "";
  }

  function handleHireStart() {
    var account = signedInAccount();

    if (!isOwner(account)) {
      hideHireConfirm();
      setMessage(
        ui.genMsg,
        "Only the owner account can hire staff. This browser is signed in as " +
          (session ? session.displayName : "nobody") +
          ". Sign in with the owner account to continue."
      );
      return;
    }

    var result = readNewAccount();

    if (!result.ok) {
      setMessage(ui.genMsg, result.errors.join(" "));
      (result.errors[0].indexOf("username") >= 0 ? ui.genUser : ui.genId).focus();
      return;
    }

    ui.genResult.hidden = true;
    ui.genConfirm.hidden = false;
    ui.genConfirmUser.value = account.username || account.userId || "";
    ui.genConfirmCode.value = "";
    setMessage(
      ui.genMsg,
      "Confirm the owner account and staff code to hire " + result.details.username + ".",
      true
    );
    ui.genConfirmCode.focus();
  }

  function handleHireConfirm(event) {
    if (event) {
      event.preventDefault();
    }

    var account = signedInAccount();

    if (!isOwner(account)) {
      hideHireConfirm();
      setMessage(ui.genMsg, "Only the owner account can hire staff.");
      return;
    }

    var entered = ui.genConfirmUser.value.trim().replace(/^@/, "");
    var code = ui.genConfirmCode.value;

    if (!entered) {
      setMessage(ui.genMsg, "Enter the owner username or user ID.");
      ui.genConfirmUser.focus();
      return;
    }

    if (!code) {
      setMessage(ui.genMsg, "Enter the owner staff code.");
      ui.genConfirmCode.focus();
      return;
    }

    var enteredAccount = findAccount(entered);

    if (!enteredAccount) {
      setMessage(ui.genMsg, "That account is not on the staff list.");
      ui.genConfirmUser.focus();
      return;
    }

    if (!isOwner(enteredAccount)) {
      setMessage(ui.genMsg, "That account is not the owner. Hiring is refused.");
      ui.genConfirmUser.focus();
      return;
    }

    var sameUsername =
      String(enteredAccount.username || "").toLowerCase() ===
      String(session.username || "").toLowerCase();
    var sameUserId =
      String(enteredAccount.userId || "") === String(session.username || "");

    if (!sameUsername && !sameUserId) {
      setMessage(
        ui.genMsg,
        "That is not the account signed in in this browser. Hiring is refused."
      );
      ui.genConfirmUser.focus();
      return;
    }

    var hasCode = String(enteredAccount.codeHash || "").trim();

    if (!hasCode) {
      setMessage(
        ui.genMsg,
        "The owner account has no staff code set. Add one before hiring."
      );
      return;
    }

    var result = readNewAccount();

    if (!result.ok) {
      hideHireConfirm();
      setMessage(ui.genMsg, result.errors.join(" "));
      return;
    }

    verifyCode(code, enteredAccount.codeHash)
      .then(function (verdict) {
        if (!verdict.ok) {
          setMessage(
            ui.genMsg,
            "That staff code does not match the owner account. Hiring is refused."
          );
          ui.genConfirmCode.focus();
          ui.genConfirmCode.select();
          return;
        }

        hideHireConfirm();
        generateAccount(result.details);
      })
      .catch(function () {
        setMessage(
          ui.genMsg,
          "Hashing needs a secure page. Open the site over HTTPS or on localhost and try again."
        );
      });
  }

  function generateAccount(details) {
    var code = makeStaffCode();

    createCodeHash(code)
      .then(function (hash) {
        var account = {
          username: details.username,
          displayName: details.displayName
        };

        if (details.userId) {
          account.userId = details.userId;
        }

        account.role = details.role;
        account.enabled = true;
        account.codeHash = hash;

        ui.genCode.textContent = code;
        ui.genHash.textContent = hash;
        ui.genJSON.textContent = JSON.stringify(account, null, 2);
        ui.genResult.hidden = false;
        setMessage(
          ui.genMsg,
          "Account generated. Copy the staff code now and give it to the person privately. Only the codeHash belongs in staff.json.",
          true
        );
      })
      .catch(function () {
        setMessage(
          ui.genMsg,
          "Hashing needs a secure page. Open the site over HTTPS or on localhost and try again."
        );
      });
  }

  function clearReplacedCode() {
    if (!ui.replaceResult || ui.replaceResult.hidden) {
      return;
    }

    ui.replaceResult.hidden = true;
    ui.replaceCode.textContent = "";
    ui.replaceHash.textContent = "";
    ui.replaceJSON.textContent = "";
    setMessage(
      ui.replaceMsg,
      "Account changed. Generate again, then send the new codeHash to whoever uploads the file."
    );
  }

  function handleReplaceCode() {
    var query = ui.replaceUser.value.trim().replace(/^@/, "");

    if (!query) {
      setMessage(ui.replaceMsg, "Enter the username or user ID to give a new code to.");
      ui.replaceUser.focus();
      return;
    }

    loadRoster().then(function () {
      var account = findAccount(query);

      if (!account) {
        setMessage(ui.replaceMsg, "That account is not on the staff list.");
        ui.replaceUser.focus();
        ui.replaceUser.select();
        return;
      }

      var me = signedInAccount();

      if (!canRotateCode(me, account)) {
        var rank = rankLabel(me);
        setMessage(
          ui.replaceMsg,
          "Your rank (" +
            rank +
            ") cannot replace " +
            (isSameAccount(me, account) ? "your own" : "that") +
            " code. Ask an admin or the owner."
        );
        return;
      }

      var code = makeStaffCode();

      createCodeHash(code)
        .then(function (hash) {
          var entry = {
            username: account.username,
            displayName: account.displayName || account.username
          };

          if (account.userId) {
            entry.userId = account.userId;
          }

          entry.role = account.role || "editor";
          entry.enabled = account.enabled !== false;
          entry.codeHash = hash;

          ui.replaceCode.textContent = code;
          ui.replaceHash.textContent = hash;
          ui.replaceJSON.textContent = JSON.stringify(entry, null, 2);
          ui.replaceResult.hidden = false;
          setMessage(
            ui.replaceMsg,
            "New code generated for " +
              (account.displayName || account.username) +
              ". Copy it now; only the hash goes into staff.json.",
            true
          );
        })
        .catch(function () {
          setMessage(
            ui.replaceMsg,
            "Hashing needs a secure page. Open the site over HTTPS or on localhost and try again."
          );
        });
    });
  }

  function handleHash() {
    var value = ui.codeSource.value;

    if (!value) {
      ui.hashOut.textContent = "Enter a code first.";
      return;
    }

    createCodeHash(value)
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

  /* ------------------------------------------------------------------ */
  /* Verified Creator review                                             */
  /* ------------------------------------------------------------------ */

  var APPLICATION_TYPE = "redfcu.verified-creator.application";
  var APPLICATION_LIMIT = 262144;

  var ROLE_LABELS = {
    owner: "Owner",
    "co-owner": "Co-owner",
    "authorized-representative": "Authorized representative",
    "team-member": "Team member"
  };

  var PLATFORM_LABELS = {
    discord: "Discord",
    github: "GitHub",
    unity: "Unity Asset Store",
    itch: "itch.io",
    steam: "Steam",
    youtube: "YouTube",
    x: "X",
    other: "Other"
  };

  var CONFIRM_LABELS = [
    ["accurate", "Information is accurate and complete"],
    ["authority", "Owner or authorized representative"],
    ["notLegal", "Understands this is not a legal determination"],
    ["notPlatform", "Understands the badge is Red FCU-issued only"],
    ["mayDecline", "Understands Red FCU may decline"]
  ];

  function cleanText(value, max, required) {
    if (typeof value !== "string") {
      return null;
    }

    var text = value.trim();

    if (required && !text) {
      return null;
    }

    if (text.length > max) {
      return null;
    }

    return text;
  }

  function isWebUrl(text) {
    if (!/^https?:\/\/[^\s]+$/i.test(text)) {
      return false;
    }

    try {
      var url = new window.URL(text);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch (error) {
      return false;
    }
  }

  function sanitiseApplication(data) {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return null;
    }

    if (data.type !== APPLICATION_TYPE || data.version !== 1) {
      return null;
    }

    var app = data.application;

    if (!app || typeof app !== "object" || Array.isArray(app)) {
      return null;
    }

    var created = cleanText(data.created, 40, true);

    if (!created || isNaN(new Date(created).getTime())) {
      return null;
    }

    var name = cleanText(app.name, 120, true);
    var discord = cleanText(app.discord, 80, true);
    var projectName = cleanText(app.projectName, 120, true);
    var projectUrl = cleanText(app.projectUrl, 300, true);
    var evidence = cleanText(app.evidence, 4000, true);
    var notes = cleanText(app.notes === undefined ? "" : app.notes, 2000, false);
    var discordId = cleanText(app.discordId === undefined ? "" : app.discordId, 25, false);
    var role = cleanText(app.role, 40, true);

    if (!name || !discord || !projectName || !projectUrl || !evidence || notes === null) {
      return null;
    }

    if (!isWebUrl(projectUrl) || !ROLE_LABELS[role] || discordId === null) {
      return null;
    }

    if (discordId && !/^\d{5,25}$/.test(discordId)) {
      return null;
    }

    if (!Array.isArray(app.platforms) || !app.platforms.length || app.platforms.length > 12) {
      return null;
    }

    var platforms = [];
    var seen = {};

    for (var i = 0; i < app.platforms.length; i += 1) {
      var key = cleanText(app.platforms[i], 20, true);

      if (!key || !PLATFORM_LABELS[key] || seen[key]) {
        return null;
      }

      seen[key] = true;
      platforms.push(key);
    }

    var confirmations = data.confirmations;

    if (!confirmations || typeof confirmations !== "object") {
      return null;
    }

    for (var c = 0; c < CONFIRM_LABELS.length; c += 1) {
      if (confirmations[CONFIRM_LABELS[c][0]] !== true) {
        return null;
      }
    }

    return {
      created: created,
      name: name,
      discord: discord,
      discordId: discordId,
      projectName: projectName,
      projectUrl: projectUrl,
      role: role,
      platforms: platforms,
      evidence: evidence,
      notes: notes
    };
  }

  function canReview() {
    var account = signedInAccount();

    if (rankOf(account).review) {
      return true;
    }

    setMessage(
      ui.reviewMsg,
      "Your rank (" + rankLabel(account) + ") cannot review applications. Admin or owner is required."
    );

    return false;
  }

  function formatCreated(iso) {
    var date = new Date(iso);

    if (isNaN(date.getTime())) {
      return iso;
    }

    try {
      return date.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (error) {
      return iso;
    }
  }

  function setReviewState(label, open) {
    if (!ui.reviewState) {
      return;
    }

    ui.reviewState.textContent = label;
    ui.reviewState.className =
      "program-status " + (open ? "program-status-open" : "program-status-closed");
  }

  function allChecks() {
    for (var i = 0; i < ui.reviewChecks.length; i += 1) {
      if (!ui.reviewChecks[i].checked) {
        return false;
      }
    }

    return ui.reviewChecks.length > 0;
  }

  function updateReviewButtons() {
    var decided =
      Boolean(review) &&
      (!ui.reviewAccepted.hidden || !ui.reviewDeclined.hidden);
    var ready = Boolean(review) && !decided && allChecks();

    ui.reviewAccept.disabled = !ready;
    ui.reviewDecline.disabled = !ready;
  }

  function resetReviewUI() {
    review = null;
    reviewBadgeCanvas = null;

    if (!ui.reviewBody) {
      return;
    }

    ui.reviewBody.hidden = true;
    ui.reviewFile.value = "";
    ui.reviewAccepted.hidden = true;
    ui.reviewDeclined.hidden = true;
    ui.reviewRestart.hidden = true;
    ui.reviewDecisionMsg.textContent = "";
    ui.reviewReason.value = "";
    ui.reviewBadgePreview.hidden = true;
    ui.reviewBadgePreview.removeAttribute("src");
    setMessage(ui.reviewBadgeMsg, "");
    setReviewState("In review", true);

    for (var i = 0; i < ui.reviewChecks.length; i += 1) {
      ui.reviewChecks[i].checked = false;
      ui.reviewChecks[i].disabled = false;
    }

    updateReviewButtons();
  }

  function renderReview(app) {
    review = app;
    reviewBadgeCanvas = null;

    ui.reviewBody.hidden = false;
    ui.reviewAccepted.hidden = true;
    ui.reviewDeclined.hidden = true;
    ui.reviewRestart.hidden = true;
    ui.reviewDecisionMsg.textContent = "";
    ui.reviewReason.value = "";
    ui.reviewBadgePreview.hidden = true;
    ui.reviewBadgePreview.removeAttribute("src");
    setMessage(ui.reviewBadgeMsg, "");
    setReviewState("In review", true);

    for (var i = 0; i < ui.reviewChecks.length; i += 1) {
      ui.reviewChecks[i].checked = false;
      ui.reviewChecks[i].disabled = false;
    }

    ui.reviewName.textContent = app.name;
    ui.reviewSub.textContent =
      app.projectName + " \u00b7 " + ROLE_LABELS[app.role];
    ui.reviewProject.textContent = app.projectName;
    ui.reviewUrl.textContent = app.projectUrl;
    ui.reviewUrl.href = app.projectUrl;
    ui.reviewRole.textContent = ROLE_LABELS[app.role];
    ui.reviewPlatforms.textContent = app.platforms
      .map(function (key) {
        return PLATFORM_LABELS[key];
      })
      .join(", ");
    ui.reviewDiscord.textContent = app.discord;
    ui.reviewDiscordId.textContent = app.discordId || "Not supplied";
    ui.reviewCreated.textContent = formatCreated(app.created);
    ui.reviewEvidence.textContent = app.evidence;
    ui.reviewNotes.textContent = app.notes;
    ui.reviewNotesWrap.hidden = !app.notes;

    ui.reviewConfirm.textContent = "";

    CONFIRM_LABELS.forEach(function (pair) {
      var item = document.createElement("li");
      var mark = document.createElement("span");
      var text = document.createElement("span");

      mark.className = "review-confirm-mark";
      mark.setAttribute("aria-hidden", "true");
      mark.textContent = "\u2713";
      text.textContent = pair[1] + " \u2014 confirmed";
      item.appendChild(mark);
      item.appendChild(text);
      ui.reviewConfirm.appendChild(item);
    });

    updateReviewButtons();
    ui.reviewBody.focus();
  }

  function loadApplicationText(text, source) {
    if (!canReview()) {
      return;
    }

    var parsed = null;

    try {
      parsed = JSON.parse(String(text));
    } catch (error) {
      setMessage(
        ui.reviewMsg,
        "That file is not valid JSON. Ask the applicant to download it again."
      );
      return;
    }

    var app = sanitiseApplication(parsed);

    if (!app) {
      setMessage(
        ui.reviewMsg,
        "That file is not a complete RedFCU Verified Creator application (version 1). Ask the applicant to download it again from the application page."
      );
      return;
    }

    setMessage(ui.reviewMsg, "Loaded " + app.projectName + " from " + source + ".", true);
    renderReview(app);
  }

  function handleReviewFile() {
    var file = ui.reviewFile.files && ui.reviewFile.files[0];

    if (!file) {
      return;
    }

    ui.reviewFile.value = "";

    if (!canReview()) {
      return;
    }

    if (file.size > APPLICATION_LIMIT) {
      setMessage(
        ui.reviewMsg,
        "That file is larger than 256 KB. A Red FCU application file should be much smaller."
      );
      return;
    }

    var reader = new window.FileReader();

    reader.onload = function () {
      loadApplicationText(reader.result, file.name);
    };

    reader.onerror = function () {
      setMessage(ui.reviewMsg, "That file could not be read. Try choosing it again.");
    };

    reader.readAsText(file);
  }

  function makeVerificationID() {
    var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    var out = "";

    for (var i = 0; i < 6; i += 1) {
      out += chars.charAt(randomBelow(chars.length));
    }

    return "RFCU-VC-" + new Date().getFullYear() + "-" + out;
  }

  function buildAcceptMessage(app, id) {
    return [
      "Hi " + app.name + ",",
      "",
      'Your RedFCU Verified Creator application for "' + app.projectName + '" has been accepted.',
      "",
      "Verification ID: " + id,
      "Project: " + app.projectName,
      "Project URL: " + app.projectUrl,
      "Platforms: " +
        app.platforms
          .map(function (key) {
            return PLATFORM_LABELS[key];
          })
          .join(", "),
      "Verified creator: " + app.name,
      "",
      "You may display the attached RedFCU Verified Creator badge. Keep it unaltered and use it only for this project. Verification records the result of Red FCU's own review; it is not a legal determination of ownership, not legal advice, and not platform-issued verification.",
      "",
      "If the project changes hands or the information above becomes inaccurate, tell Red FCU so the badge and record can be withdrawn."
    ].join("\n");
  }

  function buildDeclineMessage(app, reason) {
    var lines = [
      "Hi " + app.name + ",",
      "",
      'Thank you for applying for RedFCU Verified Creator for "' + app.projectName + '".',
      "",
      "After reviewing the application, Red FCU is unable to verify this project at this time."
    ];

    if (reason) {
      lines.push("");
      lines.push("Reason: " + reason);
    }

    lines.push("");
    lines.push(
      "You may apply again later with updated or additional evidence. This decision is not a finding that you do not own the project, and it is not a legal determination of ownership."
    );

    return lines.join("\n");
  }

  function drawCreatorBadge() {
    var canvas = document.createElement("canvas");
    var ctx = canvas.getContext ? canvas.getContext("2d") : null;

    if (!ctx) {
      return null;
    }

    canvas.width = 512;
    canvas.height = 512;

    var background = ctx.createRadialGradient(176, 140, 30, 256, 256, 360);
    background.addColorStop(0, "#1b2436");
    background.addColorStop(1, "#070910");
    ctx.beginPath();
    ctx.arc(256, 256, 250, 0, Math.PI * 2);
    ctx.fillStyle = background;
    ctx.fill();

    var ring = ctx.createLinearGradient(40, 40, 472, 472);
    ring.addColorStop(0, "#78a1ff");
    ring.addColorStop(0.5, "#b78cff");
    ring.addColorStop(1, "#2f5fd8");
    ctx.beginPath();
    ctx.arc(256, 256, 240, 0, Math.PI * 2);
    ctx.lineWidth = 7;
    ctx.strokeStyle = ring;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(256, 256, 222, 0, Math.PI * 2);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "rgba(238, 241, 248, 0.14)";
    ctx.stroke();

    var red = ctx.createRadialGradient(228, 166, 10, 256, 196, 100);
    red.addColorStop(0, "#c0392b");
    red.addColorStop(1, "#8a1710");
    ctx.beginPath();
    ctx.arc(256, 196, 94, 0, Math.PI * 2);
    ctx.fillStyle = red;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(256, 196, 76, 0, Math.PI * 2);
    ctx.fillStyle = "#0a0d15";
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(256, 143);
    ctx.quadraticCurveTo(264, 187, 308, 196);
    ctx.quadraticCurveTo(264, 205, 256, 249);
    ctx.quadraticCurveTo(248, 205, 204, 196);
    ctx.quadraticCurveTo(248, 187, 256, 143);
    ctx.closePath();
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#eef1f8";
    ctx.font = '700 44px ui-sans-serif, system-ui, "Segoe UI", Arial, sans-serif';
    ctx.fillText("RED FCU", 256, 334);

    var divider = ctx.createLinearGradient(196, 0, 316, 0);
    divider.addColorStop(0, "rgba(120, 161, 255, 0)");
    divider.addColorStop(0.5, "rgba(183, 140, 255, 0.9)");
    divider.addColorStop(1, "rgba(120, 161, 255, 0)");
    ctx.fillStyle = divider;
    ctx.fillRect(196, 363, 120, 2);

    try {
      ctx.letterSpacing = "5px";
    } catch (error) {
      /* Older canvas implementations ignore letter spacing. */
    }

    ctx.fillStyle = "#a9c1ff";
    ctx.font = '600 21px ui-monospace, "Cascadia Code", Consolas, monospace';
    ctx.fillText("VERIFIED", 256, 396);

    try {
      ctx.letterSpacing = "3px";
    } catch (error) {
      /* Ignore. */
    }

    ctx.fillStyle = "#eef1f8";
    ctx.font = '700 24px ui-sans-serif, system-ui, "Segoe UI", Arial, sans-serif';
    ctx.fillText("CREATOR", 256, 430);

    try {
      ctx.letterSpacing = "0px";
    } catch (error) {
      /* Ignore. */
    }

    return canvas;
  }

  function triggerDownload(href, name) {
    var link = document.createElement("a");

    link.href = href;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleBadgeDownload() {
    if (!review || !reviewBadgeCanvas) {
      setMessage(ui.reviewBadgeMsg, "Accept the application first to create the badge.");
      return;
    }

    var name =
      "redfcu-verified-creator-badge-" + (ui.reviewID.textContent || "badge") + ".png";

    if (typeof reviewBadgeCanvas.toBlob === "function") {
      reviewBadgeCanvas.toBlob(function (blob) {
        if (!blob) {
          setMessage(ui.reviewBadgeMsg, "The badge could not be created in this browser.");
          return;
        }

        var url = window.URL.createObjectURL(blob);

        triggerDownload(url, name);
        window.setTimeout(function () {
          window.URL.revokeObjectURL(url);
        }, 1000);
        setMessage(ui.reviewBadgeMsg, "Badge downloaded. Send it with the message above.", true);
      }, "image/png");
      return;
    }

    try {
      triggerDownload(reviewBadgeCanvas.toDataURL("image/png"), name);
      setMessage(ui.reviewBadgeMsg, "Badge downloaded. Send it with the message above.", true);
    } catch (error) {
      setMessage(ui.reviewBadgeMsg, "The badge could not be created in this browser.");
    }
  }

  function lockDecision() {
    for (var i = 0; i < ui.reviewChecks.length; i += 1) {
      ui.reviewChecks[i].disabled = true;
    }

    ui.reviewAccept.disabled = true;
    ui.reviewDecline.disabled = true;
  }

  function handleAccept() {
    if (!review || !canReview()) {
      return;
    }

    if (!allChecks()) {
      setMessage(
        ui.reviewDecisionMsg,
        "Complete the review checklist before accepting the application."
      );
      return;
    }

    var id = makeVerificationID();

    ui.reviewID.textContent = id;
    ui.reviewAcceptMessage.textContent = buildAcceptMessage(review, id);
    ui.reviewAccepted.hidden = false;
    ui.reviewDeclined.hidden = true;
    ui.reviewRestart.hidden = false;
    setReviewState("Accepted", true);
    setMessage(
      ui.reviewDecisionMsg,
      "Accepted. Send the message and the badge to the applicant yourself. Nothing is sent automatically.",
      true
    );
    lockDecision();

    reviewBadgeCanvas = drawCreatorBadge();

    if (reviewBadgeCanvas) {
      try {
        ui.reviewBadgePreview.src = reviewBadgeCanvas.toDataURL("image/png");
        ui.reviewBadgePreview.hidden = false;
      } catch (error) {
        ui.reviewBadgePreview.hidden = true;
      }
    }

    ui.reviewAccepted.focus();
  }

  function handleDecline() {
    if (!review || !canReview()) {
      return;
    }

    if (!allChecks()) {
      setMessage(
        ui.reviewDecisionMsg,
        "Complete the review checklist before declining the application."
      );
      return;
    }

    var reason = String(ui.reviewReason.value || "").trim().slice(0, 500);

    ui.reviewDeclineMessage.textContent = buildDeclineMessage(review, reason);
    ui.reviewDeclined.hidden = false;
    ui.reviewAccepted.hidden = true;
    ui.reviewRestart.hidden = false;
    setReviewState("Declined", false);
    setMessage(
      ui.reviewDecisionMsg,
      "Declined. Message the applicant to tell them. No badge is issued and the review is closed.",
      true
    );
    lockDecision();
    ui.reviewDeclined.focus();
  }

  function closeReview() {
    resetReviewUI();
    setMessage(ui.reviewMsg, "Review closed. Choose another application file to start again.", true);
  }

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
    ui.genBtn.addEventListener("click", handleHireStart);
    ui.genConfirmForm.addEventListener("submit", handleHireConfirm);

    ui.genConfirmCancel.addEventListener("click", function () {
      hideHireConfirm();
      setMessage(ui.genMsg, "Hiring cancelled.", true);
    });

    ui.genCopyCode.addEventListener("click", function () {
      copyResult(
        ui.genCode.textContent,
        "Staff code copied. Give it to the person privately."
      );
    });

    ui.genCopyHash.addEventListener("click", function () {
      copyResult(ui.genHash.textContent, "codeHash copied. Paste it into the account's field.");
    });

    ui.genCopyAccount.addEventListener("click", function () {
      copyResult(
        ui.genJSON.textContent,
        "Account entry copied. Paste it inside the accounts list."
      );
    });

    [ui.genUser, ui.genDisplay, ui.genId].forEach(function (field) {
      field.addEventListener("input", clearGeneratedAccount);
    });

    ui.genRole.addEventListener("change", clearGeneratedAccount);

    ui.replaceBtn.addEventListener("click", handleReplaceCode);
    ui.replaceUser.addEventListener("input", clearReplacedCode);

    ui.replaceCopyCode.addEventListener("click", function () {
      copyResult(
        ui.replaceCode.textContent,
        "New staff code copied. Give it to the person privately.",
        ui.replaceMsg
      );
    });

    ui.replaceCopyHash.addEventListener("click", function () {
      copyResult(
        ui.replaceHash.textContent,
        "New codeHash copied. Replace the old codeHash in staff.json with it.",
        ui.replaceMsg
      );
    });

    ui.replaceCopyAccount.addEventListener("click", function () {
      copyResult(
        ui.replaceJSON.textContent,
        "Account entry copied. Replace that account's block in staff.json.",
        ui.replaceMsg
      );
    });

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
