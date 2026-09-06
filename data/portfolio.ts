export type Project = {
  title: string;
  year: string;
  category: string;
  summary: string;
  impact?: string;
  image?: string;
  url?: string;
};

export type Experience = {
  period: string;
  company: string;
  role: string;
  description: string;
};

export type Model3D = {
  name: string;
  caption: string;
  src?: string;
  variant: "orbital" | "fold" | "signal";
};

export const portfolio = {
  name: "Tên của bạn",
  initials: "TB",
  role: "Product Designer & Frontend Developer",
  location: "Thành phố Hồ Chí Minh, Việt Nam",
  availability: "Sẵn sàng cho những dự án phù hợp",
  shortIntro:
    "Tôi thiết kế những trải nghiệm số rõ ràng, có chủ đích và dễ sử dụng — nơi thẩm mỹ luôn phục vụ kết quả.",
  about: [
    "Tôi là một nhà thiết kế sản phẩm kiêm lập trình viên frontend, tập trung vào việc biến những bài toán phức tạp thành trải nghiệm đơn giản và hữu ích.",
    "Tôi thích làm việc sát với người dùng và đội ngũ sản phẩm: đặt đúng câu hỏi, thử nghiệm sớm, rồi hoàn thiện từng chi tiết cho đến khi sản phẩm vừa dễ dùng, vừa dễ duy trì.",
  ],
  email: "hello@example.com",
  phone: "",
  resumeUrl: "",
  socials: {
    linkedin: "https://www.linkedin.com/",
    github: "https://github.com/",
    behance: "",
    dribbble: "",
  },
  models3d: [
    { name: "Orbital", caption: "Khối chuyển động cho phần mở đầu", variant: "orbital" },
    { name: "Fold", caption: "Cấu trúc mô-đun cho dự án sản phẩm", variant: "fold" },
    { name: "Signal", caption: "Điểm nhấn không gian cho case study", variant: "signal" },
  ] satisfies Model3D[],
  skillGroups: [
    { title: "Tư duy", items: ["Product strategy", "User research", "Information architecture"] },
    { title: "Thiết kế", items: ["UX/UI design", "Design systems", "Prototyping"] },
    { title: "Phát triển", items: ["React & TypeScript", "Responsive UI", "Accessibility"] },
  ],
  projects: [
    {
      title: "Nền tảng vận hành",
      year: "2026",
      category: "Product design · Frontend",
      summary: "Đơn giản hóa một quy trình nhiều bước thành không gian làm việc rõ ràng cho đội ngũ vận hành.",
      impact: "Thông tin kết quả sẽ được cập nhật",
    },
    {
      title: "Trải nghiệm thương mại",
      year: "2025",
      category: "UX/UI design",
      summary: "Thiết kế lại hành trình khám phá và lựa chọn sản phẩm với trọng tâm là tốc độ và sự tự tin.",
      impact: "Case study đang được hoàn thiện",
    },
    {
      title: "Hệ thống thiết kế",
      year: "2025",
      category: "Design system · Engineering",
      summary: "Xây nền tảng giao diện nhất quán, dễ mở rộng cho nhiều nhóm sản phẩm cùng sử dụng.",
      impact: "Chi tiết dự án sẽ được cập nhật",
    },
  ] satisfies Project[],
  experience: [
    {
      period: "2024 — nay",
      company: "Tên công ty hiện tại",
      role: "Product Designer",
      description: "Phụ trách trải nghiệm đầu-cuối và phối hợp cùng kỹ thuật để đưa sản phẩm vào thực tế.",
    },
    {
      period: "2022 — 2024",
      company: "Tên công ty trước đây",
      role: "UI/UX Designer",
      description: "Thiết kế luồng cốt lõi, prototype và hệ thống thành phần cho các sản phẩm số.",
    },
  ] satisfies Experience[],
} as const;
