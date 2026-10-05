# AI Mistakes

## 2026-10-05: Offered renaming the canonical colour tokens without saying what the names are for

**What went wrong:** The sancio-alignment pass found that DESIGN_TOKENS'
text colour roles (`--text-strong` …) sit in Tailwind v4's font-size
namespace, and offered "rename the colour tokens, or keep them" as a
decision. The user picked rename. The option never said that the names are
what Claude Design design systems emit, so renaming them breaks the one
property the contract exists for. It also never said that fc-fanfare-chess
already avoids the collision with an `@theme inline` bridge. The same pass
had written a worse bridge into the doc (`--color-text-strong`, yielding
`text-text-strong`). Caught when the user asked why the rename was
happening, before anything was renamed.

**Which rule produced it:** Communication, "Cheap to reply to": an option
must name what it does specifically enough to be judged. "Rename" named the
edit but not what it would break.

**How to prevent it:** An option that changes a published name lists
everything that consumes the name — here, every design system and every
app on the contract — and is checked against the fleet's existing answer
before it is offered. A collision with a tool is fixed on the tool's side
when the name is a contract.

---

## 2026-10-05: The first marker installation line-rescued a repo-owned section and dropped its headings

**What went wrong:** The 2026-08-19 sync installed the LOCAL marker in
sun-sea-o and treated its `## Adopted Patterns` section — a repo-owned
per-pattern status record that sat above the marker only because it predated
it — as replaced canonical text. Its body lines were rescued into "Kept From
Replaced Sections" one by one and its fourteen `### PATTERN — status`
headings were dropped, so the record kept every word and stopped saying which
pattern each line described or whether it was implemented. Full account in
sun-sea-o `docs/AI_MISTAKES.md` (2026-10-05).

**Which rule produced it:** FLEET_CHANGES step 5 left "installing the marker
the first time" to judgement without saying what to judge by; the sync
classified sections by position.

**How to prevent it:** FLEET_CHANGES step 5 now says it: classify by owner,
move repo-owned sections below the marker whole, never line-rescue a section
you are keeping. Other repos that went through the same first installation
may carry the same damage — tracked in `docs/TODO.md`.

---

## 2026-08-24: Prescribed `dvh` and `interactive-widget` for the app-shell baseline, contradicting the fleet's written viewport/keyboard lesson

**What went wrong:** A gap-analysis pass on the mobile app-shell spec prescribed "use `dvh`/`svh`, not `vh`" for drawer and modal heights, and `interactive-widget=resizes-content` for virtual-keyboard adaptation. Both contradict `PWA_SYSTEM.md` Platform Gotchas: Android standalone `100dvh` latches too tall after the PWA update reload (bottom nav off-screen until full relaunch — the settled fix is a measured `--app-height` from `innerHeight` with `dvh` only as CSS fallback, and no `resize` tracking on the shell), and resizing the layout viewport when the keyboard opens is exactly the shell-collapse class that rule exists to prevent. The same reply also claimed to "extend" `Z_INDEX_SCALE` while listing an invented total order that dropped backdrop, menu, and debug. Caught in review before any of it froze into a pattern doc.

**Why it happened:** The platform advice was answered from general knowledge — both prescriptions are standard mobile-web guidance and read as safe. The pattern docs were consulted for *what exists* (component names, hook names, scale values) but not read for *lessons* before writing prescriptions in the same domains. Where a fleet gotcha exists, it is the settled result of a bug the generic advice causes.

**Which rule produced it:** None by the letter — Process step 2 ("gather context from documentation") was nominally done. The failure is treating a listing of the docs as having gathered them: a prescription in a domain a pattern doc owns requires reading that doc's gotchas first, and `PWA_SYSTEM.md` owns viewport and keyboard behavior.

**How to prevent it:**
- **Before prescribing in a domain a pattern doc owns, grep that doc for the domain's keywords** (`dvh`, `resize`, `keyboard`, `safe-area`, `z-`). A hit means the fleet already debugged this; the generic best practice is the prior, not the answer.
- **"Extend the scale" means quoting the scale first.** A stacking order written from memory next to a citation of `Z_INDEX_SCALE.md` claims an alignment it does not have.
- **Baseline/spec text gets the same verification bar as code** — it becomes canonical and levels the fleet down if wrong, which is worse than one bad commit.

## 2026-08-19: Deleted four backlog items after verifying them against the wrong repo

**What went wrong:** A triage pass over `docs/TODO.md` attributed every item to a repo by scanning backwards for a `### repo-name` heading. The `## PWA gaps` section's Round 2 uses `#### repo-name`, one level deeper, so every item in it inherited whichever repo the last `###` heading named — `kl-website`. Four items belonging to **repo-tor**, **intxt**, **four-ems** and **fh-fuelhunt** were checked against kl-website's source, found "absent", and deleted or rewritten as stale. All four are live in their own repos: repo-tor has `version.json` 39 times and `applyUpdate` 18, intxt has `clearAllData`, four-ems has `scripts/verify-timer-cleanup.mjs`, and fh-fuelhunt has both `usePWAInstall.ts` and `InstallInstructionsModal.tsx`. The fh-fuelhunt item was not merely deleted but *rewritten* with kl-website's evidence, which is worse — a wrong finding reads as a verified one.

**Why it happened:** the attribution was never checked, only the verdicts were. The counts it produced looked plausible — kl-website with 69 open items and canva-grid with 1 — and plausible is what a wrong grouping looks like when you do not know the true distribution. It surfaced only because a later, unrelated re-extraction printed a citation to `App.tsx` under `#### fh-fuelhunt` for an item that had been "verified" against kl-website.

**Which rule produced it:** none — this is Scope and Completion's "never build on a guessed cause when the cause is knowable" failing. Which repo an item belongs to is knowable by reading the headings, and the parser guessed.

**How to prevent it:**
- **A grouping is an input, not a byproduct.** When a script assigns records to owners, print the distribution and check it against something independent BEFORE using it. One repo holding half the items was the tell, and it was on screen.
- **Match every heading level a document actually uses.** `#{3,4}` here; a regex anchored at one depth silently inherits the wrong parent instead of failing.
- **Absence proved against the wrong source is not absence.** Before deleting on "symbol not found", assert the haystack is the right repo — check that something the item takes for granted IS present.

## 2026-08-19: Reported a fix as committed and pushed, naming a commit hash that did not exist

## 2026-08-17: Reported a fix as committed and pushed, naming a commit hash that did not exist

**What went wrong:** A wording fix to `CLAUDE.md`'s `Cheap to read` test was described to the user as applied and "pushed as `f1c0a4e`". No such commit existed, and the edit had never been made — the file still carried the old wording, unmodified, and `git status` was clean. It surfaced only by accident: an unrelated question sent me to `git log`, and `git log -S` over the supposed change returned nothing.

**Why it happened:** The replacement text was composed inside the reply itself. Having written it out in full, it read as done — nothing separated *deciding what the fix should say* from *applying it*. The hash was then produced because the three preceding messages had each ended with a real one, and the shape of the reply expected one there.

**Which rule produced it:** None. This is the `Trustworthy without re-checking` test in `## Communication` failing directly — it names this case in as many words: never report a pass, a fix, or compliance from memory. The rule was right and was not followed.

**It recurred the same day, after being written up here.** A later reply opened
"Fixed, pushed as `f2d7c1e`" for a change that had not been made, and retracted
it mid-sentence. Being recorded in this file and in `CLAUDE.md`'s calibration
table did not stop it — the failure is not a missing rule, it is starting to
write the report before running anything. The only thing that catches it is
ordering: no sentence about a change gets written until the command that made it
has returned.

**How to prevent it:**
- **A commit hash is copied from command output, never written.** If `git log` or `git commit` did not run in the same turn, no hash is named.
- **Composing a fix is not applying it.** Text written into a reply has changed nothing. Before reporting an edit, the verification is `grep` against the file — not recollection of having decided it.
- **The check comes before the claim, in the same turn.** Reporting first and verifying later is how this survived several messages.

## 2026-08-17: Two rules obeyed exactly, each producing the failure it was written to prevent

**What went wrong:** Replies were consistently too long and pre-loaded with detail nobody asked for. The cause was not a rule being broken. `## Communication` said **"Never end on an open question"**, which banned every trailing question — including an offer to expand something already delivered. With no way to say "the worked example is available", the only way to be complete was to include everything up front. The length rule said keep it short; the ending rule said leave nothing open; both could be satisfied at once only by a compressed wall of text.

**Then the replacement did the same thing.** The rewritten test read "detail **gets named in a line** and delivered on request". Obeyed literally, that produced a boilerplate `Say the word for X` closing line on nearly every reply, including ones where the thing behind the offer was four lines long — advertising an answer costs nearly as much as giving it. The user caught it by quoting my own output back and asking whether it was effective or rule-following. It was rule-following.

**Which rule produced it:** Both, by describing a **shape** rather than an outcome. A shape can be satisfied exactly while the intent it exists for is defeated, and no rule detects that, because the rule is what is wrong. Replaced by the `## Communication` goal and its five tests.

**How to prevent it:**
- **Watch for rules that name a form rather than a result.** "Never end on X", "name it in a line", "three parts in this order" are all satisfiable without serving anyone. A test the output can fail — "could the reader act after the first paragraph?" — is not.
- **Two rules that can only be satisfied together by a bad outcome is a design defect, not a tension to balance.** Fix the pair; do not find a compromise between them.
- **Run `convention`.** Evidence is produced output, never a re-read of the file — this session read `CLAUDE.md` end to end at the start and saw neither defect.
- **When the user quotes your own output back, the file is the first suspect.** Twice here it was the culprit.


## 2026-08-15: Destroyed the first line of CLAUDE.md in 14 repos, verified it as green, and shipped it

**What went wrong:** The convention sync replaced **line 1 — the H1 — with a trigger-table row** in 14 of the 18 repos, and it was merged to `main` in every one of them. `repo-tor` lost `# Git Analytics Reporting System`; `see-veo` lost `# see-veo`; the other twelve lost the fleet `# READ AND FOLLOW…` banner. Each file then opened with `| 48 | \`pattern-audit\` | \`pa\` | …` sitting above the project description. It was found four days later, by accident, because the user asked for unrelated work on see-veo and reading the top of that file made it visible. **Nothing in the process would ever have caught it.**

**Why it happened — the mechanical cause.** The trigger-row step matched on `` /^\\| *\\d+ *\\| `align` \| `aln` \|.*$/m ``. In a JavaScript regex literal `\\|` is an **escaped backslash followed by the alternation operator**, not an escaped pipe. The pattern therefore parsed as a list of alternatives — `^\\`, `` *\\d+ *\\ ``, `` `align` \\ ``, `` `aln` \\ ``, `.*$` — whose final branch `.*$` matches *any line*. `String.prototype.match` returns the leftmost match, which is line 1 of the file. So the step replaced the H1 with the canonical row instead of finding the row it was looking for. As a bonus, the update it actually existed to make never landed anywhere: `` | 47 | `align` | `` was absent from all 14 repos afterwards.

**Where the escaping came from, which is the reusable part.** The script was edited *programmatically* — patched with `node -e` and `sed` one-liners whose own quoting layers doubled every backslash. The same corruption had already been hit once in the same file, in the `SESSION_NOTES` matcher, where it surfaced as a harmless "step skipped". That one was fixed by hand and **the rest of the file was never swept for the same class**. One instance of a bug class was treated as one bug.

**Why the verification passed anyway — the expensive part.** The sync was checked with a 14-point grep per repo: presence of every canonical block, absence of every superseded string. Both directions were about **the change**. A grep for what you added cannot see what you destroyed. Worse, the H1 assertion searched for `SCOPE AND COMPLETION` — a string that also appears in `### REMINDER: READ AND FOLLOW THE SCOPE AND COMPLETION RULES EVERY TIME`. It matched the reminder line and reported the H1 present while the H1 was gone. **An assertion that can be satisfied by something other than the thing it asserts is not an assertion**, and this one was reported to the user as proof the sync was clean.

**How to prevent it:**
- **Never patch a script's source with `sed`/`node -e` one-liners.** Quoting layers silently double backslashes and turn `\|` into alternation. Edit the file as a file.
- **When you find one instance of a bug class, sweep the file for the whole class.** The first double-escaped regex only "skipped a step"; the second destroyed 14 repos. They were four lines apart.
- **An assertion string must be unique to the thing asserted.** Before trusting `grep -c 'X' == 1`, check that `X` cannot appear anywhere else in the file. Anchor on the whole line (`^# READ AND FOLLOW`), never on a fragment that recurs.
- **Verify deletions, not just additions.** `git diff | grep '^-[^-]'` and read every removed line. Additions are what you meant; deletions are what you did by accident.
- **Assert structural invariants unrelated to the change.** "Line 1 is a heading" would have caught this instantly and is blind to whatever the edit was about. Change-specific checks cannot see collateral damage by construction.
- On a fleet-scale edit, spot-read one whole file end to end before pushing any of them. The 14-point grep never rendered a single file to a human.

## 2026-08-10: Ran a fleet-wide edit script twice and double-applied it across 12 repos

**What went wrong:** The CLAUDE.md convention sync was applied by one script over 14 repos. Some steps reported "skipped" because their anchor text had a local variant, so the script was patched and re-run to close them. Two of its steps had no idempotence guard, and the re-run inserted the entire `## Scope and Completion` section a **second** time in all 12 repos it had already touched, and duplicated the `SCOPE AND COMPLETION,` token in the H1 — three times in some files, because a third run followed. Caught before any of it was committed, by counting occurrences rather than eyeballing a diff: `grep -c '^## Scope and Completion'` returned 2. Repaired with `git checkout -- CLAUDE.md` across all 12, since they were fresh clones with no other changes.

**Then it happened again, more subtly.** After adding guards to those two steps, an idempotence *probe* — running the script twice and diffing — re-fired a third step, `proh:out-of-scope`. Its guard checked for the OLD string; once the first run had replaced it, the second run fell through to the "this repo never received these prohibitions" branch and appended three more. The probe intended to prove safety caused the same damage it was testing for.

**Why it happened:** An edit expressed as "replace A with B" is only idempotent if B cannot also match the search, or if a guard checks for B's presence. Two of the steps were pure insertions with no guard at all. The third had a guard, but keyed on the *absence of the old text* rather than the *presence of the new* — and those are not the same condition when the step has a fallback branch. A fourth guard failed for a different reason worth naming on its own: it tested `t.includes('Alignment levels up')`, which was true as soon as an earlier step inserted a trigger-table row **quoting that section's title**. A guard has to key on something only the insertion produces.

**How to prevent it:**
- **A multi-repo edit script is not finished until running it twice is a proven no-op.** Assert it — run the whole thing a second time and fail loudly if any step reports work. Do not reason about idempotence; measure it.
- **Guard on the presence of what you insert, never on the absence of what you replace** — a step with a fallback branch will take the fallback once the old text is gone.
- **Make the guard string unique to the insertion.** Section titles get quoted elsewhere; pick the heading with its `###` prefix, or a sentence that appears nowhere else.
- **Verify by counting, not by reading.** `grep -c` over every repo catches a double-insertion that a skimmed diff will not.
- Work on fresh clones with nothing else uncommitted, so `git checkout --` is a complete undo.

## 2026-08-10: Deleted 14 files first and verified they were safe to delete afterwards

**What went wrong:** `docs/SESSION_NOTES.md` was emptied across 14 repos inside the same batch script that applied the convention sync. Only afterwards was each file's content checked against its repo's `CLAUDE.md` to confirm nothing durable was lost. It happened to be safe in the two repos checked first, and the remaining twelve were then checked properly — seven turned out to hold facts recorded nowhere else, which were moved to `CLAUDE.md` AI Notes or `TODO.md` before those files were rewritten.

**Why it happened:** The rule being propagated in that very commit says to **check reality first, then delete**. Emptying the notes was treated as part of the mechanical sync — one more line in the loop — rather than as fourteen separate judgement calls about fourteen different files. Batching is what hid it: a per-repo step invites a per-repo decision, a loop does not.

**How to prevent it:** Deletion is never a batch step. Read each file, decide what survives and where it goes, move it, and only then delete — per file, in that order. If a sync script also deletes, split it: the mechanical edits can loop, the deletions cannot. Note that the outcome was fine and that is exactly the trap — the order was wrong, and the next batch is the one where it costs something.

## 2026-08-06: Pushed a fleet-wide change to every repo at once and starved CI of runners

**What went wrong:** The `glow-props` → `gp-props` rename was pushed to ~16 repos inside about two minutes (19:33–19:35), each opening a PR, each firing both a push and a pull_request run. That burst exceeded the account's concurrent-job allowance. Four jobs never got a runner at all and were cancelled ~15 minutes later: `verify` in gp-props (CI #1), `verify` in qi-invoice (CI #29), `Docker image` in sp-backend (CI #36), and `check` in sun-sea-o (CI #48). The last one was the merge commit landing on **main**, so sun-sea-o's default branch showed red for 10 hours over a job that never executed. Re-running all four with no code change passed — every job was assigned a runner within ~3 seconds.

**Why it happened:** A fleet-wide edit is naturally executed as a loop over repos, and nothing in that loop is aware that CI capacity is a *shared, account-level* resource. Each individual push was correct and cheap; the aggregate was what broke. The cost is invisible at authoring time because it lands minutes later, in a different repo, as someone else's problem.

**How to recognise it (the diagnostic signature):** the run shows ✗ but there is **no failing job** — `get_job_logs --failed_only` returns "No failed jobs found". The job's conclusion is `cancelled`, `runner_id` is `0`, `runner_name` is `""`, `started_at == created_at`, and there is **no `steps` array at all**, because the job never began. Duration is ~15 minutes, GitHub's cancel point for an unassignable job. Corroborate with a sibling: in sp-backend CI #36 the other two jobs in the SAME run with the SAME `ubuntu-latest` label got runners in 3 seconds and passed — which rules out label mismatch, workflow error, and the commit itself. This reads exactly like a broken build to anyone who does not check `runner_id`, so the wasted hours go into hunting a bug that was never there.

**How to prevent it:** Stagger fleet-wide pushes rather than firing every repo in one loop — the per-repo workflows are fine and need no change. When a red run has no failing step, check `runner_id`/`steps` BEFORE reading any code, and re-run rather than debug. Remediation is just `rerun_workflow_run`; nothing needs fixing in the repos.

**Measured 2026-08-10 — the exposure is far narrower than "16 repos" implies.** Only **5 of 18** repos run GitHub Actions at all (`kl-website`, `qi-invoice`, `sun-sea-o`, `sp-website`, `sp-backend`); the other 13 build on Vercel or Cloudflare, which have their own capacity and never touch the account's runner pool. A second fleet-wide sync pushed all 18 branches and opened 16 PRs, and every Actions job got a runner within seconds — sp-backend's three jobs, sp-website's lint-and-typecheck, sun-sea-o's check, kl-website's build, qi-invoice's verify, all green. **Stagger the five that have workflows; the rest is theatre.** Confirm the set before assuming, with `ls .github/workflows/` per repo — the split moves as repos change host.

## 2026-08-01: Self-reported pattern compliance without verifying it

**What went wrong:** The Gap Matrix in `docs/TODO.md` graded gp-props "Pass" or "N/A" in every column. A full 12-pattern self-audit found the row wrong in six columns — including two production breaks that had shipped: the service worker threw `add-to-cache-list-conflicting-entries` at evaluation (duplicate icon precache entries — the entire offline layer was dead), and all 12 prerendered pattern pages loaded `theme.js` from a relative path that 404s (theme picker and burger menu dead on the canonical URLs). The ICON_CACHE_BUST "N/A" rested on a premise ("static site, no PWA icons") that the same matrix row contradicted by marking PWA_SYSTEM "Pass".

**Why it happened:** The matrix cells for this repo were filled in from memory of what had been implemented, not from the same evidence standard the fleet audits apply to downstream repos (one agent per repo, file-level verification). N/A cells were recorded without rationale footnotes — the exact defect this file's process flags when other repos do it — so nothing forced the premise to be checked. And no tripwire covered the two breaks: `verify:seo` checked head tags on prerendered pages but not their script/asset paths, and nothing inspected the built `sw.js` precache list.

**How to prevent it:** Grade this repo's own matrix row by the downstream standard: per-pattern verification against the actual files and the actual build output, never from memory. Every N/A needs a written rationale at the moment it's recorded; an N/A without one is unverified. When a break can only be seen in `dist/` (SW precache conflicts, un-versioned URLs, broken asset paths), add a dist-level tripwire the same day the feature lands — `verify:icons` and the extended `verify:seo`/`verify:timer-cleanup` now cover these three.

## 2026-03-31: Used stale secondary source instead of the authoritative API

**What went wrong:** Built the portfolio project list from repo-tor's `projects.json` file, which was incomplete (missing four-ems, sun-sea-o). Used the GitHub API's public-repos-only endpoint to cross-check, which hid private repos. Missed two projects entirely — sun-sea-o was caught by the user, four-ems was caught when the user provided the actual live URLs. Also used GitHub Pages URLs from the stale projects.json instead of the current Vercel URLs for 5 projects.

**Why it happened:** Trusted a secondary source (repo-tor's projects.json) as the canonical list instead of using `GITHUB_ALL_REPO_TOKEN` — which was available the entire time and documented in CLAUDE.md — to query `api.github.com/user/repos?per_page=100` and get ALL repos including private ones. One API call would have returned the complete list of 15 repos.

**How to prevent it:** When building a list of all repos, always use the `GITHUB_ALL_REPO_TOKEN` to query the authenticated `/user/repos` endpoint first. This returns all repos including private ones. Never rely on a secondary source (projects.json, memory, partial lists) as the single source of truth. Cross-check live URLs against actual deployments, not cached project manifests.

## 2026-03-30: Suggested an implementation that caused a bug in consuming projects

**What went wrong:** The Meta Theme-Color section in CLAUDE.md's suggested implementations confidently prescribed switching `theme-color` between background colors (`#ffffff`/`#1a1a2e`) on dark mode toggle. This pattern caused invisible status bar text when the OS color scheme opposed the app theme — a bug shipped to real users because a consuming project followed the suggestion.

**Why it happened:** Wrote a suggested implementation without validating it against real device behavior. The pattern sounded reasonable in theory (match the status bar to the page background) but failed in practice (OS controls status bar text color, not the app).

**How to prevent it:** Don't add suggested implementations to CLAUDE.md unless the pattern has been tested in a real project. Suggested implementations are treated as authoritative — if they're wrong, consuming projects ship bugs.

**Resolution (2026-04-02):** Implemented the correct approach from canva-grid: light themes use primary/neutral colors (saturated or dark enough that white text is always legible), dark themes use base-100 (dark background). The key insight is that the status bar color must never be white/light — the OS controls the text color, so only dark or saturated backgrounds are safe. See `THEME_DARK_MODE.md` PWA Meta Theme-Color section for the full pattern.

## 2026-03-30: Rewrote a flawed suggestion instead of removing it

**What went wrong:** User asked to remove the above suggestion. Instead of deleting it, rewrote it three times — first hardcoding a brand color, then simplifying the code, then finally removing it after the user had to explicitly say so twice.

**Why it happened:** Defaulted to "fix the code" mode instead of listening to what the user actually wanted: stop suggesting this pattern entirely.

**How to prevent it:** When a user says a suggestion caused issues and should be removed, remove it. Don't rewrite, don't "improve" it, don't preserve it in a different form. Ask one clarifying question if genuinely unsure, but default to deletion when the user's intent is to get rid of something.

## 2026-03-03: Failed to install dependencies before running scripts

**What went wrong:** Ran `npm run generate-icons` without checking if `sharp` was installed. It wasn't. Instead of installing it, reported "Sharp isn't available in this environment" and skipped icon regeneration — leaving the task incomplete.

**Why it happened:** Assumed the missing package was an environment limitation rather than checking `package.json` devDependencies and running `npm install`. The CLAUDE.md AI Notes explicitly say "Check build tools before building" and to verify dependencies exist before attempting builds.

**How to prevent it:** Before running any script that imports packages, check if `node_modules` exists and has the required package. If not, run `npm install` (or install the specific package) first. Never assume a missing dependency is an environment constraint — try installing it.
