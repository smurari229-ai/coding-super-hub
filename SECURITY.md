# Security Policy

## Supported versions

| Version | Supported |
| --- | --- |
| 0.1.x | Yes |
| Older versions | Best effort only |

Security fixes are developed against the current supported branch. Users should upgrade to the latest released patch in a supported minor line.

## Reporting a vulnerability

Do not open a public issue for a suspected security vulnerability.

Private email: `__SECURITY_EMAIL__`
GitHub Security Advisory: https://github.com/smurari229-ai/coding-super-hub/security/advisories/new

If the private email placeholder has not been configured, use the private GitHub Security Advisory channel. Include a clear description, affected version or commit, reproduction steps, impact, and any safe proof of concept. Remove credentials, payment data, personal data, and other secrets from the report.

## Response timeline

- Acknowledgement target: within 48 hours.
- Initial triage and severity assessment: as soon as practical after acknowledgement.
- Fix target: within 7 days for confirmed high-impact vulnerabilities when technically and operationally feasible.
- Coordinated disclosure timing is agreed with the reporter when additional time is required.

## Scope

Security reports are especially relevant to:

- Client-side XSS, injection, unsafe HTML rendering, or content escaping failures.
- CodePlayground sandbox escape, unsafe iframe configuration, or message-channel isolation failures.
- Authentication or authorization bypasses.
- AI endpoint identity, quota, or entitlement bypasses.
- Billing entitlement manipulation, webhook signature bypass, replay, or idempotency failures.
- Dependency vulnerabilities that materially affect application security.
- Security-header, CSP, CORS, secret-exposure, or server-side request handling defects.

## Out of scope

- General feature requests or product feedback.
- Cosmetic UI issues without a security impact.
- Denial-of-service claims against third-party providers or infrastructure outside this repository's control.
- Social engineering or phishing unrelated to a defect in this project.
- Vulnerabilities that require the reporter to already control the maintainer's credentials.
- Automated scanner output without a reproducible security impact.

## Security boundaries

Client localStorage is not an authorization source. Paid entitlement, authentication, AI access, and quota enforcement must remain server-authoritative. Never commit API keys, webhook secrets, payment credentials, or private environment values.

## Disclosure

Please allow maintainers reasonable time to investigate and release a fix before public disclosure. We will credit reporters when they request credit and it is safe to do so.
