# Technical Notes — AI Mail Agent Enterprise V5.2

## 1. Giới thiệu

Tài liệu này tổng hợp một số ghi chú kỹ thuật, thay đổi và định hướng phát triển của **AI Mail Agent Enterprise — Community Edition**.

Dự án được phát triển trên nền tảng Google Apps Script, tích hợp Gmail, Google Gemini AI và Telegram Bot.

Mục tiêu của phiên bản Community là mang đến giải pháp AI Mail Agent dễ tiếp cận, dễ triển khai và có thể tùy chỉnh theo nhu cầu cá nhân.

## 2. Những cải tiến trong phiên bản V5.2

### Cấu hình ứng dụng

- Loại bỏ giao diện Web dùng để nhập API Key và Telegram Bot Token.
- Sử dụng Google Apps Script Properties để quản lý thông tin cấu hình.
- Mỗi người dùng tự thiết lập API Key, Bot Token, Chat ID và Webhook URL trong tài khoản Google của mình.
- Không lưu trực tiếp thông tin xác thực trong mã nguồn.

### Telegram Bot

- Tích hợp Telegram Webhook thông qua `doPost(e)`.
- Sử dụng `setupBot()` để đăng ký và kích hoạt Webhook.
- Kiểm tra Chat ID nhằm giới hạn tài khoản Telegram được phép tương tác.
- Hỗ trợ menu tương tác, tìm kiếm và thiết lập 4 Rule Email.

### Gmail và Gemini AI

- Tra cứu email trực tiếp từ Gmail.
- Tìm kiếm email bằng ngôn ngữ tự nhiên.
- Tóm tắt nội dung và đề xuất hướng xử lý bằng Gemini AI.
- Hỗ trợ xem chi tiết email, đánh dấu đã đọc và tạo bản nháp trả lời.

## 3. Một số lưu ý kỹ thuật

**Google Apps Script Permissions**

Agent sử dụng các quyền Google được người triển khai cấp. Người dùng nên xem xét quyền truy cập trước khi kích hoạt ứng dụng.

**Telegram Webhook**

Phiên bản Community sử dụng Webhook trực tiếp của Google Apps Script để tối giản quá trình thiết lập.

Việc kiểm tra Chat ID giúp giới hạn người dùng hợp lệ, nhưng không thay thế cho cơ chế xác thực nguồn HTTP request.

Các giải pháp xác thực nâng cao có thể được bổ sung tùy theo nhu cầu triển khai.

**Script Properties**

Các thông tin như API Key và Bot Token được lưu trong Script Properties. Người dùng nên hạn chế chia sẻ quyền chỉnh sửa dự án Apps Script và tránh đưa các giá trị cấu hình cá nhân lên GitHub.

## 4. Khả năng mở rộng

Dự án khuyến khích cộng đồng nghiên cứu và phát triển thêm các tính năng như:

- Xác thực Telegram Webhook nâng cao.
- Hỗ trợ nhiều tài khoản Gmail.
- Tích hợp Microsoft Outlook.
- Tự động phân loại và thông báo email theo lịch.
- Bổ sung hệ thống logging, monitoring và xử lý lỗi.
- Tối ưu hiệu năng và hạn mức Google Apps Script.

## 5. Kiểm thử và đóng góp

Các chức năng chính đã được minh họa thông qua quá trình thử nghiệm với Google Apps Script, Gmail và Telegram.

Tuy nhiên, khả năng hoạt động có thể khác nhau tùy theo cấu hình tài khoản, quyền truy cập API và hạn mức dịch vụ.

Nếu phát hiện lỗi hoặc có ý tưởng cải tiến, cộng đồng có thể tạo GitHub Issue hoặc Pull Request để cùng phát triển dự án.

---

**Maintainer:** Trieu Nguyen IT  
**Version:** V5.2 Community Edition  
**License:** MIT  
**Development:** AI-assisted development
