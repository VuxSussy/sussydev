/**
 * Long-form case studies keyed by project slug (see `Project.slug` in data/portfolio.ts).
 * Only write what actually happened; projects without an entry show a "being written" page.
 */
export type CaseStudy = {
  intro: string;
  stack: string[];
  /** Short facts shown as a stat row. */
  facts: { label: string; value: string }[];
  sections: { title: string; paragraphs: string[] }[];
};

export const caseStudies: Record<string, CaseStudy> = {};
