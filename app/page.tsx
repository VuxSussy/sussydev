import { portfolio } from "@/data/portfolio";

export default function Home() {
  const sameAs = portfolio.contacts.filter((c) => c.value.startsWith("http")).map((c) => c.value);
  const personSchema = { "@context": "https://schema.org", "@type": "Person", name: portfolio.name, jobTitle: portfolio.profiles.dev.role, address: portfolio.location, sameAs };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }} />;
}
