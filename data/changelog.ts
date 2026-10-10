/** Public changelog: the site is meant to keep evolving, newest release first. */
export type Release = {
  version: string;
  date: string;
  title: string;
  notes: string[];
};

export const changelog: Release[] = [
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
