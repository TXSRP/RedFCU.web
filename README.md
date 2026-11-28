# RedFCU website

The official static website for **RedFCU**, a Unity Editor AI assistant project with support for locally run models through Ollama.

The site is plain HTML, CSS, and vanilla JavaScript. There is no framework, package manager, build step, backend, analytics, or external service. It can be uploaded to GitHub as-is and served with GitHub Pages.

---

## 1. Pages

| File | Page | Purpose |
| --- | --- | --- |
| `index.html` | Welcome | Pre-entry public resources screen. Crisis contacts, food, housing, healthcare, financial help, family safety, and general services. The "Continue to RedFCU" button at the very bottom opens `home.html`. |
| `home.html` | Home | Introduction, Unity/Ollama relationship, setup flow, current release. |
| `getting-started.html` | Getting Started | Import the package, install Ollama, pull a model, connect the two. |
| `downloads.html` | Downloads | Latest RedFCU release from GitHub, a requirements summary, and Ollama listed separately. |
| `faq.html` | FAQ | Cost and license, Unity versions, models, hardware, privacy, sharing, and what the name does and does not mean. |
| `troubleshooting.html` | Troubleshooting | Setup checks, Ollama connection, performance, and what to include in a report. |
| `community.html` | Community & Support | The RedFCU Discord and GitHub Issues, plus Ollama's own resources. |
| `programs.html` | Programs | The RedFCU programs, marked "Listed soon available", "Open for applications", or "Closed until further notice". |
| `creator-apply.html` | Verified Creator application | The public Verified Creator form. Builds a downloadable JSON application in the browser and sends nothing. |
| `community-apply.html` | Verified Community application | The public Verified Community form. Builds a downloadable JSON application in the browser and sends nothing. |
| `community-hosting.html` | Community Hosting | A planned managed hosting program for approved Discord bots, software projects, and community projects. Closed until further notice, with no form or application route. |
| `about.html` | About | Purpose, relationship with Unity and Ollama, and what the project publishes. |
| `privacy.html` | Privacy | What the site does and does not do, including the theme preference stored in the browser. |
| `licensing.html` | Licensing | RFCUFUL summary, plus the full license text reproduced on the page. |
| `404.html` | Not found | Shown by GitHub Pages for missing addresses. Links back to the main pages. |

`index.html` is deliberately not the project homepage any more. It is the welcome and public-resources screen, and every "Home" link on the site points to `home.html`. Keep those two roles separate when editing: a change to the welcome portal belongs in `index.html`, and a change to the product homepage belongs in `home.html`.

Every page also carries a legal notice above the header. It states that RedFCU is an independent software project; that it is not a bank, credit union, or financial institution; that it is not a government body, law-enforcement agency, or federal authority; and that it is not affiliated with or endorsed by any government, regulator, police force, or financial institution. It also states that the project may offer verification, protection, copyright-assistance, and recommendation programs, and that those programs are informational and administrative only. Keep that notice on new pages. It is a disclaimer, not decoration.

Privacy and Licensing are linked from the footer on every page. The footer also carries a copyright line: "© 2026 RedFCU. All rights reserved for original website content, design, graphics, and branding, except where otherwise stated. Unauthorized reproduction or redistribution of protected website materials is prohibited without permission." Keep it on new pages, and keep the Licensing page's "This website's content" paragraph consistent with it.

## 2. Files and folders

```text
RedFCU.web/
├── index.html
├── home.html
├── getting-started.html
├── downloads.html
├── faq.html
├── troubleshooting.html
├── community.html
├── programs.html
├── creator-apply.html
├── community-apply.html
├── community-hosting.html
├── about.html
├── privacy.html
├── licensing.html
├── 404.html
├── LICENSE
├── README.md
└── assets/
    ├── css/
    │   └── styles.css
    ├── data/
    │   ├── release.json
    │   └── staff.json
    ├── img/
    │   ├── red-fcu-logo.png
    │   ├── red-fcu-logo-192.png
    │   ├── red-fcu-logo-96.png
    │   ├── redfcu-verified-creator-badge.png
    │   ├── redfcu-verified-community-badge.png
    │   ├── favicon-32.png
    │   └── apple-touch-icon.png
    └── js/
        ├── theme.js
        ├── main.js
        ├── apply.js
        ├── community-apply.js
        └── staff.js
```

- `assets/css/styles.css` — the single shared stylesheet: design tokens, dark/light themes, layout, components, the staff panel, responsive rules, and reduced-motion handling.
- `assets/js/theme.js` — a small script loaded in the page head. It applies a saved light/dark choice before the page paints. If local storage is blocked, it quietly falls back to the system theme.
- `assets/js/main.js` — the theme toggle, mobile navigation, footer year, and the "safe to enhance" class that reveals the header controls only when JavaScript is available.
- `assets/js/apply.js` — validates the Verified Creator application form, builds the JSON file, and downloads it. Nothing is sent anywhere.
- `assets/js/community-apply.js` — validates the Verified Community application form, builds the JSON file, and downloads it. Nothing is sent anywhere.
- `assets/js/staff.js` — fills the release version, date, package name, and size from `release.json`, builds the hidden staff panel (Left Alt + F2), and provides the admin/owner Verified Creator and Verified Community review tools plus the verification withdrawal message tool. Nothing is sent anywhere.
- `assets/data/release.json` — the current release details. Edit this one file after a release; every page reads it.
- `assets/data/staff.json` — the public allowlist for the staff panel, with instructions inside the file.
- `assets/img/` — the RedFCU emblem, supplied by the owner. `red-fcu-logo.png` is the 512px master with the corners masked to transparency; the other four files are generated sizes for the header, footer, browser tab, and iOS home screen. Replace the master and regenerate the rest if the artwork changes. `redfcu-verified-creator-badge.png` and `redfcu-verified-community-badge.png` are the two badge images supplied by the owner; the review tool offers them for download unchanged and never generates a badge. `COMMUNITY_BADGE_AVAILABLE` in `staff.js` is `true` because the community PNG is present. If that file is ever removed, set the constant back to `false` so the panel shows a note instead of requesting a missing file.
- The homepage orbit illustration is original inline SVG, drawn with the site's own colors. All other decoration is CSS.
- The welcome and programs pages carry a hidden inline SVG sprite at the bottom of each file (symbols named `i-mental`, `i-food`, `i-home`, and so on). Custom icons are referenced with `<use href="#i-…">`. There are no emoji and no icon fonts anywhere: every glyph is a drawn SVG so it renders identically on Windows, macOS, Linux, Android, and iOS.

Every page uses the same legal notice, header, navigation, and footer. Navigation labels are: Home, Getting Started, Downloads, FAQ, Troubleshooting, Community & Support, Programs, About. The desktop navigation collapses into the menu button below 1100px.

### The name and the notices

| | |
| --- | --- |
| Long name | **Red Federal Code Union** |
| Short name | **RedFCU** |
| Where they appear | Every `<title>`, meta description, Open Graph tag, the header wordmark, the footer, the About page, and the FAQ |

The wordmark renders as `Red <span class="brand-accent">FCU</span>`. `Red Federal Code Union` is spelled out in full on `about.html` and `faq.html`, where a visitor is most likely to ask what the name means, and the About page also explains why the name does not make this a financial or government body.

The long name uses words, but the site only ever renders the **short** name in the header, titles, and body copy. That is deliberate: it keeps the pages readable and makes the notice, not the name, carry the meaning.

**Identifiers deliberately left as "CodePilot".** These are real names already in the world, and renaming them in the site would break links or misstate the license:

- `Codepilot-AI.unitypackage` — the actual package file name in the repository.
- `https://github.com/TXSRP/CodePilot` (and its `/releases`, `/issues` paths) — the actual repository.
- `CodePilot-Unity.AI@proton.me` — the real contact address.
- `codepilot-theme`, `codepilot-staff`, `codepilot-release-draft` — local storage keys. Renaming them would silently sign staff out and reset visitor themes.

The license is not on that list. It is the **RedFCU Free Use License (RFCUFUL) 1.0.0**, reproduced in full on `licensing.html`. Only the repository URL, the package file name, the contact address, and the storage keys still carry the earlier name.

`downloads.html` carries a short note saying that the repository and the package file name still use the earlier name, so the mismatch is explained rather than hidden. `licensing.html` reproduces the license text as supplied by the rights holder.

The deployment path is `RedFCU.web` in the folder name. Every page links relatively, so the folder name on the web only has to match whatever the repository is called; nothing in the HTML assumes it.

### The welcome and public-resources screen

`index.html` is a pre-entry screen, not product documentation. Visitors read the resource listings and reach the **Continue to RedFCU** button at the very bottom, which opens `home.html`. Nothing else on that page links to `home.html`.

- The sections run in this order: mental health, food, housing, healthcare, financial, family safety, general help, then the safety notice. Each has an `id`, so the jump bar near the top works without JavaScript.
- Each listing is an `<article class="resource-card">`: a country tag, the service name, any phone or text numbers, the supplied description, the official link, and a badge. Badge classes are `badge-confirmed` and `badge-unverified`.
- The Philippines NCMH entry is deliberately `UNVERIFIED` and must stay that way until its contact arrangement is confirmed. Do not flip it to `CONFIRMED` just because the other entries are.
- The "last reviewed" date reads **November 18, 2026**. If a number, link, or description is re-checked, update that date. Do not silently change a supplied number, URL, or description; fix the listing and note what changed.
- Phone numbers use `tel:` links built from the displayed digits. The visible text is never shortened or reformatted.
- External listings use `rel="noopener"` and open in the same tab.

### Programs

`programs.html` describes seven programs. Verified Creator and Verified Community are open for applications, each with its own form page. Verified Project, Protected, Copyright Assistance, Community Hosting, and Recommended are marked **Listed soon available** or **Closed until further notice**, and those cards must not offer a form or submission route.

When a program opens:

1. Change its status pill and the page-level note.
2. Replace the "not open yet" notice with the real process.
3. Keep each card's own **Notice**. Those sentences limit what the program claims.
4. Keep the "What these programs are not" block. It mirrors the site-wide banner and the `about.html#name` full notice, and all three should agree.

---

## 3. Preview the website locally

You do not need to install anything.

1. Open the `RedFCU.web` folder in File Explorer.
2. Double-click `index.html`. It opens in your default browser.
3. Use the navigation to move between pages. The theme toggle, mobile menu, and footer year should work normally from disk.

Notes:

- The theme toggle starts from your operating system's light/dark setting. Your manual choice is remembered in the browser.
- Narrow the browser window (or use the browser's responsive view) to check the mobile navigation.
- **`404.html` previews from disk like any other page.** Every link on it is relative, so it renders when opened straight from the folder. A small script in its `<head>` supplies the site root only when GitHub Pages answers for a missing address deeper than one folder (for example `…/RedFCU.web/old/page`), where relative links would otherwise resolve inside the missing path.
- **The release numbers still work from disk, but the staff list does not load.** Browsers block `fetch` for files opened with `file://`, so `release.json` and `staff.json` cannot be read. The pages then keep the fallback numbers written into the HTML, which match `release.json` at the time of writing. The staff panel offers a **Load staff.json from disk** button for exactly this case. Everything works normally when the site is served over HTTP, as GitHub Pages does.

---

## 4. Create the GitHub repository manually

1. Sign in at [github.com](https://github.com).
2. Select **+** (top right) → **New repository**.
3. Enter a repository name. The site was built and tested for the name **`RedFCU.web`** — see section 8 if you choose a different name.
4. Choose **Public**.
5. Do **not** add a README, `.gitignore`, or license at this step, so the upload does not conflict with the files here.
6. Select **Create repository**.

## 5. Upload the files through the GitHub website

1. On the new repository page, select **Add file** → **Upload files**.
2. Open the `RedFCU.web` folder on your computer.
3. Select everything **inside** the folder (all HTML files, `README.md`, and the `assets` folder), then drag it into the GitHub upload area.
   - `index.html` must end up at the **top level** of the repository, not inside a subfolder.
4. Wait for all files to appear in the upload list. The `assets/css` and `assets/js` folders must keep their structure.
5. Enter a short commit message, such as `Add RedFCU website`.
6. Select **Commit changes**.

To confirm the upload worked, the repository file list should show `index.html`, the other HTML pages, `README.md`, and an `assets` folder at the top level.

Two of those pages are new in this version: `home.html` (the project homepage that the welcome screen leads to) and `programs.html`. If either one is missing, the navigation and the **Continue to RedFCU** button will lead to a 404. `creator-apply.html`, `community-apply.html`, and `community-hosting.html` are also reached from Programs; if any is missing, those links will lead to a 404.

## 6. Enable GitHub Pages

1. In the repository, open **Settings**.
2. In the left sidebar, select **Pages**.
3. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
4. Set **Branch** to **main** and the folder to **/ (root)**.
5. Select **Save**.
6. GitHub shows the site address after it builds, usually within a few minutes. For a repository named `RedFCU.web`, it will look like:

   `https://YOUR-USERNAME.github.io/RedFCU.web/`

7. Open that address and click through every page. Test the mobile menu and the theme toggle.
8. The address opens the welcome screen (`index.html`). Scroll to the very bottom and use **Continue to RedFCU** to reach `home.html`. That button and the footer's **Public resources** link are the only doors between the two halves of the site, so check both directions.

This step is intentionally left to you. The site has not been published, and no repository or Pages setting has been created on your behalf.

## 7. Update the website later

1. Open the repository on GitHub.
2. Navigate to the file you want to change.
3. Select the pencil icon (**Edit this file**), make the change, and commit it.
4. To replace files or add new ones, use **Add file** → **Upload files** with the revised files. Keep the same paths and folder names.
5. GitHub Pages republishes automatically after a commit. A change can take a minute or two to appear; a normal browser refresh is usually enough.

If a page looks wrong after an update, check that `assets/css/styles.css` and `assets/js/` are still at the same paths and that HTML files are still at the repository root.

---

## 8. If you rename the repository

Every page, including `404.html`, uses relative links, so the site works under any repository name and from disk. `404.html` carries one small script that works out the project folder from the address GitHub Pages used, so a missing page deep in the site still finds the stylesheet.

If the repository is **not** named `RedFCU.web`, nothing needs editing — the address supplies the name.

Two cases still need a look:

- **Hosted at a domain root** (a custom domain, or a `<username>.github.io` repository with no project folder): `404.html` would guess the wrong root for a missing address deeper than one folder. Its links are relative, so the usual root-level miss is still fine.
- **A different site layout** (pages moved into folders): keep the pages and `assets/` at the repository root, or adjust the links in `404.html` accordingly.

---

## 9. Release links and what to edit after a new version

These are the destinations the site uses. They are all real, public pages, verified when this README was written.

| What | Address | Used on |
| --- | --- | --- |
| Latest release (primary download button) | `https://github.com/TXSRP/CodePilot/releases/latest` | `downloads.html`, `getting-started.html`, `faq.html`, `troubleshooting.html` |
| All releases | `https://github.com/TXSRP/CodePilot/releases` | `downloads.html`, `getting-started.html`, `community.html` |
| Repository | `https://github.com/TXSRP/CodePilot` | several pages and the footer |
| Issue tracker | `https://github.com/TXSRP/CodePilot/issues` | `community.html`, `licensing.html`, `faq.html`, `troubleshooting.html` |
| Computer specs | `https://github.com/TXSRP/CodePilot/blob/main/Computer%20Specs.md` | `downloads.html`, `faq.html`, `troubleshooting.html` |
| README | `https://github.com/TXSRP/CodePilot#readme` | `getting-started.html` |
| Discord invite | `https://discord.gg/SuBuRVS6PK` | `getting-started.html`, `community.html`, `faq.html`, `troubleshooting.html` |

There is no longer an affiliation link. `codepilot.com` is not referenced anywhere on the site, because the project is no longer presented as a near-namesake of that company: it has its own name, and the notice warns against confusion with any similarly named organisation instead.

The download buttons point at `releases/latest` rather than at a file, so they keep working after every new release. That is deliberate: do not replace them with a link to a single `.unitypackage` unless you want that version pinned forever.

### After publishing a new release

Edit one file: `assets/data/release.json`.

```json
{
  "version": "3.0.1",
  "released": "2026-11-14",
  "package": "Codepilot-AI.unitypackage",
  "sizeKB": 372
}
```

- `version` has no leading `v`. Pages add one where the text needs it.
- `released` is always `YYYY-MM-DD`, and is displayed as `14 November 2026`.
- `sizeKB` is a plain number. The site writes the `KB` itself.
- `_help` is a note to whoever opens the file. It is ignored by the site.

The version appears on five pages: `downloads.html`, `getting-started.html`, `home.html`, `faq.html`, and `troubleshooting.html`. All of them read the same file, so they cannot fall out of step. The download links in the table above do not change between releases, because they point at `releases/latest`.

The staff panel in section 10 writes this file for you: press Left Alt + F2, change the fields, and select **Download release.json**.

The numbers still hard-coded in the HTML are fallbacks, used only if `release.json` cannot be loaded (JavaScript disabled, or the page opened from disk). They are not read when the file is available, so they do not need updating on every release. Refresh them occasionally so a visitor without JavaScript does not see something ancient.

If the release changes the package file name, update `package` in the same file. If the requirements or supported model list change, update the "What RedFCU needs" card to match `Computer Specs.md`.

If the Discord invite ever expires, regenerate it in Discord and replace the address in both pages above. A dead invite is worse than no invite, so check it occasionally.

### Ollama

The Ollama installer link (`https://ollama.com/download/OllamaSetup.exe`) and the Ollama site links are genuine Ollama destinations and are clearly labelled as third-party. Leave them attributed to Ollama and do not present them as RedFCU downloads.

---

## 10. Release data and the staff panel

### One data file

`assets/data/release.json` drives every release number on the site. Each value is marked in the HTML with a `data-release` attribute, and `staff.js` fills it in:

| Attribute | Example | Where it appears |
| --- | --- | --- |
| `version` | `3.0.0` | hero note and notice heading on the homepage |
| `v-version` | `v3.0.0` | Downloads, Getting Started, FAQ, Troubleshooting |
| `date` | `23 October 2026` | Downloads, FAQ |
| `package` | `Codepilot-AI.unitypackage` | Downloads, Getting Started, FAQ, Troubleshooting |
| `size` | `360 KB` | Downloads, FAQ, Troubleshooting |

The text between the tags is the fallback used when JavaScript is off. Keep it roughly current, but do not hand-edit it on every release.

### The staff panel

Press **Left Alt + F2** on any page. The panel is built by `staff.js`, so pages need no extra markup, and it stays out of the way until someone uses the key combination.

1. Type a Discord username, or a Discord or Yapin user ID, from `assets/data/staff.json`.
2. If that account has a `codeHash`, the panel asks for its staff code.
3. Change the version, date, package name, and size. **Preview on this page** applies them immediately and remembers them in that browser.
4. **Download release.json** produces the exact file to replace `assets/data/release.json` in the repository. Commit it, and GitHub Pages publishes the change for everyone.
5. **Sign out**, or wait twelve hours, and the browser shows the published values again.

While a preview is active, a "Staff preview" button sits in the bottom-left corner, and every version number on the page is dotted-underlined and clicks back to the panel.

The key combination is matched on the left Alt key specifically: right Alt (AltGr) is ignored. Browsers do not report which Alt was held on the `F2` event itself, so the script remembers the last Alt keydown.

### What it is not

Be clear about this with anyone who asks:

- **It is not Discord sign-in.** There is no OAuth, no client ID, and no request to Discord. The site has no backend, and adding one would break the static-file constraint.
- **It is not authentication.** `staff.json` is public. Anyone can read which names are allowed, and a name-only account can be used by anyone who types it. Do not put anything private behind the panel; there is nothing private to put there.
- **It is not publishing.** Edits live in one browser's local storage. Visitors see a change only after `release.json` is committed.
- **The optional staff code is a speed bump, not a password.** Codes are stored as PBKDF2-SHA256 values with 600,000 iterations and a per-account salt, so the public file cannot be used to read a code back and an offline guess is deliberately expensive. It is still a browser-only check with no backend, so treat it as a lock on a cupboard, not on a vault.

If real sign-in is ever required, it needs a backend or a GitHub token flow, and the Privacy page and the "no accounts" wording would have to change with it.

### Adding a staff account

Hiring is restricted to the account whose `role` is `owner`, and it asks for that account's staff code again each time.

1. Press Left Alt + F2 and sign in with the owner account. Any other role is refused when hiring.
2. Open **New staff account**. Enter the new person's Discord username, display name, user ID (Discord or Yapin), and role. Optionally add the first or public name and pronouns for the introduction. Leave the name blank to use the username. Never ask for a last or middle name.
3. Press **Hire staff account**, then re-enter the owner username and owner staff code. A different account or a wrong code is refused.
4. Copy the **staff code** and give it to the new person privately. It is shown once and never stored; only its hash goes into the file.
5. Copy the **introduction** and send it to the person. It is generated in the browser from the username or chosen name and optional pronouns; it does not include rank, age, favorites, or any of the personal information the notice lists.
6. Copy the **account entry** JSON.
7. Open `assets/data/staff.json`, paste the entry inside `accounts` after the last account, and add a comma after the previous account's closing brace.
8. Upload the file to `assets/data/staff.json` and commit.

Set `"enabled": false` to suspend an account without deleting it.

The hiring result also includes the introduction. It is plain text with Discord subtext lines (`-#`) and is generated from the username or the optional first/public name plus optional pronouns. Rank, age, and favorites are always `Not Disclosed`, and DMs are `Open for business requests only`. It is never stored in `staff.json`; copy it and send it to the person. If the template changes, edit `buildIntroduction()` in `staff.js`.

The generated code is six random words plus four digits, for example `garnet-maple-aspen-comet-quartz-rowan-6578`. Six words are used instead of four because the word list and the format are both public: at four words an attacker with the file could try the whole space in seconds, while six words plus the 600,000-iteration derivation makes the same search last for years.

Ranks, weakest first. Each one adds exactly one power:

| Rank | Preview release changes | Review applications | Withdraw verifications | Replace own code | Replace other codes | Hire |
| --- | --- | --- | --- | --- | --- | --- |
| `viewer` | no — read only | no | no | no | no | no |
| `editor` | yes | no | no | no | no | no |
| `maintainer` | yes | no | no | yes | no | no |
| `admin` | yes | yes | yes | yes | yes, except the owner's | no |
| `owner` | yes | yes | yes | yes | yes | yes |

An unknown or missing `role` is treated as `viewer`, so a typo never grants more than intended. Keep exactly one owner.

The panel enforces the rank when someone signs in: a `viewer` sees the release numbers with every field disabled, an `editor` gets no **Replace a staff code** section, and the **New staff account** section only appears for the owner. The check runs in the browser against the public file, so it is a speed bump for casual use, not real access control. Someone who copies the site and edits their own copy can change the file; they still cannot change yours.

**Before publishing the site, check the account list.** A name-only account (an empty `codeHash`) can be used by anyone who reads the file. The current list holds the owner account with a PBKDF2 code.

### Reviewing a Verified Creator or Verified Community application

The public forms are `creator-apply.html` (script `assets/js/apply.js`) and `community-apply.html` (script `assets/js/community-apply.js`). Both send nothing. On submit they validate the answers and download a JSON file named after the project or community.

A Verified Creator file looks like this:

```json
{
  "type": "redfcu.verified-creator.application",
  "version": 1,
  "created": "2026-11-21T12:00:00.000Z",
  "note": "Unsigned self-reported application. ...",
  "application": {
    "name": "Creator or studio",
    "discord": "username",
    "discordId": "000000000000000000",
    "projectName": "Project",
    "projectUrl": "https://example.com/project",
    "role": "owner",
    "platforms": ["github", "discord"],
    "evidence": "https://... — official project page",
    "notes": ""
  },
  "confirmations": {
    "accurate": true,
    "authority": true,
    "notLegal": true,
    "notPlatform": true,
    "mayDecline": true
  }
}
```

In both schemas, `discordId` is optional and accepts either a numeric Discord ID or a Yapin ID, which is a UUID such as `8a2c94c1-de91-4e73-a425-dfd178c390dc`. Both URLs must be `https://` addresses with a dot in the host name; plain `http://` is rejected.

A Verified Community file looks like this:

```json
{
  "type": "redfcu.verified-community.application",
  "version": 1,
  "created": "2026-11-25T12:00:00.000Z",
  "note": "Unsigned self-reported application. ...",
  "application": {
    "name": "Applicant",
    "discord": "username",
    "discordId": "000000000000000000",
    "communityName": "Community",
    "communityUrl": "https://example.com/community",
    "platform": "discord",
    "role": "owner",
    "memberCount": "1200",
    "evidence": "https://... — public owner listing",
    "notes": ""
  },
  "confirmations": {
    "accurate": true,
    "authority": true,
    "notLegal": true,
    "notPlatform": true,
    "mayDecline": true
  }
}
```

The applicant sends that file to staff. An `admin` or `owner` signs in, presses **Left Alt + F2**, opens **Review a creator or community application**, and chooses the file. The reviewer:

1. Checks the applicant and project or community details, opens the URL and evidence links, and reads the confirmations.
2. Ticks all five review checklist boxes.
3. Chooses **Decline application** or **Accept application**.

On decline, the tool closes the review, builds a message (with an optional reason), and reminds staff to message the applicant. No badge is produced.

On accept, the tool creates a verification ID and a message to send, and offers the official badge image for download. Creator IDs use `RFCU-VC-YYYY-XXXXXX` and `assets/img/redfcu-verified-creator-badge.png`; community IDs use `RFCU-VCM-YYYY-XXXXXX` and `assets/img/redfcu-verified-community-badge.png`. The badge preview is itself a download link, and **Download badge PNG** saves the file with the verification ID in its name. In Chrome and Edge the click opens a save dialog and writes the PNG directly; other browsers use their normal download. A browser that cannot download an image will open it instead, so the panel also says to right-click or long-press and choose **Save image as…**. The tool does not generate or alter badges; both images are supplied by RedFCU. Staff send the message and the badge file to the applicant themselves. Nothing is sent or published automatically, and the site stores no application.

The reader is deliberately strict: 256 KB maximum, exact `type`, `version: 1`, required strings and length limits, an `https` URL with a dot in the host name, known roles and platforms, a Discord or Yapin user ID when one is supplied, all five confirmations set to `true`, and no application text inserted as HTML. A malformed or edited file is refused rather than displayed. The file is unsigned and self-reported, so confirming the sender and checking the evidence is the reviewer's job; the file itself proves nothing.

### Withdrawing a verification

A badge image that has already been sent cannot be deleted or recalled. The staff panel therefore includes **Withdraw a verification** for `admin` and `owner`. Enter the verification ID, choose the program, add the recipient name and the project or community name, and optionally a reason. The tool generates a message saying that the ID is no longer valid, that the badge must be taken down, and that RedFCU cannot remove copies already held. Copy and send it yourself; the site stores no revocation list, so keep a private record of every withdrawal.

The tool accepts IDs in the form `RFCU-VC-YYYY-XXXXXX` or `RFCU-VCM-YYYY-XXXXXX`. It cannot confirm that an ID was ever issued, because the site has no database. Withdrawal is a permission change and a record-keeping action, not a technical deletion.

### How a code is stored

An account's `codeHash` now holds one self-describing string:

```
pbkdf2-sha256$600000$<salt base64>$<key base64>
```

The browser derives the key with PBKDF2-HMAC-SHA256 over the typed code, the stored random salt, and the stored iteration count, then compares. The salt is public on purpose; its job is to stop precomputed tables and to stop two people with the same code from sharing a value. The iteration count is what makes each guess expensive.

A bare 64-character hex value from an older `staff.json` is still accepted: it is checked with a single SHA-256 and the panel asks for that code to be replaced. That fallback exists so an upgrade never locks anyone out. It only affects accounts that have not been rotated yet.

### Setting a staff code

- **New account:** hiring generates the code and the `codeHash` together, and prints the finished entry.
- **Existing account:** sign in, open **Derive a codeHash from a code**, type the new code, and press **Derive codeHash**. Paste the whole result (it is longer than 64 characters) into that account's `codeHash` field, in quotes, then commit the file.

A long, unique code is the only kind worth using, because the value is public and can be attacked offline. Six words plus digits is the floor, not the target.

### Forgetting or leaking a code

A stored `codeHash` cannot be turned back into a code. PBKDF2 runs one way, so no master password, decoder, or recovery key can reverse it — a tool that claims to is guessing one candidate at a time, which is exactly what an attacker would do, only slower.

So a code is **replaced**, never recovered:

1. Sign in with any working account.
2. Open **Replace a staff code**, enter the username or user ID, and press **Generate new code**.
3. Your own account always works from maintainer up. Replacing someone else's code needs admin or owner, and only the owner can replace the owner's own code.
4. Give the person the new code privately, paste the new `codeHash` (or the whole entry) over that account's block, and commit `staff.json`.

The old code stops working as soon as the new hash is published. Whoever can upload `staff.json` is the real authority here, so the replacement step has to pass through them anyway; that is why there is no self-service "unlock" shortcut.

**Do not use a birthday, a word, or anything guessable as a staff code or as a shared "master key".** The repository is public, an eight-digit date is attacked in milliseconds, and a shared secret becomes public the moment one team member leaves.

---

## 11. Still open

1. **Unity Asset Store listing** — the download page says a listing is in preparation, with no link. When the store page exists, add it to `downloads.html` (and the homepage notice if you want it there) and remove the "in preparation" sentence.
2. **Creator attribution** — the site names no individual. It credits "the project team". Adjust only if you want a public name or handle on the About page.
3. **Screenshots** — the site uses no product screenshots, so it cannot show an interface that is out of date. The repository has screenshots; if you want them here, save the images into `assets/` and add them with real captions. Do not hotlink GitHub.
4. **Repository name and production URL** — assumed to be `RedFCU.web`. There is no `sitemap.xml`, `robots.txt`, `og:url`, or canonical link because the final address is not known. Add them once it is.
5. **Free-project wording** — the site describes RedFCU as free to use under the RFCUFUL. Adjust if the Asset Store release changes that.
6. **Repository license file** — the `LICENSE` file in the GitHub repository still contains the earlier MIT-style text. A matching `LICENSE` now exists in this copy: it is the RFCUFUL 1.0.0, extracted word for word from the full text on `licensing.html`. Upload it to the repository root and commit so the repository and the site agree.
7. **Logo** — done. The supplied emblem is in `assets/img/`, wired into the header, footer, browser tab, iOS home screen, and the About page. If the artwork changes, replace `red-fcu-logo.png` and regenerate the other sizes from it. One caution: the emblem is badge-shaped with a star and the word "Federal", which reinforces the official-agency reading the notices exist to deny. A less badge-like mark would carry less risk of confusion.
8. **Staff allowlist** — the placeholder account has been replaced by the real owner account (`notnewman191`), and its code is stored as a PBKDF2 value (600,000 iterations, per-account salt). Changing that code means generating a new one in the panel (section 10) and committing `staff.json`. The previous four-word code was rotated out when the derivation changed.
9. **Renaming the identifiers** — the package, repository, and contact address still carry "CodePilot" (listed in section 2). Renaming any of them is a separate job with real consequences: a new package name breaks saved download links, and a repository rename breaks every GitHub URL on the site and needs the `404.html` path updated.
10. **Legal caution about the name** — "Red Federal Code Union" contains "Federal", "Code", and "Union", and the short form "RedFCU" reads like a credit union. In several countries, using "federal", "bank", "credit union", or "union" in a business or product name is restricted, and the notices on this site are a disclaimer, not a legal clearance. If the project ever takes money, registers a company, or ships to a wide audience, have a local lawyer check the name before relying on it.
11. **Public resource contacts** — the welcome screen was built from the supplied list reviewed on November 18, 2026. Phone numbers, hours, eligibility, and web addresses change. Re-check the official sites before moving that date forward, and do not mark the NCMH number `CONFIRMED` without the provider's own confirmation. `Find A Helpline` is intentionally `CONFIRMED`: it is a website that points visitors to the crisis line for their country, so it has no single number to verify and none should be added to it.
12. **Program statuses** - Verified Creator is open at `creator-apply.html` and Verified Community is open at `community-apply.html`; both forms send nothing and produce only a JSON file for staff. All other programs are planned, and `community-hosting.html` is closed until further notice. Keep those statuses and notices accurate. Do not add a form, email address, or submission route to a closed program, and do not imply guaranteed acceptance. When another program opens, follow the checklist in section 2, update `programs.html`, and keep the pages consistent with the banner and `about.html#name`.

---

## 12. The license (RFCUFUL)

RedFCU is licensed under the **RedFCU Free Use License (RFCUFUL) 1.0.0**, a custom license written for this project. It is **source-available, not open source**, and the site says so in several places.

What that means for editing the site:

- Never describe RedFCU as "open source", "OSI-approved", or "MIT licensed". The current wording is "free to use", "custom source-available license", or the full license name.
- The full license text is reproduced on `licensing.html`, in a `.license-doc` block. It was transcribed from the text supplied by the rights holder; do not rewrite, summarise, or reorder it. If a new license version is published, replace that block and update the version number in the `lic-meta` list and the page's hero line.
- The repository-root `LICENSE` file holds the same text as plain text, generated from that block. If you edit the block, regenerate `LICENSE` so the two stay identical; do not maintain them by hand in parallel.
- Section 2 of the supplied text defines "RedFCU" twice, with the second line clearly meant to read "Software". It is reproduced as written. If the rights holder issues a corrected version, replace the whole block rather than patching one line.
- The summary above the text ("What you can do" / "What needs written permission") is plain-language, not legal wording. Keep it consistent with the license text if the text changes.
- Do not claim that copies may be redistributed or sold. The license permits private, free sharing only, and the site's Downloads, About, and Licensing pages all restate that.
- Public redistribution or branding use requires prior written permission, so link permission requests to GitHub Issues or `CodePilot-Unity.AI@proton.me` (both are the rights holder's channels).

---

## 13. Maintenance notes

- Keep pages static. Do not add a framework, build step, package manager, or backend.
- Do not add analytics, advertising, tracking pixels, contact forms, accounts, cookies, or third-party scripts. The Privacy page describes the current behavior and would need updating if that changes. The staff panel is the one form-like element, it is local-only, and it is documented in section 10.
- Three local storage keys exist, all written inside `try`/`catch` blocks so blocked storage does not break the page: `codepilot-theme` (`light` or `dark`), `codepilot-staff` (staff session, twelve hours), and `codepilot-release-draft` (a local preview of edited release numbers).
- Keep the two light-theme token blocks in `styles.css` in sync: one is for the system preference, the other for the manual toggle.
- All internal links are relative, on every page including `404.html`, so the site works from disk and under any GitHub Pages subpath.
- When adding a page, copy the legal notice, header, and footer from an existing page, update the `<title>`, meta description, Open Graph title/description, and `aria-current="page"`, and add the page to the navigation, the footer "Site" column, and the `404.html` links where appropriate.
- The navigation breakpoint is defined twice and must stay in sync: `@media (max-width: 1099px)` in `styles.css` and `window.innerWidth > 1099` in `main.js`. It was raised from 1019px when Programs became the eighth navigation item, because the row no longer fits at the old threshold. If navigation labels change, re-check the header at widths just above the breakpoint.
- External links should stay clearly marked and should only point to verified destinations. The site currently links only to `github.com/TXSRP/CodePilot`, `discord.gg`, `ollama.com`, `docs.ollama.com`, and `github.com/ollama/ollama`.
- The notice above the header is a legal disclaimer, not decoration. Keep it on every page. It is plain HTML, so it still appears if JavaScript fails.
- Status pills: `.pill-ok` for available/positive states, `.pill-warn` for caution. Both read their colors from tokens defined in the dark root block and in both light-theme blocks.
- Release numbers come from `assets/data/release.json` (section 10). Do not reintroduce hard-coded versions in new markup: add `data-release="version"` (or `v-version`, `date`, `package`, `size`) and let `staff.js` fill it. The copy already inside the tag is only a fallback for visitors without JavaScript.
