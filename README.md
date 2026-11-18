# Red FCU website

The official static website for **Red FCU**, a Unity Editor AI assistant project with support for locally run models through Ollama.

The site is plain HTML, CSS, and vanilla JavaScript. There is no framework, package manager, build step, backend, analytics, or external service. It can be uploaded to GitHub as-is and served with GitHub Pages.

---

## 1. Pages

| File | Page | Purpose |
| --- | --- | --- |
| `index.html` | Home | Introduction, Unity/Ollama relationship, setup flow, current release. |
| `getting-started.html` | Getting Started | Import the package, install Ollama, pull a model, connect the two. |
| `downloads.html` | Downloads | Latest Red FCU release from GitHub, a requirements summary, and Ollama listed separately. |
| `faq.html` | FAQ | Cost and license, Unity versions, models, hardware, privacy, sharing, and what the name does and does not mean. |
| `troubleshooting.html` | Troubleshooting | Setup checks, Ollama connection, performance, and what to include in a report. |
| `community.html` | Community & Support | The Red FCU Discord and GitHub Issues, plus Ollama's own resources. |
| `about.html` | About | Purpose, relationship with Unity and Ollama, and what the project publishes. |
| `privacy.html` | Privacy | What the site does and does not do, including the theme preference stored in the browser. |
| `licensing.html` | Licensing | RFCUFUL summary, plus the full license text reproduced on the page. |
| `404.html` | Not found | Shown by GitHub Pages for missing addresses. Links back to the main pages. |

Every page also carries a legal notice above the header. It states that Red FCU is an independent software project; that it is not a bank, credit union, or financial institution; that it is not a government body, law-enforcement agency, or federal authority; and that it is not affiliated with or endorsed by any government, regulator, police force, or financial institution. Keep that notice on new pages. It is a disclaimer, not decoration.

Privacy and Licensing are linked from the footer on every page.

## 2. Files and folders

```text
RedFCU.web/
├── index.html
├── getting-started.html
├── downloads.html
├── faq.html
├── troubleshooting.html
├── community.html
├── about.html
├── privacy.html
├── licensing.html
├── 404.html
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
    │   ├── favicon-32.png
    │   └── apple-touch-icon.png
    └── js/
        ├── theme.js
        ├── main.js
        └── staff.js
```

- `assets/css/styles.css` — the single shared stylesheet: design tokens, dark/light themes, layout, components, the staff panel, responsive rules, and reduced-motion handling.
- `assets/js/theme.js` — a small script loaded in the page head. It applies a saved light/dark choice before the page paints. If local storage is blocked, it quietly falls back to the system theme.
- `assets/js/main.js` — the theme toggle, mobile navigation, footer year, and the "safe to enhance" class that reveals the header controls only when JavaScript is available.
- `assets/js/staff.js` — fills the release version, date, package name, and size from `release.json`, and builds the hidden staff editor (Left Alt + F2). Nothing is sent anywhere.
- `assets/data/release.json` — the current release details. Edit this one file after a release; every page reads it.
- `assets/data/staff.json` — the public allowlist for the staff editor, with instructions inside the file.
- `assets/img/` — the Red FCU emblem, supplied by the owner. `red-fcu-logo.png` is the 512px master with the corners masked to transparency; the other four files are generated sizes for the header, footer, browser tab, and iOS home screen. Replace the master and regenerate the rest if the artwork changes.
- The homepage orbit illustration is original inline SVG, drawn with the site's own colors. All other decoration is CSS.

Every page uses the same legal notice, header, navigation, and footer. Navigation labels are: Home, Getting Started, Downloads, FAQ, Troubleshooting, Community & Support, About. The desktop navigation collapses into the menu button below 1020px.

### The name and the notices

| | |
| --- | --- |
| Long name | **Red Federal Code Union** |
| Short name | **Red FCU** |
| Where they appear | Every `<title>`, meta description, Open Graph tag, the header wordmark, the footer, the About page, and the FAQ |

The wordmark renders as `Red <span class="brand-accent">FCU</span>`. `Red Federal Code Union` is spelled out in full on `about.html` and `faq.html`, where a visitor is most likely to ask what the name means, and the About page also explains why the name does not make this a financial or government body.

The long name uses words, but the site only ever renders the **short** name in the header, titles, and body copy. That is deliberate: it keeps the pages readable and makes the notice, not the name, carry the meaning.

**Identifiers deliberately left as "CodePilot".** These are real names already in the world, and renaming them in the site would break links or misstate the license:

- `Codepilot-AI.unitypackage` — the actual package file name in the repository.
- `https://github.com/TXSRP/CodePilot` (and its `/releases`, `/issues` paths) — the actual repository.
- `CodePilot-Unity.AI@proton.me` — the real contact address.
- `codepilot-theme`, `codepilot-staff`, `codepilot-release-draft` — local storage keys. Renaming them would silently sign staff out and reset visitor themes.

The license is not on that list. It is the **Red FCU Free Use License (RFCUFUL) 1.0.0**, reproduced in full on `licensing.html`. Only the repository URL, the package file name, the contact address, and the storage keys still carry the earlier name.

`downloads.html` carries a short note saying that the repository and the package file name still use the earlier name, so the mismatch is explained rather than hidden. `licensing.html` reproduces the license text as supplied by the rights holder.

The deployment path is now `RedFCU.web` in both the folder name and the absolute paths in `404.html`. If the GitHub repository ends up with a different name, change the paths as described in section 8.

---

## 3. Preview the website locally

You do not need to install anything.

1. Open the `RedFCU.web` folder in File Explorer.
2. Double-click `index.html`. It opens in your default browser.
3. Use the navigation to move between pages. The theme toggle, mobile menu, and footer year should work normally from disk.

Notes:

- The theme toggle starts from your operating system's light/dark setting. Your manual choice is remembered in the browser.
- Narrow the browser window (or use the browser's responsive view) to check the mobile navigation.
- **`404.html` is the one exception when previewing from disk.** It uses paths rooted at `/RedFCU.web/` so it still works when GitHub Pages serves it for a missing address at any folder depth. Opened directly from disk it will appear unstyled. It can be checked after the site is live, or by serving the folder from a local web server if you have one available.
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
5. Enter a short commit message, such as `Add Red FCU website`.
6. Select **Commit changes**.

To confirm the upload worked, the repository file list should show `index.html`, the other HTML pages, `README.md`, and an `assets` folder at the top level.

## 6. Enable GitHub Pages

1. In the repository, open **Settings**.
2. In the left sidebar, select **Pages**.
3. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
4. Set **Branch** to **main** and the folder to **/ (root)**.
5. Select **Save**.
6. GitHub shows the site address after it builds, usually within a few minutes. For a repository named `RedFCU.web`, it will look like:

   `https://YOUR-USERNAME.github.io/RedFCU.web/`

7. Open that address and click through every page. Test the mobile menu and the theme toggle.

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

All pages except `404.html` use relative links, so they work under any repository name. `404.html` uses paths starting with `/RedFCU.web/` because GitHub Pages serves that file for missing addresses at any depth, where relative links would break.

If the repository is **not** named `RedFCU.web`:

1. Open `404.html` on GitHub and select **Edit**.
2. Use Find and Replace in your editor or on GitHub to replace every `/RedFCU.web/` with `/YOUR-REPOSITORY-NAME/`.
3. Commit the change.

The same replacement applies if the site ever moves to a custom domain at the domain root (use `/` instead).

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

The version appears on five pages: `downloads.html`, `getting-started.html`, `index.html`, `faq.html`, and `troubleshooting.html`. All of them read the same file, so they cannot fall out of step. The download links in the table above do not change between releases, because they point at `releases/latest`.

The staff editor in section 10 writes this file for you: press Left Alt + F2, change the fields, and select **Download release.json**.

The numbers still hard-coded in the HTML are fallbacks, used only if `release.json` cannot be loaded (JavaScript disabled, or the page opened from disk). They are not read when the file is available, so they do not need updating on every release. Refresh them occasionally so a visitor without JavaScript does not see something ancient.

If the release changes the package file name, update `package` in the same file. If the requirements or supported model list change, update the "What Red FCU needs" card to match `Computer Specs.md`.

If the Discord invite ever expires, regenerate it in Discord and replace the address in both pages above. A dead invite is worse than no invite, so check it occasionally.

### Ollama

The Ollama installer link (`https://ollama.com/download/OllamaSetup.exe`) and the Ollama site links are genuine Ollama destinations and are clearly labelled as third-party. Leave them attributed to Ollama and do not present them as Red FCU downloads.

---

## 10. Release data and the staff editor

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

### The staff editor

Press **Left Alt + F2** on any page. The panel is built by `staff.js`, so pages need no extra markup, and it stays out of the way until someone uses the key combination.

1. Type a Discord username or user ID from `assets/data/staff.json`.
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
- **The optional staff code is weak by design.** The hash is public, so a short code can be attacked offline. Use a long random one, and treat the code as a speed bump rather than a password.

If real sign-in is ever required, it needs a backend or a GitHub token flow, and the Privacy page and the "no accounts" wording would have to change with it.

### Adding a staff account

1. Open `assets/data/staff.json` in a text editor. The `_help` block at the top carries the same instructions.
2. Copy the `exampleAccount` block and paste it inside `accounts`, after the last account, with a comma between them.
3. Fill in `username`, `displayName`, and `userId`. Public details only.
4. Upload the file to `assets/data/staff.json` and commit.
5. Press Left Alt + F2 and sign in with that username or user ID.

Set `"enabled": false` to suspend an account without deleting it.

**Before publishing the site, replace the placeholder account.** It ships as `example-staff`, enabled, with no staff code, so the panel can be tested straight away. Anyone who reads the file could use that name.

### Setting a staff code

1. Sign in to the editor and open **Staff code hash**.
2. Type the code and press **Hash code**. Copy the 64-character result.
3. Paste it into that account's `codeHash` field, in quotes, and commit the file.

A long, unique code is the only kind worth using, because the hash is public and can be attacked offline.

---

## 11. Still open

1. **Unity Asset Store listing** — the download page says a listing is in preparation, with no link. When the store page exists, add it to `downloads.html` (and the homepage notice if you want it there) and remove the "in preparation" sentence.
2. **Creator attribution** — the site names no individual. It credits "the project team". Adjust only if you want a public name or handle on the About page.
3. **Screenshots** — the site uses no product screenshots, so it cannot show an interface that is out of date. The repository has screenshots; if you want them here, save the images into `assets/` and add them with real captions. Do not hotlink GitHub.
4. **Repository name and production URL** — assumed to be `RedFCU.web`. There is no `sitemap.xml`, `robots.txt`, `og:url`, or canonical link because the final address is not known. Add them once it is.
5. **Free-project wording** — the site describes Red FCU as free to use under the RFCUFUL. Adjust if the Asset Store release changes that.
6. **Repository license file** — the `LICENSE` file in the GitHub repository still contains the earlier MIT-style text. The website now reproduces the RFCUFUL 1.0.0, because that is the license you supplied. Replace the repository file with the same text so the two agree; until then, the repository and this site contradict each other.
7. **Logo** — done. The supplied emblem is in `assets/img/`, wired into the header, footer, browser tab, iOS home screen, and the About page. If the artwork changes, replace `red-fcu-logo.png` and regenerate the other sizes from it. One caution: the emblem is badge-shaped with a star and the word "Federal", which reinforces the official-agency reading the notices exist to deny. A less badge-like mark would carry less risk of confusion.
8. **Staff allowlist** — the placeholder account has been replaced by the real owner account (`notnewman191`), and a staff code hash is set. Changing that code means regenerating the hash in the panel (section 10) and committing `staff.json`.
9. **Renaming the identifiers** — the package, repository, and contact address still carry "CodePilot" (listed in section 2). Renaming any of them is a separate job with real consequences: a new package name breaks saved download links, and a repository rename breaks every GitHub URL on the site and needs the `404.html` path updated.
10. **Legal caution about the name** — "Red Federal Code Union" contains "Federal", "Code", and "Union", and the short form "Red FCU" reads like a credit union. In several countries, using "federal", "bank", "credit union", or "union" in a business or product name is restricted, and the notices on this site are a disclaimer, not a legal clearance. If the project ever takes money, registers a company, or ships to a wide audience, have a local lawyer check the name before relying on it.

---

## 12. The license (RFCUFUL)

Red FCU is licensed under the **Red FCU Free Use License (RFCUFUL) 1.0.0**, a custom license written for this project. It is **source-available, not open source**, and the site says so in several places.

What that means for editing the site:

- Never describe Red FCU as "open source", "OSI-approved", or "MIT licensed". The current wording is "free to use", "custom source-available license", or the full license name.
- The full license text is reproduced on `licensing.html`, in a `.license-doc` block. It was transcribed from the text supplied by the rights holder; do not rewrite, summarise, or reorder it. If a new license version is published, replace that block and update the version number in the `lic-meta` list and the page's hero line.
- Section 2 of the supplied text defines "Red FCU" twice, with the second line clearly meant to read "Software". It is reproduced as written. If the rights holder issues a corrected version, replace the whole block rather than patching one line.
- The summary above the text ("What you can do" / "What needs written permission") is plain-language, not legal wording. Keep it consistent with the license text if the text changes.
- Do not claim that copies may be redistributed or sold. The license permits private, free sharing only, and the site's Downloads, About, and Licensing pages all restate that.
- Public redistribution or branding use requires prior written permission, so link permission requests to GitHub Issues or `CodePilot-Unity.AI@proton.me` (both are the rights holder's channels).

---

## 13. Maintenance notes

- Keep pages static. Do not add a framework, build step, package manager, or backend.
- Do not add analytics, advertising, tracking pixels, contact forms, accounts, cookies, or third-party scripts. The Privacy page describes the current behavior and would need updating if that changes. The staff panel is the one form-like element, it is local-only, and it is documented in section 10.
- Three local storage keys exist, all written inside `try`/`catch` blocks so blocked storage does not break the page: `codepilot-theme` (`light` or `dark`), `codepilot-staff` (staff session, twelve hours), and `codepilot-release-draft` (a local preview of edited release numbers).
- Keep the two light-theme token blocks in `styles.css` in sync: one is for the system preference, the other for the manual toggle.
- All internal links are relative except on `404.html`, so the site works under a GitHub Pages project subpath.
- When adding a page, copy the legal notice, header, and footer from an existing page, update the `<title>`, meta description, Open Graph title/description, and `aria-current="page"`, and add the page to the navigation, the footer "Site" column, and the `404.html` links where appropriate.
- The navigation breakpoint is defined twice and must stay in sync: `@media (max-width: 1019px)` in `styles.css` and `window.innerWidth > 1019` in `main.js`. If navigation labels change, re-check the header at widths just above the breakpoint.
- External links should stay clearly marked and should only point to verified destinations. The site currently links only to `github.com/TXSRP/CodePilot`, `discord.gg`, `ollama.com`, `docs.ollama.com`, and `github.com/ollama/ollama`.
- The notice above the header is a legal disclaimer, not decoration. Keep it on every page. It is plain HTML, so it still appears if JavaScript fails.
- Status pills: `.pill-ok` for available/positive states, `.pill-warn` for caution. Both read their colors from tokens defined in the dark root block and in both light-theme blocks.
- Release numbers come from `assets/data/release.json` (section 10). Do not reintroduce hard-coded versions in new markup: add `data-release="version"` (or `v-version`, `date`, `package`, `size`) and let `staff.js` fill it. The copy already inside the tag is only a fallback for visitors without JavaScript.
