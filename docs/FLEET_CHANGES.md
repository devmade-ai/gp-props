# Running a Fleet-Wide Convention Change

Read this before writing any script that edits more than one repo.
`CLAUDE.md` points here; this file is the procedure.

The payload is now a whole file. [`docs/FLEET_CLAUDE.md`](FLEET_CLAUDE.md) is
the canonical text, and every repo's `CLAUDE.md` is that file plus its own local
sections. Propagation is a replace, not an edit — which removes the entire class
of anchor-drift failure the previous procedure was built to survive. What
remains is preserving each repo's local half and proving the canonical half
matches byte for byte.

Proven over 18 repos on 2026-08-10 in its splice-based form; the failures it is
shaped around are in [`AI_MISTAKES.md`](AI_MISTAKES.md) (2026-08-10 and
2026-08-15).

1. **The payload is `docs/FLEET_CLAUDE.md`, read whole.** Never retype it into
   the script, never assemble it from fragments. Read the file, throw if it is
   missing or shorter than the last known length. A later edit there propagates
   without touching the script.

2. **Read every repo's version BEFORE overwriting it,** looking for rules
   sharper than canonical — "Alignment levels up, never down" in practice, and
   the step that gets skipped. On the 2026-08-10 pass six repos had rules better
   than the fleet's. **This matters more now than it did then:** a splice
   destroyed one section, a whole-file replace destroys everything above the
   marker. Anything better must be upstreamed into `FLEET_CLAUDE.md` and the
   pass re-run — never overwritten and re-added afterwards.

3. **Local sections survive by structure, not by parsing.** Each repo's
   `CLAUDE.md` is the canonical text, then a single literal marker line, then
   that repo's own sections:

   ```
   <!-- LOCAL: everything below is this repo's own. Fleet syncs never touch it. -->
   ```

   Everything above the marker is replaced wholesale; everything below is left
   untouched. A repo without the marker does not get one from the loop — it is
   restructured by hand first (see 5), because deciding which of its sections
   are local is a judgement, not a match.

4. **Prove idempotence by running twice and asserting a byte-level no-op.** This
   is now trivial: after a run, each repo's text above the marker must equal
   `FLEET_CLAUDE.md` exactly. If it does, a second run cannot change anything.
   Measure it; do not reason about it.

5. **Hand-fix the structural outliers rather than forcing them into the shape.**
   `repo-tor` leads with its product title and keeps docs as a table; `see-veo`
   had a five-bullet `## Communication Style` stub. Both needed bespoke edits,
   and flattening them would have been worse than the drift. The same applies to
   installing the marker the first time — and there, **classify each section
   by who owns it, not where it sits.** A repo-specific section that happens to
   sit above where the marker goes (because it predates the marker) is local:
   move it below the marker whole, headings included. Never "rescue" it line
   by line into a leftovers block — a rescue that keeps a section's body and
   drops its headings keeps every word and loses what the section was for. On
   2026-08-19 sun-sea-o's `## Adopted Patterns` (its per-pattern status record)
   went through that rescue: 214 lines kept, all fourteen `### PATTERN —
   status` headings dropped, and for seven weeks nothing said which pattern was
   implemented (sun-sea-o `docs/AI_MISTAKES.md`, 2026-10-05).

6. **Deletions never go in the loop** — see the 2026-08-10 mistakes entry. A
   whole-file replace already deletes; anything beyond that (emptying a doc,
   removing a file) is a per-repo judgement made per repo.

7. **Never patch the script's source with `sed` / `node -e` one-liners.** Their
   quoting layers double every backslash, and a `\|` that becomes `\\|` turns
   into regex ALTERNATION whose `.*$` branch matches line 1 of every file. That
   destroyed the H1 in 14 repos. Edit the script as a file. When you find one
   corrupted pattern, sweep for the whole class rather than fixing the one you
   tripped over.

8. **Verify by comparing, not by counting.** The check is now exact: for every
   repo, the text above the marker must be byte-identical to `FLEET_CLAUDE.md`,
   and the text below must be unchanged from before the run. That subsumes the
   old grep-count pass, which could only see the change and never the collateral
   damage. Still do the three things counting could not: assert a **structural
   invariant unrelated to the edit** (line 1 is still a heading), **read every
   deleted line** below the marker (`git diff | grep '^-[^-]'`), and render at
   least one whole file end to end before pushing any of them.

9. Then commit and push per repo.
