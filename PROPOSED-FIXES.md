# Coding Super Hub — Proposed Fixes

This file is an audit plan only. It does **not** modify `index.html`.

## Release blockers / high priority

1. **Test 1 CSS sample**
   - Current sample contains `<h1 {` instead of `h1 {`.
   - Impact: the default CSS sample is invalid and can make the first editor test look broken.
   - Risk: low.
   - Proposed change: fix only the sample text.

2. **AI API key architecture**
   - The current AI UI stores the Gemini key in browser `localStorage` and sends it directly from the browser.
   - Impact: acceptable for a personal prototype, not appropriate for a production-grade public app.
   - Risk: medium/high if changed incorrectly.
   - Proposed later change: move Gemini requests to a Vercel server endpoint and store `GEMINI_API_KEY` only in Vercel environment variables. Do not implement in the current protected baseline without review.

## Security / quality improvements

3. **Password generator randomness**
   - Current password generation uses `Math.random()`.
   - Proposed change: use `crypto.getRandomValues()` for security-sensitive random selection.
   - Risk: low/medium.

4. **UUID fallback**
   - UUID generation already prefers `crypto.randomUUID()`, but its fallback uses `Math.random()`.
   - Proposed change: use a cryptographically secure fallback based on `crypto.getRandomValues()` or require `crypto.randomUUID()` where supported.
   - Risk: low/medium.

5. **Code editor iframe isolation**
   - `runCode()` writes user HTML into an iframe using `srcdoc` without an observed sandbox attribute.
   - Proposed change: evaluate whether `sandbox="allow-scripts"` can be added without breaking intended editor behavior, then test thoroughly.
   - Risk: medium because editor behavior could change.

6. **Network-dependent tools**
   - The app contains network calls, including Gemini and an IP lookup service.
   - Each network-dependent tool should be labeled/fail gracefully when the service is unavailable.
   - Risk: low if handled tool-by-tool.

## Structural improvements (later)

7. **Single-file architecture**
   - Keep the current `index.html` intact while stabilizing it.
   - Later, split CSS/JS/tools into modules only after a full backup and regression test suite exist.

8. **Automated release gate**
   - Use the controller audit page to verify Tests 1–150, duplicate IDs, suspicious constructs, and other smoke checks before any future `index.html` overwrite.

## Approval rule

No proposed `index.html` change should be merged to `main` automatically. The safe workflow is:

**backup → proposed fix branch → audit/test → user review/approval → merge/overwrite → Vercel deployment check.**
