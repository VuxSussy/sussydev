/** Public changelog: the site is meant to keep evolving, newest release first. */
export type Release = {
  version: string;
  date: string;
  title: string;
  notes: string[];
};

export const changelog: Release[] = [
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
