import ky from 'ky';

/**
 * Lightweight loader to fetch the centralized planning-activity structure from the backend.
 * Works in any non-React context (CLI scripts, Node services, Zod schema factories, etc.)
 * and keeps an in-memory cache to avoid repeated HTTP calls during a single process run.
 */
let cache: Record<string, any> | null = null;

export async function loadActivityStructure(
  projectCode: string,
  facilityType: 'hospital' | 'health_center',
  opts: { forceRefresh?: boolean } = {}
) {
  if (cache && !opts.forceRefresh) return cache;

  const searchParams = new URLSearchParams({
    projectCode,
    facilityType,
    active: 'true',
  });

  cache = await ky
    .get(`/api/planning-config/activities`, { searchParams })
    .json<Record<string, any>>();

  return cache;
} 