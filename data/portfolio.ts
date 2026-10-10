import {
  siBlender, siCplusplus, siGit, siLua, siNextdotjs, siNodedotjs, siPython,
  siReact, siRobloxstudio, siTailwindcss, siThreedotjs, siTypescript,
} from "simple-icons";

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

/** A tech shown on the 3D conveyor. `icon` is a 24×24 SVG path (simple-icons, CC0). */
export type TechStack = {
  name: string;
  category: string;
  blurb: string;
  color: string;
  icon: string;
};

export type ContactLink = {
  kind: "phone" | "gmail" | "linkedin" | "facebook" | "github" | "roblox";
  label: string;
  /** Leave empty until the real value is known — the UI shows it as "Đang cập nhật". */
  value: string;
};

const tech = (name: string, category: string, blurb: string, icon: { path: string; hex: string }, color?: string): TechStack => ({
  name, category, blurb, icon: icon.path, color: color ?? `#${icon.hex}`,
});

export const portfolio = {
  name: "Tên của bạn",
  initials: "TB",
  /** The Roblox character starring on the site (R15_SussySuspector in Roblox Studio). */
  character: "Sussy",
  role: "Frontend Developer & Roblox Developer",
  location: "Thành phố Hồ Chí Minh, Việt Nam",
  availability: "Sẵn sàng cho những dự án phù hợp",
  shortIntro:
    "Tôi xây giao diện web rõ ràng và những thế giới Roblox có nhịp chạy riêng — nơi code gọn, chuyển động mượt và trải nghiệm là trọng tâm.",
  about: [
    "Tôi là một lập trình viên frontend kiêm Roblox developer, thích biến những ý tưởng phức tạp thành trải nghiệm đơn giản, có cảm xúc và chạy nhanh.",
    "Tôi làm việc sát với người dùng và đội ngũ: đặt đúng câu hỏi, thử nghiệm sớm, rồi hoàn thiện từng chi tiết cho đến khi sản phẩm vừa dễ dùng, vừa dễ duy trì.",
  ],
  resumeUrl: "",
  contacts: [
    { kind: "phone", label: "Điện thoại", value: "" },
    { kind: "gmail", label: "Gmail", value: "" },
    { kind: "linkedin", label: "LinkedIn", value: "" },
    { kind: "facebook", label: "Facebook", value: "" },
    { kind: "github", label: "GitHub", value: "" },
    { kind: "roblox", label: "Roblox", value: "https://www.roblox.com/users/11732948357/profile" },
  ] satisfies ContactLink[],
  techStack: [
    tech("TypeScript", "Ngôn ngữ", "Kiểu dữ liệu chặt chẽ cho mọi giao diện và công cụ tôi viết.", siTypescript),
    tech("React", "Giao diện", "Component rõ ràng, trạng thái dễ đoán, trải nghiệm mượt.", siReact),
    tech("Next.js", "Framework", "App Router, server components và hiệu năng tải trang.", siNextdotjs, "#e8e6e1"),
    tech("Three.js", "3D Web", "Cảnh 3D, shader và chuyển động ngay trong trình duyệt.", siThreedotjs, "#e8e6e1"),
    tech("Tailwind CSS", "Styling", "Hệ token nhất quán, dựng layout nhanh mà vẫn gọn.", siTailwindcss),
    tech("Node.js", "Runtime", "Script build, công cụ nội bộ và API nhẹ.", siNodedotjs),
    tech("Python", "Ngôn ngữ", "Tự động hoá, xử lý dữ liệu và pipeline cho asset.", siPython),
    tech("C++", "Ngôn ngữ", "Thuật toán, cấu trúc dữ liệu và tư duy hiệu năng.", siCplusplus),
    tech("Luau", "Roblox", "Gameplay, hệ thống di chuyển và UI cho trải nghiệm Roblox.", siLua, "#7d8bff"),
    tech("Roblox Studio", "Game engine", "Dựng map, animation R6/R15 và kiểm thử nhiều người chơi.", siRobloxstudio),
    tech("Blender", "3D", "Mô hình, UV và xuất GLB tối ưu cho web lẫn Roblox.", siBlender),
    tech("Git", "Cộng tác", "Nhánh gọn, commit nhỏ và lịch sử dễ đọc.", siGit),
  ] satisfies TechStack[],
  projects: [
    {
      title: "Nền tảng vận hành",
      year: "2026",
      category: "Frontend · React",
      summary: "Đơn giản hóa một quy trình nhiều bước thành không gian làm việc rõ ràng cho đội ngũ vận hành.",
      impact: "Thông tin kết quả sẽ được cập nhật",
    },
    {
      title: "Hệ thống di chuyển R6",
      year: "2026",
      category: "Roblox · Luau",
      summary: "Chạy, cúi, bò, leo và tiếp đất với animation, âm thanh bước chân và camera mượt.",
      impact: "Case study đang được hoàn thiện",
    },
    {
      title: "Portfolio 3D này",
      year: "2026",
      category: "Three.js · Blender",
      summary: "Nhân vật Roblox R6 chạy theo nhịp cuộn trang, animation trích thẳng từ file .rbxm.",
      impact: "Bạn đang xem nó",
    },
  ] satisfies Project[],
  experience: [
    {
      period: "2024 — nay",
      company: "Tên công ty hiện tại",
      role: "Frontend Developer",
      description: "Phụ trách giao diện đầu-cuối và phối hợp cùng thiết kế để đưa sản phẩm vào thực tế.",
    },
    {
      period: "2022 — 2024",
      company: "Dự án Roblox cá nhân",
      role: "Roblox Developer",
      description: "Lập trình gameplay bằng Luau, dựng map và tối ưu trải nghiệm trên mobile.",
    },
  ] satisfies Experience[],
} as const;
