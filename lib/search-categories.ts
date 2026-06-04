/** Category slugs (PT) map to English DB service names for search. */
export const CATEGORY_SLUGS = {
  cabelo: { label: "Hair", searchTerm: "Haircut" },
  barba: { label: "Beard", searchTerm: "Beard" },
  acabamento: { label: "Finish", searchTerm: "Lineup" },
  sobrancelha: { label: "Eyebrows", searchTerm: "Eyebrow" },
  massagem: { label: "Massage", searchTerm: "Massage" },
  hidratacao: { label: "Hydration", searchTerm: "Hydration" },
} as const;

export type CategorySlug = keyof typeof CATEGORY_SLUGS;

export function resolveSearchQuery(query: string): {
  displayLabel: string;
  dbQuery: string;
} {
  const key = query.toLowerCase() as CategorySlug;
  const category = CATEGORY_SLUGS[key];

  if (category) {
    return { displayLabel: category.label, dbQuery: category.searchTerm };
  }

  return { displayLabel: query, dbQuery: query };
}
