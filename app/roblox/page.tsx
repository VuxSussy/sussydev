import { permanentRedirect } from "next/navigation";

/** The Dev and Roblox portfolios were merged into one Roblox developer portfolio at `/`; old links keep working. */
export default function RobloxPortfolio() {
  permanentRedirect("/");
}
