import { portfolio, type ContactLink, type Profile } from "./portfolio";

export type Locale = "vi" | "en";
export const LOCALES: readonly Locale[] = ["vi", "en"];

/** Interface strings for the portfolio story (case studies and the changelog stay Vietnamese). */
export const ui = {
  vi: {
    skip: "Chuyển đến nội dung chính",
    toTop: "về đầu trang",
    language: "Ngôn ngữ",
    soundOn: "Bật âm thanh",
    soundOff: "Tắt âm thanh",
    soundTitle: "Nhạc nền: công nghệ trong studio, gió đồng quê ngoài đường",
    contact: "Liên hệ",
    chapters: "Các chương",
    chapterLabels: ["Mở đầu", "Tech stack", "Dự án", "Liên hệ"],
    player: "Người chơi",
    hint: (name: string) => `Mẹo: bấm vào ${name} để nhảy · J / K để chuyển chương.`,
    chooseTech: "Chọn tech stack",
    techGroups: { language: "Ngôn ngữ", framework: "Framework", tool: "Công cụ" },
    workEyebrow: "DỰ ÁN & KINH NGHIỆM",
    project: "Dự án",
    projectsNav: "Chọn dự án",
    readCase: "Đọc case study →",
    viewProject: "Xem trên GitHub →",
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
    language: "Language",
    soundOn: "Sound on",
    soundOff: "Sound off",
    soundTitle: "Ambient music: tech in the studio, countryside wind on the road",
    contact: "Contact",
    chapters: "Chapters",
    chapterLabels: ["Intro", "Tech stack", "Work", "Contact"],
    player: "Player",
    hint: (name: string) => `Tip: click ${name} to jump · J / K to change chapter.`,
    chooseTech: "Choose a tech",
    techGroups: { language: "Languages", framework: "Frameworks", tool: "Tools" },
    workEyebrow: "WORK & EXPERIENCE",
    project: "Project",
    projectsNav: "Choose a project",
    readCase: "Read the case study →",
    viewProject: "View on GitHub →",
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

/** Roblox-style chat lines Sussy says at each story beat (see `speechBeat`: hello, tech stack, studio door, seated). */
export const chatLines: Record<Locale, readonly [string, string, string, string]> = {
  vi: ["gg! Mình là Sussy.", "Studio là nhà thứ hai.", "Teleport sang map mới!", "afk ngắm hoàng hôn..."],
  en: ["gg! I'm Sussy.", "Studio is my second home.", "Teleporting to a new map!", "afk watching the sunset..."],
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

const en: ProfileText = {
  role: "Roblox Developer",
  headline: ["Build maps.", "Write the rules."],
  intro: "I make Roblox games in Luau, mostly movement systems and multiplayer gameplay. Every game gets tried on a phone before it ships.",
  techTitle: ["The kit", "inside Studio."],
  workTitle: ["Servers", "I've opened."],
  loadingLabel: "Joining server",
  tech: {
    Luau: { category: "Scripting", blurb: "Gameplay, server authority, DataStores and modules I can reuse." },
    TypeScript: { category: "roblox-ts · Web", blurb: "Through roblox-ts on bigger projects, and for web work like this site." },
    Python: { category: "Tooling", blurb: "Scripts that process assets and pull animations and meshes out of Roblox files." },
    "C++": { category: "Algorithms", blurb: "Data structures and algorithms, the groundwork for optimising." },
    Roblox: { category: "Engine API", blurb: "The engine's API: Humanoid, Animator, DataStore, RemoteEvent." },
    "roblox-ts": { category: "TypeScript → Luau", blurb: "Compiles TypeScript to Luau, with types for the Roblox API too." },
    React: { category: "Web UI", blurb: "Web interfaces for the portfolio and internal tools." },
    "Three.js": { category: "3D Web", blurb: "Brings the R6 rig and Roblox animations to the browser." },
    "Roblox Studio": { category: "Engine · IDE", blurb: "Maps, R6/R15 rigs, animation and multiplayer testing." },
    Blender: { category: "3D", blurb: "Models, UVs, rigs, and triangle counts a phone can handle." },
    Figma: { category: "UI", blurb: "HUDs, menus and onboarding flows drawn before building." },
    Git: { category: "Workflow", blurb: "Rojo + Git to manage code outside Studio." },
  },
  projects: {
    easyvfx: {
      category: "Roblox Studio plugin",
      summary: "A no-code VFX plugin: pick an object, click an effect, tweak colours and sliders, then choose when it plays. 45 effects (slashes, magic, dark fantasy), a block-based effect creator and a lightweight client-side runtime.",
      impact: "Open source · MIT",
    },
    "demo-2": { category: "In development", summary: "This project is still in the works. A demo will be added here soon.", impact: "Coming soon" },
    "demo-3": { category: "In development", summary: "This project is still in the works. A demo will be added here soon.", impact: "Coming soon" },
    "demo-4": { category: "In development", summary: "This project is still in the works. A demo will be added here soon.", impact: "Coming soon" },
  },
  experience: [
    { period: "2023 – now", company: "Personal Roblox projects", role: "Roblox Developer", description: "Gameplay in Luau, map building and phone optimisation." },
    { period: "2022 – 2023", company: "Small game team", role: "Scripter", description: "Inventory, shop and UI for seasonal updates." },
  ],
  about: [
    "I started in Roblox Studio with simple obbies, then found I liked the systems underneath more, like movement and network sync.",
    "I pay most attention to a player's first 30 seconds, so I always test on a real phone before publishing.",
  ],
};

/** The profile in the given language (icons, colours and slugs come from the Vietnamese source). */
export function localizedProfile(locale: Locale): Profile {
  const base = portfolio.profile;
  if (locale === "vi") return base;
  return {
    ...base,
    role: en.role,
    headline: en.headline,
    intro: en.intro,
    techTitle: en.techTitle,
    workTitle: en.workTitle,
    loadingLabel: en.loadingLabel,
    techStack: base.techStack.map((tech) => ({ ...tech, ...en.tech[tech.name] })),
    projects: base.projects.map((project) => ({ ...project, ...en.projects[project.slug] })),
    experience: en.experience,
    about: en.about,
  };
}
