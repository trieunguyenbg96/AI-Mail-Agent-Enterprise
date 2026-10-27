# Rà soát mã nguồn V5.0 — yêu cầu sửa trước khi public release

## Tình trạng

Đây là bản mã nguồn gốc được đóng gói phục vụ đối chiếu, **không phải phiên bản đã xử lý an toàn**. Chưa kiểm thử trực tiếp với Gmail, Gemini, Telegram hoặc Apps Script runtime.

## Mức NGHIÊM TRỌNG

1. Ở phiên bản gốc, `doGet()` tạo trang HTML bằng cách nhúng trực tiếp các giá trị `GEMINI_API_KEY` và `TELEGRAM_BOT_TOKEN` lấy từ Script Properties vào thuộc tính `value` của form. Trên deployment `ANYONE_ANONYMOUS`, người có URL có thể xem nguồn trang và đọc secrets, dù trường là `type=password`. Cần loại bỏ mọi hành vi đưa secrets đã lưu từ server ra trình duyệt, và tránh nhúng giá trị không escape vào HTML.
2. Ở phiên bản gốc, `saveWebConfig(formData)` là hàm phía server có thể gọi qua `google.script.run` từ trang HTML Apps Script. Vì trang đang cho phép anonymous và chạy quyền `USER_DEPLOYING`, người ngoài có khả năng ghi đè Script Properties và chạy `setupBot()`; không bảo vệ bằng Chat ID Telegram. Cần tách setup khỏi public web endpoint, chỉ cho quản trị viên có danh tính xác thực cấu hình, hoặc cấu hình riêng trong Apps Script editor. Không đưa web setup hiện tại lên deployment công khai.
3. `doPost(e)` chấp nhận JSON chỉ dựa trên Chat ID trong payload, thiếu bằng chứng cập nhật do Telegram gửi. Người biết Chat ID và URL có thể gửi payload giả. Apps Script `doPost(e)` không cung cấp headers tùy ý để dựa thẳng vào cơ chế `X-Telegram-Bot-Api-Secret-Token`; cân nhắc gateway hỗ trợ xác minh header/signature và forward sự kiện hợp lệ, hoặc thiết kế thay thế chặt chẽ hơn. Chú ý không công khai endpoint hiện tại.

## Lỗi chức năng

4. Trong `doPost`, đầu nhánh `if (update.callback_query)` dùng biến `data` trước khai báo `const data` bên dưới. Việc truy cập trong temporal dead zone gây `ReferenceError` và chặn xử lý callback. Ngoài ra một số nhánh rule xử lý trước/đúp với các nhánh chính; cần hợp nhất router và kiểm thử callback.
5. Chuỗi comment `// ... (Các nhánh ... giữ nguyên) ...` là ghi chú, không phải triển khai; cần so khớp tất cả nút keyboard và xử lý callback thực tế trước khi hứa chức năng.

## Khuyến nghị trước khi phát hành

- Giữ secret trong Script Properties nhưng không phản chiếu ra HTML. Tránh HTML setup công khai; cân nhắc xóa hẳn `doGet` setup, cấu hình qua editor.
- Rà soát authorization cho tất cả thao tác Gmail (đọc, mark read, tạo draft), callback, lệnh Telegram và hạn mức.
- Đổi Gemini key và bot token nếu URL cấu hình Web App từng được chia sẻ/để truy cập công khai.
- Kiểm thử webhook, callback, Gmail, thao tác cảnh báo theo tài khoản thử nghiệm; xem logs tránh lộ nội dung email.
- Chọn `LICENSE` hợp lệ trước khi gọi là open-source.

## Kết quả thay đổi (bản no-web-config)

- Đã xóa hoàn toàn `doGet()` dựng trang cấu hình và `saveWebConfig(formData)` (bao gồm lời gọi HTML tới hàm này).
- Không sửa logic `doPost`, xử lý Gmail, Gemini, Telegram hay `setupBot`.
- **Vẫn còn vấn đề:** `doPost` chỉ kiểm tra `TELEGRAM_CHAT_ID` trong JSON request, không đủ để xác thực nguồn Telegram. Cần kiểm soát webhook trước khi công khai dùng thật.
