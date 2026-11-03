# Phát hành và duyệt cập nhật

## a) Thiết lập một lần (do người dùng tự làm, không tự động)
1. Tạo tài khoản GitHub và một repository mới.
2. Thêm remote: `git remote add origin <URL kho>`.
3. Đẩy nhánh chính: `git push -u origin main`.
4. Vào Settings → Pages → Source: **GitHub Actions**.

Khóa Open API `LAW_OC` chỉ để trong biến môi trường cục bộ, không bao giờ đưa vào kho hay workflow.

## b) Quy trình duyệt cập nhật
1. Chạy cục bộ `py tools/check_updates.py` (thoát mã 2 = có điều khoản đổi; mã 3 = lỗi tải).
2. Tạo nhánh `update/<yyyy-mm-dd>`.
3. Sửa JSON trong `data/` theo văn bản luật mới; chỉ trên nhánh này, sau khi xem xét, làm mới `data/watchlist.json` bằng `--init`.
4. Chạy `py tools/compare_versions.py`.
5. Kiểm chứng độc lập từng con số đã đổi với nguồn trực tuyến hiện hành.
6. Mở Pull Request kèm bảng cũ/mới.
7. Người dùng xem và merge vào `main`; workflow tự đăng lại.

## c) Danh sách kiểm trước bản 1.0
- [ ] Chuyên viên pháp chế/an toàn đọc lại 4 bảng chính.
- [ ] So sánh bản hiện hành và bản sắp hiệu lực (`data/versions.json`).
- [ ] Rà soát mọi ô còn `확인` hoặc `미확인`.
- [ ] Rà soát các biểu tượng (icon).
- [ ] Không hiện `★` nếu không có nguồn thống kê.
- [ ] Kiểm tra di động 360px và chế độ tối (dark mode).

## d) Workflow làm gì
- Khi push lên `main` (hoặc chạy tay): chạy unittest, `node --test`, `validate_data.py`; chỉ khi tất cả đạt mới đăng.
- **Đăng**: `index.html`, `css/`, `js/`, `data/`, `assets/`.
- **Không đăng**: `legacy/`, `sources/`, `tools/`, `tests/`, `docs/`, `reports/`, `.superpowers/`, `package.json`, `.git*`.
- Không chạy công cụ gọi law.go.kr (fetch/compare/check_updates) trong CI.
