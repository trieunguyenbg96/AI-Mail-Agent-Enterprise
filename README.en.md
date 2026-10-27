# AI Mail Agent Enterprise — Community Edition

**A Gmail assistant powered by Google Gemini and Telegram, running on Google Apps Script without a self-hosted server.**

[Tiếng Việt](README.md) · [Setup guide](docs/04-APPS-SCRIPT-SETUP.md) · [First-run walkthrough](docs/07-FIRST-RUN.md) · [Security](SECURITY.md)

![MIT](https://img.shields.io/badge/License-MIT-blue.svg) ![Apps Script](https://img.shields.io/badge/Platform-Google%20Apps%20Script-green) ![Version](https://img.shields.io/badge/Agent-V5.2%20PRO-informational)

**Author:** Trieu Nguyen IT ([@trieunguyenbg96](https://github.com/trieunguyenbg96)) · **Development:** AI-assisted development · **Agent source version:** V5.2 PRO.

## What it does

- Direct Gmail search, email lists, detail view, marking email as read, and draft assistance.
- Four editable rules: critical/important, unread, recent inbox messages, and spam.
- Natural-language Telegram interaction assisted by Gemini for email summaries and suggested actions.
- Telegram inline menus, paging, and a guided first-run rule setup.
- Standalone Google Apps Script project; no Google Sheets, Docker, or dedicated server required.

Features reflect the supplied source and demo screenshots; end-to-end production security and automated tests have **not** been certified.

## Screenshots

| Rule onboarding | Main menu |
| --- | --- |
| ![Rule onboarding](images/08-rule-onboarding.png) | ![Main menu](images/10-rule-saved-main-menu.png) |

| Inbox results | Demo email details |
| --- | --- |
| ![Inbox](images/11-inbox-list.png) | ![Demo details](images/13-email-detail-demo.png) |

More images and Vietnamese walkthrough: [First Run](docs/07-FIRST-RUN.md). Demo IDs/links in screenshots are placeholders, not real email links.

## How it works

```text
Telegram user -> Telegram Bot API -> HTTP POST -> Apps Script doPost(e)
                                                  |-> GmailApp
                                                  |-> Gemini API
                              Telegram Bot API <-|

Each installer stores their own configuration in Apps Script Script Properties.
```

## Quick start

1. Download the source or clone `https://github.com/trieunguyenbg96/AI-Mail-Agent-Enterprise.git` **after the repo has been created under this name**.
2. Create a new [Google Apps Script](https://script.google.com/home) project; paste `src/AI_Mail_Agent_Enterprise.gs` and configure the `src/appsscript.json` manifest. See [Apps Script Setup](docs/04-APPS-SCRIPT-SETUP.md).
3. Obtain your own [Gemini API key](docs/01-GEMINI-API-KEY.md), [Telegram bot token](docs/02-TELEGRAM-BOT.md), and [Telegram Chat ID](docs/03-TELEGRAM-CHAT-ID.md).
4. Open **Project Settings → Script Properties** and enter:

   | Key | Value |
   | --- | --- |
   | `GEMINI_API_KEY` | Your own Gemini API key |
   | `TELEGRAM_BOT_TOKEN` | Your BotFather token |
   | `TELEGRAM_CHAT_ID` | Your Telegram chat ID |
   | `TELEGRAM_WEBHOOK_URL` | Your `/exec` URL, after deployment |

5. Deploy as a Google Apps Script **Web app** and save its `/exec` URL under `TELEGRAM_WEBHOOK_URL`. Review Google authorization prompts. See [Deployment](docs/05-DEPLOYMENT.md).
6. Select and run **`setupBot()`** in the Apps Script editor (not `doPost(e)`). Verify the `Webhook was set` response; then send `/start` or `/menu` to your bot using a **test Gmail account**. See [First Run](docs/07-FIRST-RUN.md).

## Documentation

- [01 — Gemini API key](docs/01-GEMINI-API-KEY.md)
- [02 — Telegram Bot](docs/02-TELEGRAM-BOT.md)
- [03 — Telegram Chat ID](docs/03-TELEGRAM-CHAT-ID.md)
- [04 — Apps Script Setup](docs/04-APPS-SCRIPT-SETUP.md)
- [05 — Deployment](docs/05-DEPLOYMENT.md)
- [07 — First Run](docs/07-FIRST-RUN.md)
- [06 — Historical Code Audit](docs/06-CODE-AUDIT.md)

## 🔐 Security & Usage Notes

AI Mail Agent Enterprise — Community Edition is designed to be **simple, accessible, and easy to customize**, allowing anyone to explore AI-powered email automation using Google Apps Script without setting up a dedicated server.

For a smooth experience while keeping personal information protected, please consider the following:

- **Private Configuration:** Gemini API Keys, Telegram Bot Tokens, and Chat IDs are stored in Google Apps Script Properties rather than being hardcoded into the source code.
- **Gmail Permissions:** The Agent operates with the permissions granted to the Google account that deploys it. Users are encouraged to review the requested permissions before authorizing access.
- **Telegram Webhook:** The Community Edition uses Google Apps Script's direct Webhook integration to simplify deployment. Chat ID validation is included, while advanced Webhook source authentication is not implemented in this version.
- **Getting Started:** We recommend trying the Agent with a test Gmail account before integrating it into your daily workflow.
- **Customization & Extensions:** Users are welcome to enhance security, implement additional authentication mechanisms, or develop new features based on their needs.

This project is distributed under the **MIT License**, encouraging learning, experimentation, collaboration, and community-driven development.

📖 For additional technical details, please refer to [SECURITY.md](SECURITY.md).
## Repository layout

```text
src/                 Agent Apps Script source and manifest
docs/                Setup, deployment and first-run guides
images/              Tutorial screenshots
README.md            Vietnamese main readme
README.en.md         English readme
LICENSE              MIT License
SECURITY.md          Risks and security guidance
CONTRIBUTING.md      Contributions
CHANGELOG.md         Release notes
```

## License and credits

MIT License — [LICENSE](LICENSE). © 2026 **Trieu Nguyen IT**, [@trieunguyenbg96](https://github.com/trieunguyenbg96). **AI-assisted development**.
