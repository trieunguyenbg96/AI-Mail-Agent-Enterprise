# Security / Bảo mật

> **Community Edition:** ưu tiên thiết lập đơn giản trên Google Apps Script. Không có gateway xác thực nguồn Telegram. Đây là hạn chế đã biết, không được xem là phù hợp mặc định cho Gmail chứa dữ liệu nhạy cảm.

# Security Policy

## Trước khi công khai

- [ ] Review toàn bộ `.gs`, manifest, HTML và assets; xóa secrets, email thật, Chat ID thật, deployment URL/ID, ID tài nguyên nội bộ.
- [ ] Review `doPost(e)` và xác thực nguồn webhook; `isAllowedChat()` một mình không đảm bảo payload đến từ Telegram.
- [ ] Xem kỹ `Execute as me`, quyền Gmail và phạm vi người dùng.
- [ ] Rà soát quyền OAuth Gmail ở mức tối thiểu, không tự thêm scope rộng.
- [ ] Kiểm tra lịch sử Git, không chỉ phiên bản hiện tại.
- [ ] Không gửi dữ liệu email riêng tư vào log hoặc issue GitHub.
- [ ] Nếu credential bị lộ, revoke/rotate ngay; xóa khỏi lịch sử nếu cần.

## Báo cáo lỗ hổng

Chưa có kênh báo cáo riêng. Khi công khai repo, cấu hình GitHub Private vulnerability reporting hoặc thêm địa chỉ liên hệ phù hợp. Không tạo issue công khai chứa secret.

## Vấn đề hiện đã biết

Phiên bản code gốc (trước bản chỉnh sửa này) có màn hình `doGet()` xuất secrets và hàm `saveWebConfig` ghi cấu hình trong Web App được truy cập ẩn danh, đồng thời `doPost` chưa xác minh nguồn Telegram. **Không triển khai nguyên bản ra Internet**. Xem [docs/06-CODE-AUDIT.md](docs/06-CODE-AUDIT.md).

## Bản chỉnh sửa bỏ web config

Đã gỡ `doGet` / `saveWebConfig`, nên đường GET `/exec` không còn phát lộ khóa qua biểu mẫu. Các chức năng webhook POST vẫn cần lớp xác thực thực sự; không mặc định rằng source đã an toàn để chạy production.
