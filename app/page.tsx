import { PortfolioPage } from "@/components/portfolio-page";
import { portfolio } from "@/data/portfolio";

export default function Home() {
  const personSchema = { "@context": "https://schema.org", "@type": "Person", name: portfolio.name, jobTitle: portfolio.role, email: `mailto:${portfolio.email}`, address: portfolio.location, sameAs: Object.values(portfolio.socials).filter(Boolean) };
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }} /><PortfolioPage /></>;
}
