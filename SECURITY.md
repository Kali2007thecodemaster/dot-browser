# Security Policy

## Reporting a Vulnerability

Please **do not** disclose security vulnerabilities publicly through issues or pull requests.

Instead, open a [GitHub Security Advisory](https://github.com/Kali2007thecodemaster/dot-browser/security/advisories/new) so the issue can be addressed before public disclosure.

## Scope

- All user data (API keys, profile data, chat history) is stored exclusively in Chrome local storage — nothing is sent to any server other than your configured LLM providers.
- The extension uses `host_permissions: <all_urls>` for browser automation; it does not silently read or exfiltrate page content.
- Financial guardrails are implemented at the prompt level — the agent is instructed to call `human_interrupt` before any purchase or payment action.
