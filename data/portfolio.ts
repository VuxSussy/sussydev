import {
  siBlender, siCplusplus, siFigma, siGit, siLua, siPython,
  siReact, siRoblox, siRobloxstudio, siThreedotjs, siTypescript,
} from "simple-icons";

export type Project = {
  /** URL segment for /du-an/[slug]; a case study is shown when `data/case-studies.ts` has an entry. */
  slug: string;
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

/** The three shelves the tech stack is sorted into (in this order on the conveyor and in the chips). */
export const TECH_GROUPS = ["language", "framework", "tool"] as const;
export type TechGroup = (typeof TECH_GROUPS)[number];

/** A tech shown on the 3D conveyor. `icon` is a 24×24 SVG path (simple-icons, CC0). */
export type TechStack = {
  name: string;
  group: TechGroup;
  category: string;
  blurb: string;
  color: string;
  icon: string;
};

export type ContactLink = {
  kind: "discord" | "gmail" | "linkedin" | "facebook" | "github" | "roblox";
  label: string;
  /** Leave empty until the real value is known — the UI shows it as "Đang cập nhật". */
  value: string;
};

const tech = (name: string, group: TechGroup, category: string, blurb: string, icon: { path: string; hex: string }, color?: string): TechStack => ({
  name, group, category, blurb, icon: icon.path, color: color ?? `#${icon.hex}`,
});

/** The portfolio's copy and content (one profile: Roblox developer). */
export type Profile = {
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
    // Discord: a profile link such as https://discord.com/users/<your user id>, or an invite link.
    { kind: "discord", label: "Discord", value: "" },
    { kind: "gmail", label: "Gmail", value: "voleanhvu736@gmail.com" },
    { kind: "linkedin", label: "LinkedIn", value: "" },
    { kind: "facebook", label: "Facebook", value: "https://facebook.com/vuxsussy" },
    { kind: "github", label: "GitHub", value: "https://github.com/VuxSussy" },
    { kind: "roblox", label: "Roblox", value: "https://www.roblox.com/users/11732948357/profile" },
  ] satisfies ContactLink[],
  profile: {
    brandSub: "Aspiring Roblox Developer",
    role: "Roblox Developer",
    headline: ["Dựng map.", "Viết luật chơi."],
    intro:
      "Tôi làm game Roblox bằng Luau, chủ yếu là hệ thống di chuyển và gameplay nhiều người chơi. Game nào cũng được thử trên điện thoại trước khi xuất bản.",
    techTitle: ["Bộ đồ nghề", "trong Studio."],
    techStack: [
      tech("Luau", "language", "Scripting", "Gameplay, server authority, DataStore và module dùng lại được.", siLua, "#7d8bff"),
      tech("TypeScript", "language", "roblox-ts · Web", "Viết qua roblox-ts cho dự án lớn, và cho phần web như trang này.", siTypescript),
      tech("Python", "language", "Tooling", "Script xử lý asset, trích animation và mesh từ file Roblox.", siPython),
      tech("C++", "language", "Thuật toán", "Cấu trúc dữ liệu và thuật toán, nền cho việc tối ưu.", siCplusplus),
      tech("Roblox", "framework", "Engine API", "API của engine: Humanoid, Animator, DataStore, RemoteEvent.", siRoblox, "#e8e6e1"),
      tech("roblox-ts", "framework", "TypeScript → Luau", "Biên dịch TypeScript sang Luau, có kiểu cho cả API Roblox.", siTypescript),
      tech("React", "framework", "Web UI", "Giao diện web cho portfolio và công cụ nội bộ.", siReact),
      tech("Three.js", "framework", "3D Web", "Đưa rig R6 và animation Roblox lên trình duyệt.", siThreedotjs, "#e8e6e1"),
      tech("Roblox Studio", "tool", "Engine · IDE", "Dựng map, rig R6/R15, animation và test nhiều người chơi.", siRobloxstudio),
      tech("Blender", "tool", "3D", "Model, UV, rig và giữ số tam giác vừa sức điện thoại.", siBlender),
      tech("Figma", "tool", "UI", "Vẽ HUD, menu và luồng onboarding trước khi dựng.", siFigma),
      tech("Git", "tool", "Workflow", "Rojo + Git để quản lý mã nguồn ngoài Studio.", siGit),
    ],
    workTitle: ["Những server", "đã từng mở."],
    // Projects without an `image` show the DEMO banner on their roadside screen until real projects are added.
    projects: [
      {
        slug: "easyvfx",
        title: "EasyVFX",
        year: "2026",
        category: "Plugin Roblox Studio",
        summary: "Plugin VFX không cần code: chọn object, bấm một hiệu ứng, chỉnh màu và thanh trượt, rồi chọn lúc nó chạy. 45 hiệu ứng (chém, phép thuật, dark fantasy), trình tạo hiệu ứng dạng khối và runtime nhẹ phía client.",
        impact: "Mã nguồn mở · MIT",
        image: "/projects/easyvfx.webp",
        url: "https://github.com/VuxSussy/EasyVFX",
      },
      {
        slug: "the-gate-beneath",
        title: "The Gate Beneath",
        year: "2026",
        category: "Game Roblox · Chưa phát hành",
        summary: "Game phiêu lưu dark fantasy: một người lữ hành mang kiếm đứng trước cánh cổng đá khổng lồ, và thứ ánh sáng lọt qua khe cửa dẫn xuống thế giới bên dưới.",
        impact: "Chưa phát hành",
        image: "/projects/the-gate-beneath.webp",
      },
      { slug: "demo-3", title: "Demo", year: "2026", category: "Đang phát triển", summary: "Dự án đang được hoàn thiện. Bản demo sẽ sớm được cập nhật tại đây.", impact: "Sắp ra mắt" },
      { slug: "demo-4", title: "Demo", year: "2026", category: "Đang phát triển", summary: "Dự án đang được hoàn thiện. Bản demo sẽ sớm được cập nhật tại đây.", impact: "Sắp ra mắt" },
    ],
    experience: [
      {
        period: "2023 – nay",
        company: "Dự án Roblox cá nhân",
        role: "Roblox Developer",
        description: "Lập trình gameplay bằng Luau, dựng map và tối ưu cho điện thoại.",
      },
      {
        period: "2022 – 2023",
        company: "Nhóm game nhỏ",
        role: "Scripter",
        description: "Inventory, shop và UI cho các bản cập nhật theo mùa.",
      },
    ],
    about: [
      "Tôi bắt đầu với Roblox Studio bằng những obby đơn giản, rồi dần thích phần hệ thống bên dưới hơn, như di chuyển và đồng bộ mạng.",
      "Tôi để ý nhất 30 giây đầu tiên của người chơi, nên luôn thử trên điện thoại thật trước khi xuất bản.",
    ],
    footerMeta: "LUAU / STUDIO / R6",
    loadingLabel: "Đang vào server",
  } satisfies Profile,
} as const;
