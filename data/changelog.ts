/** Public changelog: the site is meant to keep evolving, newest release first. */
export type Release = {
  version: string;
  date: string;
  title: string;
  notes: string[];
};

export const changelog: Release[] = [
  {
    version: "2.6",
    date: "2026-10-11",
    title: "Vẫy tay và ngồi thư thả",
    notes: [
      "Vẫy tay chào được làm lại: tay nâng sang ngang rồi vẫy, không còn quét ngang mặt; Sussy dùng tay gần người xem và nghiêng đầu nhẹ.",
      "Tư thế ngồi cuối tự nhiên hơn: ngả lưng, tay đặt trên đùi, chân hơi dạng, thân hướng về hoàng hôn còn đầu quay lại nhìn bạn, thỉnh thoảng liếc ra xa.",
      "Chữ trượt lên khi xuất hiện và mờ dần trước khi chui dưới header/footer; bong bóng chat tự ẩn khi Sussy ở sau nội dung.",
      "Câu chào tạm biệt chỉ đến khi Sussy đã ngồi xuống; nút Liên hệ và phím J đưa thẳng tới cảnh ngồi.",
    ],
  },
  {
    version: "2.5",
    date: "2026-10-11",
    title: "Gió chiều",
    notes: [
      "Lá cây rơi lả tả từ tán cây và một đàn chim bay ngang bầu trời hoàng hôn; cả hai được vẽ bằng shader, mỗi loại một draw call.",
      "Bờ cỏ phía camera thấp và phẳng hơn để luôn thấy Sussy trên đường; câu chat ở cửa studio: “Ra ngoài chạy tiếp thôi!”.",
    ],
  },
  {
    version: "2.4",
    date: "2026-10-11",
    title: "Hành trình ra hoàng hôn",
    notes: [
      "Có câu chuyện nối tech stack với đoạn cuối: hết băng chuyền, Sussy chạy qua một cánh cửa sáng ra khỏi studio, theo con đường đất qua đồi cỏ, ngang các cột mốc dự án, rồi tới gốc cây lúc trời ngả hoàng hôn.",
      "Cây, bụi, cỏ và dương xỉ được dựng lại trong Blender: tán lá mềm và tròn, màu đỉnh có sẵn bóng tối bên trong cùng viền nắng ấm; cỏ và dương xỉ đung đưa theo gió.",
      "Ở đoạn cuối Sussy ngồi quay mặt ra màn hình, cây ở một bên, mặt trời lặn ở bên kia.",
    ],
  },
  {
    version: "2.3",
    date: "2026-10-11",
    title: "Đúng mặt Sussy",
    notes: ["Đầu Sussy giờ giống hệt trong Roblox Studio: quả trứng trắng, viền đen và hai mắt oval (accessory hai lớp vỏ), thay cho khuôn mặt vẽ tay."],
  },
  {
    version: "2.2",
    date: "2026-10-11",
    title: "CI",
    notes: ["Mỗi lần đẩy code lên GitHub, CI tự chạy lint, kiểm tra kiểu, test và build."],
  },
  {
    version: "2.1",
    date: "2026-10-11",
    title: "Kiểm thử trên trình duyệt",
    notes: ["Bộ test Playwright chạy trên Chrome thật cho desktop và mobile: tải trang, đổi chế độ, đổi ngôn ngữ, phím tắt, tràn ngang và các trang phụ."],
  },
  {
    version: "2.0",
    date: "2026-10-11",
    title: "CV một trang",
    notes: ["Trang /cv tạo tự động từ nội dung hai portfolio, có nút In / Lưu PDF và bản in A4 trắng đen gọn gàng."],
  },
  {
    version: "1.9",
    date: "2026-10-11",
    title: "Vẫy tay",
    notes: ["Sussy vẫy tay chào khi bạn mới đến và khi ngồi ngắm hoàng hôn, kèm câu chat."],
  },
  {
    version: "1.8",
    date: "2026-10-11",
    title: "Cột mốc bên đường",
    notes: ["Ở chương Dự án, mỗi dự án là một biển báo bên đường: Sussy chạy ngang qua đúng biển của dự án bạn đang đọc."],
  },
  {
    version: "1.7",
    date: "2026-10-11",
    title: "Phím tắt & chạm",
    notes: [
      "J / K để chuyển chương, H để Sussy nhảy.",
      "Chạm vào Sussy trên điện thoại cũng làm Sussy nhảy.",
    ],
  },
  {
    version: "1.6",
    date: "2026-10-11",
    title: "Sussy biết nói",
    notes: ["Bong bóng chat kiểu Roblox trên đầu Sussy mỗi khi sang chương mới, khác nhau giữa Dev/Roblox và VI/EN."],
  },
  {
    version: "1.5",
    date: "2026-10-11",
    title: "Ảnh chia sẻ",
    notes: ["Thẻ 1200×630 riêng cho portfolio Dev và Roblox khi chia sẻ link lên Facebook, LinkedIn hay Discord."],
  },
  {
    version: "1.4",
    date: "2026-10-11",
    title: "Nhẹ hơn",
    notes: [
      "Ảnh đầu Sussy của màn hình chờ đổi sang WebP 5 KB và nhúng thẳng vào HTML; poster dự phòng còn 14 KB.",
      "CSS gọn hơn, model 3D được tải với ưu tiên thấp, sửa lỗi console khi prefetch link.",
      "Lighthouse (bản production): desktop 99, mobile 86–89; Accessibility, Best Practices và SEO đều 100.",
    ],
  },
  {
    version: "1.3",
    date: "2026-10-11",
    title: "Chạng vạng",
    notes: ["Ngồi lại đủ lâu ở phần liên hệ, trời sẽ tối dần và sao bắt đầu lấp lánh; cuộn đi là trời sáng lại."],
  },
  {
    version: "1.2",
    date: "2026-10-11",
    title: "Hello, world",
    notes: ["Nút VI / EN trong header: toàn bộ portfolio Dev và Roblox có bản tiếng Anh (case study và nhật ký vẫn tiếng Việt)."],
  },
  {
    version: "1.1",
    date: "2026-10-11",
    title: "Trang lạc đường",
    notes: ["Trang 404 riêng: đầu Sussy xoay và lối quay về hai portfolio hoặc nhật ký."],
  },
  {
    version: "1.0",
    date: "2026-10-11",
    title: "Case study",
    notes: [
      "Trang /du-an/[slug] cho từng dự án; ba case study đầu tiên: Portfolio 3D này, Sussy và Animation R6 lên web.",
      "Sửa ghi công: gói Ultimate R6 Movement System là của tác giả Arczi — dự án ở đây là việc đưa animation của gói lên web.",
    ],
  },
  {
    version: "0.9",
    date: "2026-10-11",
    title: "Baseplate có hồn",
    notes: [
      "Chế độ Roblox có SpawnLocation sau lưng Sussy và vài khối part cổ điển có stud lơ lửng ở xa.",
      "Bảng leaderstats: Stage theo chương, Studs đếm quãng đường Sussy đã chạy.",
    ],
  },
  {
    version: "0.8",
    date: "2026-10-11",
    title: "Tiếng bước chân",
    notes: [
      "Nút âm thanh trong header (tắt mặc định): tiếng bước chân tổng hợp bằng Web Audio, khớp nhịp clip run v4.",
      "Sàn studio nghe cứng, đồi cỏ lúc hoàng hôn nghe mềm; tiếp đất sau cú nhảy có tiếng chạm.",
    ],
  },
  {
    version: "0.7",
    date: "2026-10-11",
    title: "Mượt hơn khi đổi chế độ",
    notes: [
      "Chuyển Dev ↔ Roblox giữ nguyên chương đang xem, không tải lại nhân vật hay renderer.",
      "Tối ưu từng frame và giải phóng tài nguyên WebGL gọn hơn.",
      "49 test tự động cho toán học cuộn trang, rig R6 và bộ trích animation .rbxm.",
    ],
  },
  {
    version: "0.6",
    date: "2026-10-11",
    title: "Sussy R6 & nhật ký",
    notes: [
      "Nhân vật chuyển sang model R6 Sussy trong Roblox Studio: khối R6 cổ điển, mũ Trilby, kính pixel, khăn và đai gốc.",
      "Bấm vào Sussy để nhảy, ở cả hai chế độ.",
      "Trang nhật ký này: mỗi lần nâng cấp đều được ghi lại.",
    ],
  },
  {
    version: "0.5",
    date: "2026-10-11",
    title: "Hai portfolio",
    notes: [
      "Chia thành portfolio Dev (/) và Roblox Dev (/roblox), chuyển bằng công tắc giữa header.",
      "Chế độ Roblox: baseplate ban đêm có stud, vòng focus xanh, Sussy nhảy khi qua chương.",
    ],
  },
  {
    version: "0.4",
    date: "2026-10-11",
    title: "Chạy theo nhịp cuộn",
    notes: [
      "Animation trích thẳng từ gói Ultimate R6 Movement System (.rbxm).",
      "Băng chuyền tech stack 3D dưới chân, có Python và C++.",
      "Cảnh hoàng hôn: Sussy ngồi dưới gốc cây, bảng liên hệ.",
      "Loading screen: đầu Sussy 2D xoay như đồng xu.",
    ],
  },
  {
    version: "0.2",
    date: "2026-09-06",
    title: "Sân khấu 3D",
    notes: ["Thêm không gian 3D cấu hình được trong hero và tinh chỉnh giao diện."],
  },
  {
    version: "0.1",
    date: "2026-09-06",
    title: "Khởi đầu",
    notes: ["Nền móng portfolio one-page: giới thiệu, dự án, kinh nghiệm, liên hệ."],
  },
];

export const currentVersion = changelog[0].version;
