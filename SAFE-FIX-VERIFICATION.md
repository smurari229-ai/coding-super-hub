# Coding Super Hub — Safe Fix Verification

Base commit: `af18d29b85d0f6c7bfd07fb62429c2226f5f227c`
Branch: `safe-fix-2026-09-10`

## Safety gate
- Main branch is not modified by this work.
- Existing `index.html` is preserved unchanged on this branch until a complete, verified replacement is available.
- Existing backup remains separate.

## Confirmed findings
1. Test 1 CSS starter has a malformed selector: `<h1 {` should be `h1 {`.
2. Password generator uses `Math.random()` and should use Web Crypto randomness.
3. Browser-side Gemini API key storage/calls should be moved behind a server-side endpoint before production use.
4. Test 1 live-output iframe should be reviewed for sandbox hardening.
5. Test 120 password-to-key derivation should use a password KDF such as PBKDF2 with salt/iterations.
6. Test 126 should not claim to create a public short URL unless a backend shortening service exists.
7. Tests 1–150 must remain intact during all fixes.

## Verification policy
A fix is not promoted to main unless:
- the full current `index.html` is available for exact preservation;
- the changed source is syntax-checked;
- Tests 1–150 markers remain complete and unique;
- DOM IDs and global tool functions remain collision-free;
- the affected tool is behavior-tested;
- the full page is browser-tested for runtime errors;
- the diff is reviewed before merge.

## Current status
The safe-fix branch exists and is intentionally conservative. No risky full-file replacement has been performed from truncated source data.
