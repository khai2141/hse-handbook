# 건설안전 HSE 핸드북 — Giai đoạn 1: Spec thiết kế (v2)

Ngày: 2026-11-03 · Trạng thái: chờ người dùng duyệt
Thay đổi so với v1: thiết kế thích ứng theo chức vụ và nghiệp vụ, nguồn dữ liệu thực tế, kiểm chứng dữ liệu, phạt tính theo từng người.

## 1. Mục tiêu
Sổ tay cho nhân viên HSE mới tại công trường xây dựng Hàn Quốc, **thích ứng theo người dùng**: mỗi người chỉ thấy luật, nghĩa vụ, mức phạt liên quan tới chức vụ và nghiệp vụ của họ, phần còn lại tìm thêm khi cần.
- Ngôn ngữ giao diện và nội dung: **tiếng Hàn** (giải thích bằng 쉬운 말, trích điều luật nguyên văn).
- Truy cập bằng link (GitHub Pages), máy công ty và điện thoại.
- Có mức phạt theo từng điều luật, đối chiếu mức phạt, ⭐ cho hạng mục bị phạt nhiều nhất (chỉ khi có thống kê), giải thích lỗi hiện trường.
- Kiểm tra cập nhật hằng ngày, người dùng duyệt trước khi đăng.
- Ưu tiên "đúng nguồn" hơn "đẹp". Không đoán số liệu.
- Người dùng đầu tiên: người quản lý an toàn phụ trách giáo dục an toàn (lĩnh vực 교육·보건 là ưu tiên số 1).

## 1b. Kiến trúc thông tin: cây (quyết định 2026-11-03, thay cho bố cục nhiều tab)
- **Thân (trang chủ):** sơ đồ cây "건설안전 HSE 핸드북", kèm dàn ý cây cố định bên trái (thu gọn thành nút "트리 보기" trên điện thoại) và thanh đường dẫn (홈 › 안전보건교육 › 근로자 교육).
- **Cành chính:** 안전보건교육, 건강진단·보건, 직책과 의무, 벌칙·과태료.
- **Cành phụ:** 안전보건교육 → 근로자 교육 (→ 외국인 근로자, 작업별 특별교육), 관리자 교육; 건강진단·보건 → 근로자 건강진단, 작업환경측정.
- **Cuối mỗi cành là một bảng tổng quan** (hàng = đối tượng như loại lao động, chức vụ, chủ thể; cột = loại giáo dục, loại khám, nghiệp vụ, lần vi phạm). Ví dụ: bảng 근로자 교육 có 18 loại lao động × 5 loại giáo dục.
- **Bấm vào một ô chỉ mở chi tiết của đúng ô đó** (ví dụ ô "8시간" của 상용·상시 근로자 × 채용 시 교육): thời gian, tiêu chí áp dụng (nguyên văn), nội dung dạy, ví dụ chia giờ theo mục (ghi rõ là ví dụ vì luật chỉ quy định tổng giờ), ai được dạy, hồ sơ chứng minh, mức phạt mỗi người (có máy tính theo số người), căn cứ, mẹo hiện trường. Nút ⓘ ở cột đầu chỉ mở định nghĩa của hàng.
- Nguyên tắc: không chia tab ngang; điều hướng bằng cây và đường dẫn; mọi ô có trạng thái nguồn (nguyên văn / một phần / chưa xác nhận) bằng màu ô.
- Mẫu tham khảo đã làm: tree.html (https://claude.ai/artifact/DxNnsisuayffmxApsZAqBr).

## 2. Phạm vi Giai đoạn 1
Văn bản luật:
- 산업안전보건법, 시행령, 시행규칙 (gồm các 별표)
- 산업안전보건기준에 관한 규칙
- 중대재해 처벌 등에 관한 법률 (+ 시행령)
- 건설기술 진흥법 + 건설안전 관련 고시

Ngoài phạm vi (Giai đoạn 2/3): 화관법, 소방시설법, 위험물안전관리법, 폐기물관리법 (+ 석면); thống kê phạt thực tế theo quý hoặc năm tự động; bài hiện trường nâng cao.

## 3. Hai trục chọn của người dùng
**Trục 1: 직책 (chức vụ).** Hỏi lúc vào, chọn một hoặc nhiều. Danh sách đã xác nhận bằng nguyên văn luật:
- 안전보건관리책임자 (법 제15조), 관리감독자 (제16조), 안전관리자 (제17조), 보건관리자 (제18조), 안전보건관리담당자 (제19조), 산업보건의 (제22조), 안전보건총괄책임자 (제62조), 안전보건조정자 (제68조)
- Luật xây dựng (건설기술 진흥법 제64조): 안전총괄책임자, 분야별 안전관리책임자, 안전관리담당자
- 경영책임자등 (중대재해처벌법 제2조), 도급인·관계수급인
- Chức vụ tổ chức công ty (không phải chức danh luật): 현장소장 và các chức khác do người dùng bổ sung. Ghi rõ "chức danh nội bộ" và gắn với vai trò pháp lý tương ứng.

**Trục 2: 업무 (nghiệp vụ).** Chọn nhiều. Nhóm:
- 안전보건교육 (채용 시, 정기, 작업내용 변경 시, 특별교육, 기초안전보건교육, 직무교육)
- 건강진단·보건 (일반, 특수, 배치 전, 수시, 임시; 작업환경측정; MSDS)
- 위험성평가·작업계획
- 가시설 (비계, 거푸집·동바리, 흙막이)
- 건설기계·장비 (크레인, 굴착기, 차량계 건설기계, 신호수·유도자)
- 위험 유형 (추락, 끼임, 낙하, 감전, 화재·폭발, 붕괴)
- 도급·협력업체, 산업안전보건관리비
- 사고 대응 (재해 보고, 중대재해, 은폐 금지)
- 안전보건관리체계 (중처법)
Hai nhóm người dùng chưa xác nhận tên (cần người dùng chỉ rõ): nhóm "cho cấp khéo so" và chức "Phú Công Quản Lý Cha".

**Bảng ghép `role_duties`:** mỗi dòng ghi chức vụ nào có nghĩa vụ gì, theo điều luật nào. Lấy từ các điều "업무" của luật (ví dụ 시행령 제15조 cho 관리감독자: 7 việc; 제18조 cho 안전관리자: 10 việc; 제22조 cho 보건관리자: 14 việc; 법 제15조 cho 안전보건관리책임자: 9 việc).

**Bộ tra theo công tác (ví dụ 철근공):** người dùng chọn công tác, sổ tay hỏi "người này làm những việc nào" (chọn từ danh sách 39 việc 특별교육 trong 시행규칙 별표 5) rồi hiện: giáo dục cần học, số giờ, khám sức khỏe, hồ sơ cần giữ, mức phạt nếu thiếu. **Không gán cứng theo nghề**: danh sách 특별교육 không có mục "철근공", việc phải học phụ thuộc vào công việc làm kèm (거푸집, 비계, làm việc cao từ 2m...).

## 4. Nguyên tắc không bỏ sót nghĩa vụ
- Lọc chỉ giảm nhiễu, không được che nghĩa vụ pháp lý. Mỗi trang chủ có mục "Cũng liên quan tới vai trò của bạn" và dòng "Đã ẩn N mục. Xem tất cả".
- Cảnh báo bắt buộc (ví dụ báo cáo tai nạn, mức phạt nặng) luôn hiện.
- Lựa chọn chỉ lưu trên thiết bị (localStorage), không cần tài khoản, không gửi dữ liệu đi. Có nút đổi chức vụ.

## 5. Nội dung ưu tiên: 교육·보건 (dữ liệu đã kiểm chứng từ law.go.kr)
Tất cả dữ liệu dưới đây đã được đọc từ nguyên văn và lưu tại `data-draft/role_duties_verified.md`.
- Giáo dục: 법 제29조 (정기, 채용 시, 작업내용 변경 시, 특별교육), 제31조 (기초안전보건교육), 제32조 (직무교육); giờ học theo 시행규칙 별표 4; nội dung theo 별표 5.
- Công nhân thuê ngày: 채용 시 1 giờ, 특별교육 2 giờ (cẩu tháp tín hiệu 8 giờ), 기초안전보건교육 4 giờ. Người đã học 기초안전보건교육 được miễn 채용 시 교육 (법 제29조②).
- Khám sức khỏe: 법 제129~132조. Đo môi trường: 제125조.
- Quy mô bổ nhiệm công trình xây dựng: 안전보건관리책임자 từ 20 tỷ won; 안전관리자 từ 50 tỷ won (nhà thầu phụ 100 tỷ); 보건관리자 từ 800 tỷ won (đào đắp 1.000 tỷ) hoặc 600 lao động.

## 6. Mức phạt và ⭐
- Hai lớp thông tin: **trần theo luật** (법 제167~175조) và **mức thực tế theo từng lần vi phạm** (시행령 별표 35, đơn vị 만원, lần 1 / lần 2 / lần 3 trở lên).
- Với giáo dục, phạt **tính trên từng người** (ví dụ 특별교육: 50 / 100 / 150 만원 mỗi người). Giao diện có **máy tính phạt**: nhập số người, ra tổng tiền.
- ⭐ chỉ gắn khi có thống kê chính thức (MOEL, 공공데이터포털). Không có thống kê thì hiện `통계 미확보`. Tiêu chí xếp hạng ghi rõ trên trang (chỉ số, kỳ, nguồn).
- Hình sự: 법 제167조 (chết người: tù đến 7 năm hoặc phạt đến 1 tỷ won), 중처법 제6조 (người đứng đầu: tù từ 1 năm hoặc phạt đến 1 tỷ won; pháp nhân đến 5 tỷ won qua 제7조).

## 7. Cấu trúc giao diện
- Mobile-first, sáng/tối, lề tối thiểu 16px, không cuộn ngang. Phông Noto Sans KR.
- Màn hình hỏi 3 bước (chức vụ, nghiệp vụ, công tác tùy chọn) → trang chủ riêng.
- Mỗi chủ đề dùng một mẫu thẻ cố định: Điều luật → Nghĩa vụ → Cách làm → Lỗi hiện trường → Mức phạt → Vụ tai nạn thật → Danh sách kiểm tra.
- Tìm kiếm: ô tìm kiếm, tìm theo 초성, lọc theo lĩnh vực, chọn theo tình huống.
- Mỗi thẻ hiện ngày xác minh và ngày hiệu lực. Có link tới đúng điều luật trên law.go.kr.
- Độ tinh tế thiết kế: áp dụng skill Impeccable, **chỉ sao chép thủ công thư mục `skills/impeccable`** (không hook, không binary, không telemetry), đọc nội dung trước khi dùng. Cần người dùng đồng ý trước khi sao chép.
- Tham khảo cấu trúc từ tài liệu có sẵn: KOSHA 실무길잡이 (theo công tác), MOEL 중처법 해설서 (mỗi nghĩa vụ kèm cách làm), MOEL 자율점검표 (danh sách kiểm tra, cần kiểm tra giấy phép), OSHA Focus Four (ưu tiên theo thống kê tử vong).

## 8. Hình minh họa
- **Bộ icon đã có (quyết định 2026-11-03):** phong cách navy (ô bo góc, người trắng đội mũ, xanh nhạt) từ `E:\Claud Cowork\SafePermit\icon image` (122 tile nguy hiểm, 73 tile công việc, icon tab) cộng **40 icon mới tạo trên Flow** (dự án "HSE 핸드북 아이콘"), lưu tại `E:\agent skill\assets\icons\` (PNG trong suốt, rộng 256px, kèm `index.json`): giáo dục (`edu_*`), sức khỏe và đo môi trường (`health_*`, `measure_*`), chức vụ (`role_*`), tài liệu và phạt (`doc_*`). Hình không có chữ; nhãn tiếng Hàn do sổ tay thêm bằng chữ thật. Ảnh ghép gốc nằm ở `flow-refs/`.
- Nguồn bổ sung: hình vẽ Google Flow (tài khoản người dùng, qua Claude in Chrome), một phong cách, nhân vật cố định 김반장 / 이민수 dùng chung với pipeline `kr-safety-shorts`.
- Mỗi hình bắt buộc qua `ks-visual-reviewer` (đúng kỹ thuật an toàn, nhất quán, không lỗi hình).
- Ảnh công ty chỉ dùng khi người dùng cung cấp và đã che khuôn mặt, biển hiệu. Không dùng ảnh bản quyền không rõ nguồn. Tài liệu KOSHA/MOEL chỉ dùng hình trực tiếp khi giấy phép (공공누리) cho phép, kèm ghi nguồn.
- Hình lưu trong repo, không hotlink.

## 9. Nguồn dữ liệu và cập nhật
**Nguồn chính thức:** law.go.kr (ưu tiên). Có hai đường:
1. **Open API (open.law.go.kr):** đã đăng ký, mã OC lưu trong biến môi trường `LAW_OC` của người dùng. Hiện bị từ chối vì IP chưa xác thực (đã thêm `115.138.62.137` vào đơn, chưa có hiệu lực). API yêu cầu **IP cố định**, nên GitHub Actions (IP thay đổi) không gọi trực tiếp được.
2. **Đọc trang law.go.kr bằng trình duyệt:** điều khoản đọc được qua địa chỉ `lsLinkProc.do?lsClsCd=L&mode=11&lsNm=<tên luật>&joNo=<số điều 6 chữ số>` (ví dụ joNo=002900 là 제29조); phụ lục (별표) hiển thị qua PDF viewer nhúng, chữ đọc được từ iframe nhưng nạp từng trang một. Đường này đã dùng để lấy toàn bộ dữ liệu ban đầu.

**Chạy cập nhật hằng ngày:** vì API cần IP cố định, chọn một trong ba:
- A. Chạy trên máy cá nhân của người dùng (Task Scheduler), đẩy kết quả lên GitHub Pages. Cần máy bật.
- B. Máy chủ nhỏ có IP cố định (VPS). Ổn định nhưng tốn phí.
- C. Bán tự động: chạy hằng tuần hoặc khi có nhắc.
Đề xuất: A khi khởi đầu, chuyển sang B khi sổ tay được dùng thật. Cần người dùng quyết định.

**Quy trình hằng ngày:** so khớp hash điều khoản đang theo dõi → không đổi thì ghi nhật ký; có đổi thì tạo bản nháp (Pull Request) kèm bảng so sánh cũ/mới → agent kiểm chứng độc lập đối chiếu → người dùng duyệt rồi mới đăng.

## 10. Mô hình dữ liệu
Lưu trong `data/*.json`, giao diện chỉ đọc dữ liệu.
- `laws`: tên luật, ngày công bố, 시행일, số luật (ví dụ 법률 제22122호), link.
- `articles`: nguyên văn điều khoản, hash nội dung.
- `roles`: chức vụ, căn cứ, loại (법정 / 건설기술 진흥법 / tổ chức nội bộ).
- `duties`: nghiệp vụ.
- `role_duties`: chức vụ ↔ nghiệp vụ ↔ điều luật gốc.
- `appointments`: quy mô bổ nhiệm theo giá trị công trình hoặc số lao động.
- `training`: loại giáo dục, đối tượng, số giờ, nội dung, điều kiện miễn.
- `special_edu_tasks`: danh sách 39 việc 특별교육 và nội dung dạy.
- `penalties`: điều khoản vi phạm, hình phạt trần theo luật, mức thực tế lần 1/2/3 (đơn vị, cách tính theo người).
- `stats`: số vụ và tiền phạt (có thể trống).
- `cases`, `situations`: tình huống hiện trường và lối vào theo tình huống.

Quy tắc bắt buộc: mỗi dòng `penalties`, `stats`, `role_duties`, `training` có `source_url`, `published_date`, `effective_date`, `verified_at`. Thiếu một trường thì bản dựng thất bại. Giá trị không xác minh được ghi `미확인`.

## 11. Đội agent
Điều phối; agent luật; agent phạt và thống kê; agent hiện trường (viết 쉬운 말); agent kiểm chứng độc lập (không tin kết quả của agent khác); agent hình ảnh (Flow + `ks-visual-reviewer`); agent giao diện; agent cập nhật hằng ngày.

## 12. Kiểm soát chất lượng
1. Điều khoản trích trực tiếp từ nguồn chính thức, không viết từ trí nhớ.
2. Mỗi dòng phạt có link tới điều luật gốc và ghi đơn vị tiền tệ.
3. Build kiểm tra trường bắt buộc, link nguồn, ngày hiệu lực.
4. **So sánh bản hiện hành với bản sắp hiệu lực** trước khi đăng (xem mục 13).
5. Người dùng duyệt trước khi đăng. Bản 1.0 nên có chuyên viên pháp chế hoặc người làm giáo dục lâu năm đọc lại.

## 13. Điểm còn mở (cần xử lý trước khi đăng bản 1.0)
- **Ngày hiệu lực không đồng nhất:** 산안법 hiển thị [시행 2027.4.28.] (법률 제22122호, sửa đổi một phần 2026.10.27) cho nhiều điều; 시행령 và 시행규칙 [시행 2026.8.1.]; 건설기술 진흥법 [시행 2025.10.1.]; 중처법 hiển thị bản 2022.1.27. Chưa đối chiếu bản hiện hành với bản sắp hiệu lực; chưa chắc các trang đã là bản mới nhất.
- Chưa lấy: dòng 별표 35 cho 제125조 (đo môi trường), 제129·130조 (khám sức khỏe), 제54조② (báo cáo tai nạn); nội dung dạy từng việc 특별교육; 시행규칙 별표 5 제2호 (기초안전보건교육); 중처법 시행령; 건설기술 진흥법 시행령 (직무 của 안전관리조직); 안전보건기준에 관한 규칙 (điều theo công việc).
- Tên hai mục người dùng nói bằng giọng nói (chức "Phú Công Quản Lý Cha", nhóm "cho cấp khéo so") chưa xác nhận.
- Open API chưa hoạt động (IP chưa có hiệu lực).
- Thống kê tiền phạt thực tế theo hạng mục chưa có nguồn, nên chưa gắn ⭐ cho hạng mục nào.

## 14. Tiêu chí hoàn thành Giai đoạn 1
- Trang web chạy trên GitHub Pages, đọc tốt ở 400px và máy tính.
- Màn hình hỏi chức vụ và nghiệp vụ hoạt động; trang chủ riêng; luôn có lối xem tất cả.
- Mỗi chức vụ trong mục 3 có danh sách nghiệp vụ đã đối chiếu nguồn.
- Lĩnh vực 교육·보건 đầy đủ: giáo dục, giờ học, 특별교육, khám sức khỏe, đo môi trường, quy mô bổ nhiệm, mức phạt từng người.
- Bộ tra theo công tác hoạt động và giải thích đúng nguyên tắc "không gán cứng theo nghề".
- ⭐ chỉ ở mục có thống kê.
- Quy trình cập nhật hằng ngày chạy được và tạo bản nháp khi luật đổi.
- Hình minh họa đã qua kiểm duyệt kỹ thuật.

## 15. Rủi ro
| Rủi ro | Cách giảm |
|---|---|
| Luật đổi nhưng sổ tay lỗi thời | Kiểm tra hằng ngày, hiện ngày xác minh |
| Đọc nhầm bản luật (hiện hành so với sắp hiệu lực) | Đối chiếu hai bản trước khi đăng |
| Gán sai công tác với giáo dục | Hỏi việc làm kèm, agent kiểm chứng đối chiếu danh sách 별표 5 |
| Ẩn bớt nội dung làm sót nghĩa vụ | Mục "Cũng liên quan", nút xem tất cả, cảnh báo bắt buộc |
| API cần IP cố định | Chạy cập nhật trên máy cá nhân hoặc VPS |
| Hình AI sai kỹ thuật | Kiểm duyệt bắt buộc từng hình |
| Thống kê phạt thực tế thiếu | Hiện `통계 미확보`, không gắn ⭐ cảm tính |
| Skill ngoài chứa mã không mong muốn | Chỉ sao chép thủ công phần skill, đọc trước |
