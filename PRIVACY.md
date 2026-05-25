# Privacy Policy for Dot

## What Dot Does with Your Data

Dot is a Chrome extension that runs entirely inside your browser. It does not have a backend server and does not collect or transmit your data to any service other than the LLM providers you explicitly configure.

## Data Storage

All data — including your API keys, profile information, chat history, extracted results, and watch configurations — is stored in Chrome's local extension storage (`chrome.storage.local`). It never leaves your device except when sent to your chosen LLM provider as part of a task prompt.

## LLM Providers

When you run a task, the task description and relevant context (page content, profile fields, uploaded files) are sent to the LLM provider you have configured (e.g., Anthropic, OpenAI, Gemini). Refer to each provider's privacy policy for how they handle that data.

## Permissions

Dot requests the following Chrome permissions:

| Permission | Reason |
|------------|--------|
| `storage` | Persist settings, history, and results locally |
| `tabs`, `activeTab` | Read the current tab URL and title for task context |
| `scripting` | Inject DOM-interaction scripts for browser automation |
| `debugger` | CDP-based control of browser pages during tasks |
| `alarms` | Run web watches and scheduled tasks on a timer |
| `notifications` | Alert you when a watched page changes |
| `contextMenus` | "Ask Dot about this" right-click menu item |
| `<all_urls>` | Navigate to and interact with any website during a task |

## Open Source

Dot's full source code is available at [github.com/Kali2007thecodemaster/dot-browser](https://github.com/Kali2007thecodemaster/dot-browser) under the Apache 2.0 license.
