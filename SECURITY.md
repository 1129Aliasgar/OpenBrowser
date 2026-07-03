# Security Policy

## Supported versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a vulnerability

If you discover a security vulnerability in OpenBrowser, please report it responsibly.

**Do not** open a public GitHub issue for security bugs.

Instead, email the maintainer with:

- A description of the vulnerability
- Steps to reproduce
- Potential impact (e.g. local file access, token exposure, remote code execution)
- Your environment (OS, Node version, browser)

**Contact:** Open a [GitHub Security Advisory](https://github.com/1129Aliasgar/OpenBrowser/security/advisories/new) (preferred) or email the repository owner via their GitHub profile.

You should receive a response within **7 days**. We will work with you to understand and address the issue before any public disclosure.

## Scope

OpenBrowser is a **local-first** tool. The bridge server binds to `127.0.0.1` by default and is intended for development on your own machine.

In scope for security reports:

- Unauthorized file system access outside the project root
- Bridge API bypass when `BRIDGE_TOKEN` is configured
- Extension privilege escalation or cross-site data leakage
- Path traversal in agent operations
- Sensitive data written to logs or history files unintentionally

Out of scope (by design):

- Prompt injection against third-party AI services (ChatGPT, Gemini, etc.)
- Abuse of browser AI terms of service
- Issues that require physical access to an unlocked machine with OpenBrowser already running

## Recommended practices for users

- Run the bridge server only on `localhost`.
- Set a strong random `BRIDGE_TOKEN` in `.env` if the port may be reachable from other machines on your network.
- Never commit `.env` or share your `BRIDGE_TOKEN`.
- Review agent-mode diffs before applying (`y` confirmation).
- Keep the Chrome extension updated from a trusted source (this repository).

## Disclosure policy

We aim to:

1. Confirm the report and assign severity.
2. Develop and test a fix.
3. Release a patched version or document mitigations.
4. Credit reporters in the release notes (unless you prefer to remain anonymous).

Thank you for helping keep OpenBrowser and its users safe.
