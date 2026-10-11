import { portfolio, type ContactLink, type Mode, type Profile } from "./portfolio";

export type Locale = "vi" | "en";
export const LOCALES: readonly Locale[] = ["vi", "en"];

/** Interface strings for the portfolio story (case studies and the changelog stay Vietnamese). */
export const ui = {
  vi: {
    skip: "Chuyển đến nội dung chính",
    toTop: "về đầu trang",
    chooseMode: "Chọn portfolio",
    language: "Ngôn ngữ",
    soundOn: "Bật âm thanh",
    soundOff: "Tắt âm thanh",
    soundTitle: "Tiếng bước chân",
    motionOn: "Bật chuyển động",
    motionOff: "Giảm chuyển động",
    contact: "Liên hệ",
    chapters: "Các chương",
    chapterLabels: ["Mở đầu", "Tech stack", "Dự án", "Liên hệ"],
    player: "Người chơi",
    hint: (name: string) => `Mẹo: bấm vào ${name} (hoặc phím H) để nhảy · J / K để chuyển chương.`,
    chooseTech: "Chọn tech stack",
    workEyebrow: "DỰ ÁN & KINH NGHIỆM",
    readCase: "Đọc case study →",
    experience: "Kinh nghiệm",
    about: "Về tôi",
    sunsetEyebrow: "HOÀNG HÔN",
    contactTitle: ["Hết đường chạy rồi.", "Ngồi lại nói chuyện nhé."],
    contactLede: (availability: string) => `${availability}. Nhắn cho tôi qua bất kỳ kênh nào bên dưới.`,
    pending: "Đang cập nhật",
    copyEmail: "Sao chép email",
    copiedEmail: "Đã sao chép email",
    copiedAnnounce: "Đã sao chép địa chỉ email",
    changelog: "Nhật ký",
    restart: "Chạy lại từ đầu",
    scrollWith: (name: string) => `Cuộn để chạy cùng ${name}`,
    footnote: (name: string) => `Nhân vật Roblox ${name} chạy qua portfolio theo nhịp cuộn trang.`,
    location: portfolio.location,
    availability: portfolio.availability,
  },
  en: {
    skip: "Skip to main content",
    toTop: "back to top",
    chooseMode: "Choose portfolio",
    language: "Language",
    soundOn: "Sound on",
    soundOff: "Sound off",
    soundTitle: "Footsteps",
    motionOn: "Enable motion",
    motionOff: "Reduce motion",
    contact: "Contact",
    chapters: "Chapters",
    chapterLabels: ["Intro", "Tech stack", "Work", "Contact"],
    player: "Player",
    hint: (name: string) => `Tip: click ${name} (or press H) to jump · J / K to change chapter.`,
    chooseTech: "Choose a tech",
    workEyebrow: "WORK & EXPERIENCE",
    readCase: "Read the case study →",
    experience: "Experience",
    about: "About",
    sunsetEyebrow: "SUNSET",
    contactTitle: ["End of the run.", "Let's sit down and talk."],
    contactLede: (availability: string) => `${availability}. Reach me on any channel below.`,
    pending: "Coming soon",
    copyEmail: "Copy email",
    copiedEmail: "Email copied",
    copiedAnnounce: "Email address copied",
    changelog: "Changelog",
    restart: "Run it again",
    scrollWith: (name: string) => `Scroll to run with ${name}`,
    footnote: (name: string) => `The Roblox character ${name} runs through this portfolio as you scroll.`,
    location: "Ho Chi Minh City, Vietnam",
    availability: "Open to the right projects",
  },
} as const;

const contactLabelsEn: Record<ContactLink["kind"], string> = {
  phone: "Phone", gmail: "Gmail", linkedin: "LinkedIn", facebook: "Facebook", github: "GitHub", roblox: "Roblox",
};

export const contactLabel = (contact: ContactLink, locale: Locale) => (locale === "en" ? contactLabelsEn[contact.kind] : contact.label);

/** Roblox-style chat lines Sussy says when a chapter starts (index = chapter). */
export const chatLines: Record<Locale, Record<Mode, readonly [string, string, string, string]>> = {
  vi: {
    dev: ["Chào, mình là Sussy!", "Đồ nghề của mình đây.", "Mấy quãng đường đã chạy qua.", "Ngồi nghỉ chút nhé..."],
    roblox: ["gg! Mình là Sussy.", "Studio là nhà thứ hai.", "Server nào cũng từng mở.", "afk ngắm hoàng hôn..."],
  },
  en: {
    dev: ["Hi, I'm Sussy!", "Here's my toolkit.", "Roads I've run.", "Let's rest a bit..."],
    roblox: ["gg! I'm Sussy.", "Studio is my second home.", "Servers I've opened.", "afk watching the sunset..."],
  },
};

type ProjectText = { title?: string; category?: string; summary: string; impact?: string };
type ProfileText = {
  role: string;
  headline: [string, string];
  intro: string;
  techTitle: [string, string];
  workTitle: [string, string];
  loadingLabel: string;
  tech: Record<string, { category: string; blurb: string }>;
  projects: Record<string, ProjectText>;
  experience: { role: string; company: string; description: string; period: string }[];
  about: string[];
};

const en: Record<Mode, ProfileText> = {
  dev: {
    role: "Frontend Developer",
    headline: ["Clean code.", "Never stop running."],
    intro: "I build clear, fast web interfaces with their own sense of motion — where tidy code and the experience come first.",
    techTitle: ["The tools", "I run with."],
    workTitle: ["Roads", "I've run."],
    loadingLabel: "Calling Sussy",
    tech: {
      TypeScript: { category: "Language", blurb: "Strict types for every interface and tool I write." },
      React: { category: "UI", blurb: "Clear components, predictable state, smooth experiences." },
      "Next.js": { category: "Framework", blurb: "App Router, server components and fast page loads." },
      "Three.js": { category: "3D Web", blurb: "3D scenes, shaders and motion right in the browser." },
      "Tailwind CSS": { category: "Styling", blurb: "Consistent tokens, fast layouts that stay tidy." },
      "Node.js": { category: "Runtime", blurb: "Build scripts, internal tools and light APIs." },
      Python: { category: "Language", blurb: "Automation, data processing and asset pipelines." },
      "C++": { category: "Language", blurb: "Algorithms, data structures and performance thinking." },
      Luau: { category: "Roblox", blurb: "Gameplay, movement systems and UI for Roblox experiences." },
      "Roblox Studio": { category: "Game engine", blurb: "Building maps, R6/R15 animation and multiplayer testing." },
      Blender: { category: "3D", blurb: "Modelling, UVs and optimised GLB exports for web and Roblox." },
      Git: { category: "Collaboration", blurb: "Tidy branches, small commits and a readable history." },
    },
    projects: {
      "nen-tang-van-hanh": { title: "Operations platform", summary: "Turned a multi-step process into a clear workspace for an operations team.", impact: "Results coming soon" },
      "design-system-noi-bo": { title: "Internal design system", summary: "Shared components and tokens for several product teams, with docs and visual tests.", impact: "Case study in progress" },
      "portfolio-3d": { title: "This 3D portfolio", summary: "A Roblox R6 character running to the rhythm of your scroll, animation pulled straight from a .rbxm file." },
    },
    experience: [
      { period: "2024 — now", company: "Current company", role: "Frontend Developer", description: "Owns the interface end to end and works with design to ship the product." },
      { period: "2022 — 2024", company: "Freelance", role: "Web Developer", description: "Landing pages, dashboards and internal tools for small teams." },
    ],
    about: [
      "I'm a frontend developer who likes turning complex ideas into experiences that feel simple, expressive and fast.",
      "I work close to users and the team: ask the right questions, prototype early, then polish until it is easy to use and easy to maintain.",
    ],
  },
  roblox: {
    role: "Roblox Developer",
    headline: ["Build maps.", "Write the rules."],
    intro: "I make Roblox experiences in Luau: movement systems, multiplayer gameplay, UI and animation — smooth even on phones.",
    techTitle: ["The kit", "inside Studio."],
    workTitle: ["Servers", "I've opened."],
    loadingLabel: "Joining server",
    tech: {
      Luau: { category: "Scripting", blurb: "Gameplay, server authority, DataStores and reusable modules." },
      "Roblox Studio": { category: "Engine", blurb: "Maps, R6/R15 rigs, animation and multiplayer testing." },
      "roblox-ts": { category: "Scripting", blurb: "TypeScript compiled to Luau for larger projects." },
      Blender: { category: "3D", blurb: "Models, UVs, rigs and triangle budgets for mobile." },
      Figma: { category: "UI", blurb: "HUDs, menus and onboarding flows designed before building." },
      Aseprite: { category: "Pixel art", blurb: "Icons, badges and pixel textures for in-game UI." },
      Git: { category: "Workflow", blurb: "Rojo + Git to manage code outside Studio." },
      Python: { category: "Tooling", blurb: "Scripts that process assets and extract animations and meshes." },
      Discord: { category: "Community", blurb: "Devlogs, playtests and player feedback." },
      Roblox: { category: "Platform", blurb: "Publishing, monetisation and experience analytics." },
    },
    projects: {
      "animation-r6-len-web": { title: "R6 animation on the web", summary: "Extracted 15 KeyframeSequences from the Ultimate R6 Movement System pack (by Arczi) and replayed them on an R6 rig in Three.js." },
      "obby-nhieu-nguoi-choi": { title: "Multiplayer obby", summary: "Checkpoints, leaderboards and effects tuned for low-end devices.", impact: "Player numbers coming soon" },
      sussy: { summary: "My avatar, taken from Roblox Studio into Blender and onto the web with an R6 rig." },
    },
    experience: [
      { period: "2023 — now", company: "Personal Roblox projects", role: "Roblox Developer", description: "Gameplay in Luau, map building and mobile optimisation." },
      { period: "2022 — 2023", company: "Small game team", role: "Scripter", description: "Inventory, shop and UI systems for seasonal experiences." },
    ],
    about: [
      "I started in Roblox Studio with simple obbies, then fell for the systems side: movement, networking and how controls feel.",
      "I care most about what players feel in the first 30 seconds — so I always test on a real phone before publishing.",
    ],
  },
};

/** The profile for a portfolio mode in the given language (icons, colours and slugs come from the Vietnamese source). */
export function localizedProfile(mode: Mode, locale: Locale): Profile {
  const base = portfolio.profiles[mode];
  if (locale === "vi") return base;
  const text = en[mode];
  return {
    ...base,
    role: text.role,
    headline: text.headline,
    intro: text.intro,
    techTitle: text.techTitle,
    workTitle: text.workTitle,
    loadingLabel: text.loadingLabel,
    techStack: base.techStack.map((tech) => ({ ...tech, ...text.tech[tech.name] })),
    projects: base.projects.map((project) => ({ ...project, ...text.projects[project.slug] })),
    experience: text.experience,
    about: text.about,
  };
}
