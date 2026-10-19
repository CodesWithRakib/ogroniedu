import type {
  SearchCatalogResponse,
  TutorCardData,
  TutorSortKey,
} from '../types/tutor-discovery.types';

export interface ClientFilterInput {
  query: string;
  modeFilter: string;
  minPrice: string;
  maxPrice: string;
  sortBy: TutorSortKey;
}

function hourlyRate(tutor: TutorCardData): number {
  return tutor.hourlyRateMinor ? Number(tutor.hourlyRateMinor) / 100 : 0;
}

/**
 * Pure client-side filter/sort used only when the container provides no API
 * `onSearch` handler (e.g. isolated component tests). Keeps the same ordering
 * and price semantics as the server search contract.
 */
export function filterCatalog(
  catalog: SearchCatalogResponse,
  input: ClientFilterInput,
): SearchCatalogResponse {
  let filtered = [...catalog.data];
  const query = input.query.trim().toLowerCase();

  if (query) {
    filtered = filtered.filter(
      (t) =>
        [t.displayName, t.displayNameEn, t.displayNameBn].some(
          (value) => value?.toLowerCase().includes(query) ?? false,
        ) ||
        [t.headline, t.headlineEn, t.headlineBn].some(
          (value) => value?.toLowerCase().includes(query) ?? false,
        ) ||
        [t.bio, t.bioEn, t.bioBn].some((value) => value?.toLowerCase().includes(query) ?? false) ||
        t.subjects.some(
          (s) => s.subjectNameEn.toLowerCase().includes(query) || s.subjectNameBn.includes(query),
        ),
    );
  }
  if (input.modeFilter) {
    filtered = filtered.filter((t) => t.teachingModes.includes(input.modeFilter));
  }
  if (input.minPrice) {
    const min = Number(input.minPrice);
    filtered = filtered.filter((t) => hourlyRate(t) >= min);
  }
  if (input.maxPrice) {
    const max = Number(input.maxPrice);
    filtered = filtered.filter((t) => hourlyRate(t) <= max);
  }

  if (input.sortBy === 'price_asc') {
    filtered.sort((a, b) => Number(a.hourlyRateMinor || 0) - Number(b.hourlyRateMinor || 0));
  } else if (input.sortBy === 'price_desc') {
    filtered.sort((a, b) => Number(b.hourlyRateMinor || 0) - Number(a.hourlyRateMinor || 0));
  } else if (input.sortBy === 'experience_desc') {
    filtered.sort((a, b) => (b.yearsExperience || 0) - (a.yearsExperience || 0));
  } else {
    filtered.sort((a, b) => b.matchScore - a.matchScore);
  }

  return {
    data: filtered,
    total: filtered.length,
    page: 1,
    limit: 10,
    totalPages: Math.max(1, Math.ceil(filtered.length / 10)),
  };
}
