import {
  siAseprite, siBlender, siCplusplus, siDiscord, siFigma, siGit, siLua, siNextdotjs, siNodedotjs, siPython,
  siReact, siRoblox, siRobloxstudio, siTailwindcss, siThreedotjs, siTypescript,
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

export type Mode = "dev" | "roblox";

/** One of the two portfolios sharing the site (switch in the header: Dev ↔ Roblox). */
export type Profile = {
  mode: Mode;
  /** Label on the mode switch. */
  label: string;
  /** "001" / "002" next to the character name. */
  code: string;
  brandSub: string;
  role: string;
  headline: readonly [string, string];
  intro: string;
  techTitle: readonly [string, string];
  techStack: readonly TechStack[];
  workTitle: readonly [string, string];
  projects: readonly Project[];
  experience: readonly Experience[];
  about: readonly string[];
  footerMeta: string;
  loadingLabel: string;
};

export const portfolio = {
  name: "Tên của bạn",
  initials: "TB",
  /** The Roblox character starring on the site (R6_SussySuspector_1265476893 in Roblox Studio). */
  character: "Sussy",
  location: "Thành phố Hồ Chí Minh, Việt Nam",
  availability: "Sẵn sàng cho những dự án phù hợp",
  resumeUrl: "",
  contacts: [
    { kind: "phone", label: "Điện thoại", value: "" },
    { kind: "gmail", label: "Gmail", value: "" },
    { kind: "linkedin", label: "LinkedIn", value: "" },
    { kind: "facebook", label: "Facebook", value: "" },
    { kind: "github", label: "GitHub", value: "" },
    { kind: "roblox", label: "Roblox", value: "https://www.roblox.com/users/11732948357/profile" },
  ] satisfies ContactLink[],
  profiles: {
    dev: {
      mode: "dev",
      label: "Dev",
      code: "001",
      brandSub: "A PORTFOLIO RUN",
      role: "Frontend Developer",
      headline: ["Code gọn.", "Chạy không ngừng."],
      intro:
        "Tôi xây giao diện web rõ ràng, nhanh và có nhịp chuyển động riêng — nơi code gọn và trải nghiệm là trọng tâm.",
      techTitle: ["Những công cụ", "tôi chạy cùng."],
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
      ],
      workTitle: ["Những quãng đường", "đã chạy qua."],
      projects: [
        {
          title: "Nền tảng vận hành",
          year: "2026",
          category: "Frontend · React",
          summary: "Đơn giản hóa một quy trình nhiều bước thành không gian làm việc rõ ràng cho đội ngũ vận hành.",
          impact: "Thông tin kết quả sẽ được cập nhật",
        },
        {
          title: "Design system nội bộ",
          year: "2025",
          category: "React · Tailwind",
          summary: "Bộ component và token dùng chung cho nhiều nhóm sản phẩm, có tài liệu và kiểm thử trực quan.",
          impact: "Case study đang được hoàn thiện",
        },
        {
          title: "Portfolio 3D này",
          year: "2026",
          category: "Three.js · Blender",
          summary: "Nhân vật Roblox R6 chạy theo nhịp cuộn trang, animation trích thẳng từ file .rbxm.",
          impact: "Bạn đang xem nó",
        },
      ],
      experience: [
        {
          period: "2024 — nay",
          company: "Tên công ty hiện tại",
          role: "Frontend Developer",
          description: "Phụ trách giao diện đầu-cuối và phối hợp cùng thiết kế để đưa sản phẩm vào thực tế.",
        },
        {
          period: "2022 — 2024",
          company: "Dự án tự do",
          role: "Web Developer",
          description: "Landing page, dashboard và công cụ nội bộ cho các nhóm nhỏ.",
        },
      ],
      about: [
        "Tôi là một lập trình viên frontend thích biến những ý tưởng phức tạp thành trải nghiệm đơn giản, có cảm xúc và chạy nhanh.",
        "Tôi làm việc sát với người dùng và đội ngũ: đặt đúng câu hỏi, thử nghiệm sớm, rồi hoàn thiện từng chi tiết cho đến khi sản phẩm vừa dễ dùng, vừa dễ duy trì.",
      ],
      footerMeta: "CODE / WEB / MOTION",
      loadingLabel: "Đang gọi Sussy",
    },
    roblox: {
      mode: "roblox",
      label: "Roblox",
      code: "002",
      brandSub: "A ROBLOX RUN",
      role: "Roblox Developer",
      headline: ["Dựng map.", "Viết luật chơi."],
      intro:
        "Tôi làm trải nghiệm Roblox bằng Luau: hệ thống di chuyển, gameplay nhiều người chơi, UI và animation — chạy mượt cả trên điện thoại.",
      techTitle: ["Bộ đồ nghề", "trong Studio."],
      techStack: [
        tech("Luau", "Scripting", "Gameplay, server authority, DataStore và module tái sử dụng.", siLua, "#7d8bff"),
        tech("Roblox Studio", "Engine", "Dựng map, rig R6/R15, animation và test nhiều người chơi.", siRobloxstudio),
        tech("roblox-ts", "Scripting", "Viết TypeScript và biên dịch sang Luau cho dự án lớn.", siTypescript),
        tech("Blender", "3D", "Model, UV, rig và tối ưu tri cho mobile.", siBlender),
        tech("Figma", "UI", "Thiết kế HUD, menu và luồng onboarding trước khi dựng.", siFigma),
        tech("Aseprite", "Pixel art", "Icon, badge và texture pixel cho UI trong game.", siAseprite),
        tech("Git", "Workflow", "Rojo + Git để quản lý mã nguồn ngoài Studio.", siGit),
        tech("Python", "Tooling", "Script xử lý asset, trích animation và mesh tự động.", siPython),
        tech("Discord", "Cộng đồng", "Devlog, playtest và nhận phản hồi từ người chơi.", siDiscord),
        tech("Roblox", "Nền tảng", "Xuất bản, monetization và phân tích trải nghiệm.", siRoblox, "#e8e6e1"),
      ],
      workTitle: ["Những server", "đã từng mở."],
      projects: [
        {
          title: "Ultimate R6 Movement",
          year: "2026",
          category: "Luau · Animation",
          summary: "Chạy, cúi, bò, leo, ragdoll và tiếp đất với camera shake, âm thanh bước chân theo vật liệu.",
          impact: "Case study đang được hoàn thiện",
        },
        {
          title: "Obby nhiều người chơi",
          year: "2025",
          category: "Gameplay · UI",
          summary: "Checkpoint, bảng xếp hạng và hiệu ứng tối ưu cho thiết bị cấu hình thấp.",
          impact: "Số liệu người chơi sẽ được cập nhật",
        },
        {
          title: "Sussy",
          year: "2026",
          category: "Avatar · Blender",
          summary: "Nhân vật đại diện, đưa từ Roblox Studio sang Blender rồi lên web với rig R6.",
          impact: "Đang chạy ngay trên trang này",
        },
      ],
      experience: [
        {
          period: "2023 — nay",
          company: "Dự án Roblox cá nhân",
          role: "Roblox Developer",
          description: "Lập trình gameplay bằng Luau, dựng map và tối ưu trải nghiệm trên mobile.",
        },
        {
          period: "2022 — 2023",
          company: "Nhóm game nhỏ",
          role: "Scripter",
          description: "Hệ thống inventory, shop và UI cho các trải nghiệm theo mùa.",
        },
      ],
      about: [
        "Tôi bắt đầu với Roblox Studio từ những obby đơn giản, rồi say mê phần hệ thống: di chuyển, mạng, và cảm giác điều khiển.",
        "Tôi quan tâm nhất đến việc người chơi cảm thấy gì trong 30 giây đầu — nên luôn thử trên điện thoại thật trước khi xuất bản.",
      ],
      footerMeta: "LUAU / STUDIO / R6",
      loadingLabel: "Đang vào server",
    },
  } satisfies Record<Mode, Profile>,
} as const;
