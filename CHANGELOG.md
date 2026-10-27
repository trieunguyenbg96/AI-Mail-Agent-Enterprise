# Changelog

## [Unreleased] — Community README / MIT — 2026-10-27

### Added
- Thay README cũ bằng hướng dẫn Community Edition tiếng Việt, phản ánh Agent V5.2 PRO.
- Thêm `README.en.md`, MIT `LICENSE`, thông tin tác giả Trieu Nguyen IT và ghi nhận AI-assisted development.
- Trình bày ảnh demo, đường dẫn tài liệu, cài đặt Script Properties và Quick Start.

### Notes
- Không thay đổi mã nguồn `.gs`, manifest, hình ảnh hoặc logic webhook trong lần cập nhật này.
- Chưa có xác thực đáng tin cậy nguồn yêu cầu Telegram; bản Community ưu tiên dễ thiết lập và dành cho thử nghiệm.
- Repo GitHub được dẫn dưới dạng URL dự kiến, chưa xác minh đã tồn tại.

---

## Lịch sử biên soạn repository

# Changelog

Theo định dạng gợi ý [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- Khung repository công khai: tài liệu, hướng dẫn cấu hình, checklist bảo mật.

### Pending
- Thêm mã nguồn AI Mail Agent Enterprise V5.0 đã loại bỏ thông tin riêng tư.
- Thêm `appsscript.json` nguyên bản đã rà soát.
- Thêm ảnh hướng dẫn đã che thông tin nhạy cảm.
- Kiểm thử lại toàn bộ tính năng và quy trình triển khai.

> Chưa xác nhận ngày phát hành hay lịch sử thay đổi của bản V5.0. Bổ sung sau khi kiểm tra code và ghi chú phiên bản thật.

## Unreleased — Repository source import
- Nhập toàn bộ mã `.gs` từ nguồn do tác giả cung cấp.
- Thay manifest mẫu bằng manifest thật (`USER_DEPLOYING` / `ANYONE_ANONYMOUS`).
- Thêm báo cáo rà soát bảo mật và callback: chưa sẵn sàng phát hành.
- Không thay đổi logic của `.gs`; chỉ thay Chat ID minh họa trong placeholder giao diện thành dữ liệu giả.

## Unreleased — Remove public web config
- Thay mã `.gs` bằng bản V5.2 PRO từ tác giả.
- Loại bỏ hoàn toàn giao diện `doGet` cấu hình và `saveWebConfig`.
- Chuyển thiết lập API Key, Bot Token, Chat ID, webhook URL sang Script Properties.
- Giữ nguyên `doPost` và `setupBot`, chưa khắc phục xác thực webhook.

### Documentation update — 2026-10-27
- Bổ sung 11 ảnh hướng dẫn thực tế do tác giả cung cấp.
- Hoàn thiện các tài liệu 01–05 về Gemini, Telegram và Google Apps Script.
- Nhấn mạnh cảnh báo xác thực webhook khi triển khai công khai.

### Documentation update — 2026-10-27 (setupBot & Telegram)
- Bổ sung 3 ảnh thực tế: chọn `setupBot`, kết quả đăng ký webhook và màn hình khởi tạo 4 Rule Email.
- Hoàn thiện bước kích hoạt và kiểm tra bot trong `docs/05-DEPLOYMENT.md`.
- Ghi rõ ảnh nhật ký chụp từ mã cũ vẫn còn `saveWebConfig`; mã repo đã loại bỏ trang cấu hình.
- Chưa bổ sung xác thực webhook; không thay đổi mã nguồn trong cập nhật này.

### Documentation update — 2026-10-27 (first-run demo)
- Bổ sung 6 ảnh Telegram: khởi tạo Rule, nhập Rule hàng loạt, menu, danh sách email, tìm kiếm tự nhiên và chi tiết email.
- Tạo `docs/07-FIRST-RUN.md`, hướng dẫn thao tác lần đầu và checklist kiểm thử.
- Thay đồng bộ mã email/đường dẫn trong ảnh chi tiết bằng dữ liệu minh họa; giữ nguyên mã nguồn Agent.
- Xác thực webhook vẫn chưa được khắc phục, repo chưa sẵn sàng production.
