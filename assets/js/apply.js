/*
 * Red FCU website — Verified Creator application form.
 *
 * The form sends nothing. It validates the answers in this browser, builds a
 * JSON file, and offers it as a download. The applicant then sends that file
 * to a staff member themselves. The staff-side reader lives in staff.js.
 */
(function () {
  "use strict";

  var form = document.querySelector("[data-apply-form]");

  if (!form) {
    return;
  }

  var resultPanel = document.querySelector("[data-apply-result]");
  var errorBox = document.querySelector("[data-apply-errors]");
  var errorCount = document.querySelector("[data-apply-error-count]");
  var errorList = document.querySelector("[data-apply-error-list]");
  var msg = document.querySelector("[data-apply-msg]");
  var resultMsg = document.querySelector("[data-apply-result-msg]");
  var fileNameOut = document.querySelector("[data-apply-file]");

  var lastJSON = "";
  var lastFileName = "";

  var MAX = {
    name: 120,
    discord: 80,
    discordId: 25,
    projectName: 120,
    projectUrl: 300,
    evidence: 4000,
    notes: 2000
  };

  var ROLES = ["owner", "co-owner", "authorized-representative", "team-member"];
  var PLATFORMS = ["discord", "github", "unity", "itch", "steam", "youtube", "x", "other"];

  var REQUIRED_CHECKS = [
    "confirmAccurate",
    "confirmAuthority",
    "confirmNotLegal",
    "confirmNotPlatform",
    "confirmDecision"
  ];

  function value(id) {
    var node = document.getElementById(id);
    return node ? String(node.value || "").trim() : "";
  }

  function setMessage(node, text, ok) {
    if (!node) {
      return;
    }

    node.textContent = text || "";
    node.classList.toggle("is-ok", Boolean(ok));
  }

  function selectedPlatforms() {
    var nodes = form.querySelectorAll('input[name="platforms"]:checked');
    var out = [];

    for (var i = 0; i < nodes.length; i += 1) {
      out.push(nodes[i].value);
    }

    return out;
  }

  function checked(name) {
    var node = form.querySelector('input[name="' + name + '"]');
    return Boolean(node && node.checked);
  }

  function isHttpUrl(text) {
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

  function validate() {
    var errors = [];
    var name = value("applicant-name");
    var discord = value("applicant-discord");
    var discordId = value("applicant-discord-id");
    var projectName = value("project-name");
    var projectUrl = value("project-url");
    var role = value("applicant-role");
    var platforms = selectedPlatforms();
    var evidence = value("evidence");
    var notes = value("notes");

    if (!name) {
      errors.push({ id: "applicant-name", text: "Enter your name or creator name." });
    } else if (name.length > MAX.name) {
      errors.push({ id: "applicant-name", text: "Keep the name to " + MAX.name + " characters or fewer." });
    }

    if (!discord) {
      errors.push({ id: "applicant-discord", text: "Enter your Discord username." });
    } else if (discord.length > MAX.discord) {
      errors.push({ id: "applicant-discord", text: "Keep the Discord username to " + MAX.discord + " characters or fewer." });
    } else if (/^https?:\/\//i.test(discord)) {
      errors.push({ id: "applicant-discord", text: "Enter a username, not a web address." });
    }

    if (discordId && !/^\d{5,25}$/.test(discordId)) {
      errors.push({ id: "applicant-discord-id", text: "A Discord user ID is numeric, usually 17 to 20 digits." });
    }

    if (!projectName) {
      errors.push({ id: "project-name", text: "Enter the project name." });
    } else if (projectName.length > MAX.projectName) {
      errors.push({ id: "project-name", text: "Keep the project name to " + MAX.projectName + " characters or fewer." });
    }

    if (!projectUrl) {
      errors.push({ id: "project-url", text: "Enter the main project URL." });
    } else if (projectUrl.length > MAX.projectUrl) {
      errors.push({ id: "project-url", text: "Keep the URL to " + MAX.projectUrl + " characters or fewer." });
    } else if (!isHttpUrl(projectUrl)) {
      errors.push({ id: "project-url", text: "Use a full public address starting with https:// or http://." });
    }

    if (ROLES.indexOf(role) === -1) {
      errors.push({ id: "applicant-role", text: "Choose your role for this project." });
    }

    if (!platforms.length) {
      errors.push({ id: "platforms-field", text: "Choose at least one platform where the project appears." });
    }

    if (!evidence) {
      errors.push({ id: "evidence", text: "Add at least one piece of evidence." });
    } else if (evidence.length < 10) {
      errors.push({ id: "evidence", text: "Add a little more detail, such as a link and what it shows." });
    } else if (evidence.length > MAX.evidence) {
      errors.push({ id: "evidence", text: "Keep the evidence to " + MAX.evidence + " characters or fewer." });
    }

    if (notes.length > MAX.notes) {
      errors.push({ id: "notes", text: "Keep the notes to " + MAX.notes + " characters or fewer." });
    }

    for (var i = 0; i < REQUIRED_CHECKS.length; i += 1) {
      if (!checked(REQUIRED_CHECKS[i])) {
        errors.push({ id: "confirmations-field", text: "All five confirmations are required." });
        break;
      }
    }

    return {
      ok: errors.length === 0,
      errors: errors,
      data: {
        name: name,
        discord: discord,
        discordId: discordId,
        projectName: projectName,
        projectUrl: projectUrl,
        role: role,
        platforms: platforms,
        evidence: evidence,
        notes: notes
      }
    };
  }

  function errorNode(id) {
    return document.querySelector('[data-error-for="' + id + '"]');
  }

  function fieldNode(id) {
    if (id === "platforms-field" || id === "confirmations-field") {
      return document.getElementById(id);
    }

    return document.getElementById(id);
  }

  function clearFieldError(id) {
    var error = errorNode(id);
    var field = fieldNode(id);

    if (error) {
      error.textContent = "";
    }

    if (field) {
      field.removeAttribute("aria-invalid");
    }

    if (field && field.querySelectorAll) {
      field.querySelectorAll("input").forEach(function (input) {
        input.removeAttribute("aria-invalid");
      });
    }

    if (errorList) {
      errorList.querySelectorAll("[data-summary-for]").forEach(function (link) {
        if (link.getAttribute("data-summary-for") === id) {
          link.parentNode.remove();
        }
      });

      if (!errorList.children.length && errorBox) {
        errorBox.hidden = true;
      } else if (errorCount) {
        errorCount.textContent =
          errorList.children.length === 1
            ? "1 field needs attention."
            : errorList.children.length + " fields need attention.";
      }
    }
  }

  function clearErrors() {
    form.querySelectorAll("[data-error-for]").forEach(function (node) {
      node.textContent = "";
    });

    form.querySelectorAll("[aria-invalid]").forEach(function (node) {
      node.removeAttribute("aria-invalid");
    });

    if (errorBox) {
      errorBox.hidden = true;
    }

    if (errorList) {
      errorList.textContent = "";
    }
  }

  function showErrors(errors) {
    clearErrors();

    if (!errorBox || !errorList) {
      return;
    }

    errors.forEach(function (error) {
      var node = errorNode(error.id);
      var field = fieldNode(error.id);

      if (node) {
        node.textContent = error.text;
      }

      if (field) {
        field.setAttribute("aria-invalid", "true");

        if (!field.matches("input, select, textarea")) {
          field.querySelectorAll("input, select, textarea").forEach(function (input) {
            input.setAttribute("aria-invalid", "true");
          });
        }
      }

      var item = document.createElement("li");
      var link = document.createElement("a");
      var label = fieldLabel(error.id);

      link.href = "#" + error.id;
      link.textContent = label + ": " + error.text;
      link.setAttribute("data-summary-for", error.id);
      link.addEventListener("click", function (event) {
        event.preventDefault();
        focusField(error.id);
      });

      item.appendChild(link);
      errorList.appendChild(item);
    });

    if (errorCount) {
      errorCount.textContent =
        errors.length === 1
          ? "1 field needs attention."
          : errors.length + " fields need attention.";
    }

    errorBox.hidden = false;
    errorBox.focus();
  }

  function fieldLabel(id) {
    var labels = {
      "applicant-name": "Name or creator name",
      "applicant-discord": "Discord username",
      "applicant-discord-id": "Discord user ID",
      "project-name": "Project name",
      "project-url": "Main project URL",
      "applicant-role": "Your role",
      "platforms-field": "Where the project appears",
      evidence: "Evidence",
      notes: "Anything else",
      "confirmations-field": "Confirmations"
    };

    return labels[id] || "This field";
  }

  function focusField(id) {
    var field = fieldNode(id);

    if (!field) {
      return;
    }

    if (field.matches("input, select, textarea")) {
      field.focus();
      return;
    }

    field.focus();

    var first = field.querySelector("input, select, textarea");

    if (first && document.activeElement !== first) {
      first.focus();
    }
  }

  function pad(number, length) {
    var text = String(number);

    while (text.length < length) {
      text = "0" + text;
    }

    return text;
  }

  function slug(text) {
    var out = String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);

    return out || "application";
  }

  function buildApplication(data) {
    var now = new Date();

    return {
      type: "redfcu.verified-creator.application",
      version: 1,
      created: now.toISOString(),
      note: "Unsigned self-reported application. Red FCU staff must confirm the sender and the evidence before accepting it.",
      application: {
        name: data.name,
        discord: data.discord,
        discordId: data.discordId,
        projectName: data.projectName,
        projectUrl: data.projectUrl,
        role: data.role,
        platforms: data.platforms,
        evidence: data.evidence,
        notes: data.notes
      },
      confirmations: {
        accurate: checked("confirmAccurate"),
        authority: checked("confirmAuthority"),
        notLegal: checked("confirmNotLegal"),
        notPlatform: checked("confirmNotPlatform"),
        mayDecline: checked("confirmDecision")
      }
    };
  }

  function makeFileName(projectName) {
    var now = new Date();
    var stamp =
      now.getUTCFullYear() +
      pad(now.getUTCMonth() + 1, 2) +
      pad(now.getUTCDate(), 2);

    return "redfcu-creator-application-" + slug(projectName) + "-" + stamp + ".json";
  }

  function download(text, fileName) {
    if (!window.Blob || !window.URL || !window.URL.createObjectURL) {
      return false;
    }

    var blob = new window.Blob([text], { type: "application/json" });
    var link = document.createElement("a");

    link.href = window.URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    window.setTimeout(function () {
      window.URL.revokeObjectURL(link.href);
    }, 1000);

    return true;
  }

  function showResult(ok) {
    if (!resultPanel) {
      return;
    }

    if (fileNameOut) {
      fileNameOut.textContent = lastFileName;
    }

    resultPanel.hidden = false;
    resultPanel.focus();
    setMessage(
      resultMsg,
      ok
        ? "Download started. If no file appears, use “Copy JSON instead”."
        : "This browser cannot download files from a page. Use “Copy JSON instead”.",
      ok
    );
  }

  function copyText(text, done, failed) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, failed);
      return;
    }

    failed();
  }

  function updateCounts() {
    form.querySelectorAll("[data-count-for]").forEach(function (node) {
      var field = document.getElementById(node.getAttribute("data-count-for"));
      node.textContent = field ? String(field.value.length) : "0";
    });
  }

  function onSubmit(event) {
    event.preventDefault();

    var result = validate();

    if (!result.ok) {
      showErrors(result.errors);
      setMessage(msg, "The application was not created. Fix the highlighted fields first.");
      return;
    }

    clearErrors();
    lastJSON = JSON.stringify(buildApplication(result.data), null, 2) + "\n";
    lastFileName = makeFileName(result.data.projectName);

    var started = download(lastJSON, lastFileName);

    setMessage(
      msg,
      started
        ? "Application file created. Send it to a Red FCU staff member."
        : "Application file created in this browser. Copy the JSON instead.",
      true
    );

    showResult(started);
  }

  function onClear() {
    form.reset();
    clearErrors();
    setMessage(msg, "");
    setMessage(resultMsg, "");

    if (resultPanel) {
      resultPanel.hidden = true;
    }

    lastJSON = "";
    lastFileName = "";
    updateCounts();
    document.getElementById("applicant-name").focus();
  }

  function onDownloadAgain() {
    if (!lastJSON) {
      setMessage(resultMsg, "There is no application to download. Fill out the form first.");
      return;
    }

    var started = download(lastJSON, lastFileName);
    setMessage(
      resultMsg,
      started ? "Download started again." : "This browser cannot download files. Copy the JSON instead.",
      started
    );
  }

  function onCopy() {
    if (!lastJSON) {
      setMessage(resultMsg, "There is no application to copy. Fill out the form first.");
      return;
    }

    copyText(
      lastJSON,
      function () {
        setMessage(resultMsg, "JSON copied. Paste it into a message to staff, or save it as a .json file.", true);
      },
      function () {
        setMessage(resultMsg, "Copying is blocked in this browser. Download the file instead.");
      }
    );
  }

  form.addEventListener("submit", onSubmit);
  form.addEventListener("input", function (event) {
    updateCounts();

    var id = event.target.id || (event.target.closest("fieldset") && event.target.closest("fieldset").id);

    if (id) {
      clearFieldError(id);
    }

    var remaining = form.querySelectorAll("[data-error-for]:not(:empty)");

    if (!remaining.length && errorBox) {
      errorBox.hidden = true;
    }
  });

  form.addEventListener("change", function (event) {
    var id = event.target.id || (event.target.closest("fieldset") && event.target.closest("fieldset").id);

    if (id) {
      clearFieldError(id);
    }
  });

  var clearButton = document.querySelector("[data-apply-clear]");
  var againButton = document.querySelector("[data-apply-again]");
  var copyButton = document.querySelector("[data-apply-copy]");

  if (clearButton) {
    clearButton.addEventListener("click", onClear);
  }

  if (againButton) {
    againButton.addEventListener("click", onDownloadAgain);
  }

  if (copyButton) {
    copyButton.addEventListener("click", onCopy);
  }

  updateCounts();
})();
