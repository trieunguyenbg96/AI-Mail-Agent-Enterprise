# AI Mail Agent Enterprise — Community Edition

**Trợ lý Gmail sử dụng Google Gemini AI và Telegram, vận hành trên Google Apps Script — không cần tự thuê máy chủ.**

[English](README.en.md) · [Hướng dẫn cài đặt](docs/04-APPS-SCRIPT-SETUP.md) · [Demo lần đầu](docs/07-FIRST-RUN.md) · [Bảo mật](SECURITY.md)

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg) ![Platform](https://img.shields.io/badge/Platform-Google%20Apps%20Script-green) ![Version](https://img.shields.io/badge/Agent-V5.2%20PRO-informational)

> **Community project / AI-assisted development** — Tác giả: **Trieu Nguyen IT** ([@trieunguyenbg96](https://github.com/trieunguyenbg96)). Mã nguồn Agent hiện là **V5.2 PRO**; V8 chỉ là phiên bản đóng gói tài liệu repository, không phải phiên bản Agent.

## Giới thiệu

AI Mail Agent Enterprise là trợ lý email cá nhân chạy trên Google Apps Script. Người dùng tương tác qua Telegram; Agent đọc và tìm kiếm Gmail, sử dụng Gemini để hỗ trợ tóm tắt/phân tích nội dung, và cung cấp menu lọc email theo quy tắc. Mỗi người triển khai **trong tài khoản Google và Telegram của chính mình**; không có dịch vụ bot dùng chung do tác giả vận hành.

### Tính năng của bản mã nguồn hiện tại

- Kết nối **Gmail trực tiếp** để tìm kiếm, liệt kê, đọc chi tiết, đánh dấu email đã đọc và hỗ trợ soạn bản nháp.
- **4 Rule có thể tùy chỉnh**: 🔴 Khẩn cấp & Quan trọng; 📩 Email chưa đọc; 📥 Mới nhất trong hộp thư đến; ⚫ Hòm thư rác.
- **Tra cứu bằng ngôn ngữ tự nhiên** qua Telegram và hỗ trợ tóm tắt/đề xuất xử lý bằng Gemini.
- **Menu tương tác và phân trang** trong Telegram; cấu hình Rule lần đầu bằng nút gợi ý hoặc nhập tay.
- **Standalone** trên Apps Script; không yêu cầu Google Sheets, Docker hoặc server riêng.

> Các chức năng được mô tả theo mã nguồn và ảnh demo. Chưa có bộ kiểm thử tự động hoặc chứng nhận an toàn cho production.

## Demo

| Thiết lập 4 Rule | Menu sau thiết lập |
| --- | --- |
| ![Thiết lập Rule](images/08-rule-onboarding.png) | ![Menu](images/10-rule-saved-main-menu.png) |

| Danh sách Gmail | Chi tiết email demo |
| --- | --- |
| ![Danh sách](images/11-inbox-list.png) | ![Chi tiết email demo với mã giả](images/13-email-detail-demo.png) |

Xem thêm [hướng dẫn sử dụng lần đầu](docs/07-FIRST-RUN.md) và [danh mục hình minh họa](images/README.md). Các mã email và đường dẫn trong ảnh demo chỉ mang tính minh họa; không dùng để truy cập email thật.

## Kiến trúc đơn giản

```text
Telegram người dùng
    │ tin nhắn / callback
    ▼
Telegram Bot API ── HTTP POST ──► Apps Script Web App: doPost(e)
                                      ├── GmailApp (Gmail)
                                      └── Gemini API (AI)
    ▲
    └──────── phản hồi qua Telegram Bot API

Script Properties (của từng người triển khai): API Key, Bot Token, Chat ID, Webhook URL
```

`setupBot()` đăng ký Webhook. `doPost(e)` tiếp nhận request từ Telegram; **không** chạy trực tiếp `doPost()` trong Apps Script Editor.

## Quick Start — 6 bước

1. Tải mã nguồn hoặc clone repository:
   ```bash
   git clone https://github.com/trieunguyenbg96/AI-Mail-Agent-Enterprise.git
   ```
   (Liên kết clone sẽ sử dụng được khi tác giả đã tạo repository theo tên này.)
2. Tạo dự án tại [Google Apps Script](https://script.google.com/home), dán `src/AI_Mail_Agent_Enterprise.gs`. Bật hiển thị manifest và dùng `src/appsscript.json` tương ứng. [Hướng dẫn](docs/04-APPS-SCRIPT-SETUP.md).
3. Tạo [Gemini API Key](docs/01-GEMINI-API-KEY.md), [Telegram Bot Token](docs/02-TELEGRAM-BOT.md), [Telegram Chat ID](docs/03-TELEGRAM-CHAT-ID.md).
4. Vào **Project Settings → Script Properties**, nhập các thuộc tính (không ghi khóa thật vào `.gs`, GitHub hoặc ảnh):

   | Tên thuộc tính | Giá trị |
   | --- | --- |
   | `GEMINI_API_KEY` | API Key của chính người dùng |
   | `TELEGRAM_BOT_TOKEN` | Token do BotFather cấp |
   | `TELEGRAM_CHAT_ID` | Chat ID nhận tương tác |
   | `TELEGRAM_WEBHOOK_URL` | URL Web App `/exec` — bổ sung **sau deploy** |

5. **Deploy → New deployment → Web app**, lấy URL `/exec`, lưu vào `TELEGRAM_WEBHOOK_URL`. Đọc kỹ quyền OAuth và cấu hình công khai trong [hướng dẫn triển khai](docs/05-DEPLOYMENT.md).
6. Trong Apps Script Editor, chạy **`setupBot()`** một lần, xem log `Webhook was set` và mở Telegram để thử `/start`, `/menu` bằng **tài khoản demo**. [Hướng dẫn khởi động](docs/07-FIRST-RUN.md).

## Hướng dẫn chi tiết

| Tài liệu | Nội dung |
| --- | --- |
| [01 — Gemini API Key](docs/01-GEMINI-API-KEY.md) | Lấy khóa Gemini |
| [02 — Telegram Bot](docs/02-TELEGRAM-BOT.md) | Tạo bot và token |
| [03 — Chat ID](docs/03-TELEGRAM-CHAT-ID.md) | Xác định Chat ID |
| [04 — Apps Script Setup](docs/04-APPS-SCRIPT-SETUP.md) | Cấu hình Script Properties |
| [05 — Deployment](docs/05-DEPLOYMENT.md) | Deploy Web App, chạy setupBot |
| [07 — First Run](docs/07-FIRST-RUN.md) | Thiết lập Rule, menu, tra cứu và xem email |
| [06 — Code Audit](docs/06-CODE-AUDIT.md) | Ghi chú rà soát lịch sử, cần đọc với phiên bản nguồn tương ứng |

## Bảo mật và giới hạn

**Đọc trước khi cấp quyền truy cập Gmail.** Bản Community cố ý ưu tiên đơn giản, không có gateway xác thực Telegram Webhook. Web App sử dụng `USER_DEPLOYING` và `ANYONE_ANONYMOUS`: request truy cập công khai có thể kích hoạt mã chạy bằng quyền của người deploy. Kiểm tra Chat ID **không** đủ để chứng minh request được gửi từ Telegram; kẻ biết URL và Chat ID có thể gửi request giả. Không xem đây là hệ thống production có bảo mật doanh nghiệp.

- Chỉ thử ban đầu bằng **tài khoản Google/Gmail thử nghiệm**, không chứa dữ liệu nhạy cảm.
- Tự tạo và lưu khóa qua **Script Properties**; không public token, key, URL webhook đầy đủ hoặc dữ liệu Gmail.
- Không chia sẻ một deployment chạy bằng quyền Gmail của mình cho nhiều người dùng.
- Rà soát OAuth scopes, hạn mức Apps Script/Gemini và [SECURITY.md](SECURITY.md) trước khi dùng lâu dài.
- Cộng đồng có thể phát triển thêm lớp gateway kiểm tra Telegram secret header hoặc giải pháp tương đương; tính năng này **chưa được bao gồm**.

## Cấu trúc repository

```text
AI-Mail-Agent-Enterprise/
├── src/
│   ├── AI_Mail_Agent_Enterprise.gs
│   └── appsscript.json
├── docs/
├── images/
├── README.md
├── README.en.md
├── LICENSE
├── SECURITY.md
├── CONTRIBUTING.md
├── CHANGELOG.md
└── .gitignore
```

## Đóng góp và tác giả

Hoan nghênh issue, pull request, chỉnh sửa Rule và bổ sung các cơ chế bảo mật. Xem [CONTRIBUTING.md](CONTRIBUTING.md). Tác giả: **Trieu Nguyen IT** — [GitHub: trieunguyenbg96](https://github.com/trieunguyenbg96). **AI-assisted development**.

## License

Phát hành theo [MIT License](LICENSE). © 2026 Trieu Nguyen IT.
