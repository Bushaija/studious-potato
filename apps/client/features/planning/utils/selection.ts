export interface ProgramOption {
  id: string;
  name: string;
}

export interface FacilityOption {
  id: string;
  name: string;
  type: string;
}

export interface FacilityTypeOption {
  id: string;
  label: string;
}

export function normalizePrograms(projectsData: any): ProgramOption[] {
  const items = Array.isArray(projectsData?.data)
    ? projectsData.data
    : Array.isArray(projectsData)
    ? projectsData
    : [];
  return items.map((p: any) => ({
    id: String(p.id ?? p.code ?? p.slug ?? p.projectType ?? p.name),
    name: String(p.projectType ?? p.name ?? p.code ?? p.slug ?? p.id),
  }));
}

export function normalizeFacilities(facilitiesData: any): FacilityOption[] {
  const items = Array.isArray(facilitiesData?.data)
    ? facilitiesData.data
    : Array.isArray(facilitiesData)
    ? facilitiesData
    : [];
  return items.map((f: any) => ({
    id: String(f.id),
    name: String(f.name ?? f.facilityName ?? f.id),
    type: String(f.facilityType ?? f.type ?? ""),
  }));
}

export function deriveFacilityTypes(facilities: FacilityOption[]): FacilityTypeOption[] {
  const set = new Set<string>();
  for (const f of facilities) if (f.type) set.add(f.type);
  return Array.from(set).map((t) => ({
    id: t,
    label: t.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()),
  }));
}

export function filterFacilitiesByType(
  facilities: FacilityOption[],
  typeId?: string
): FacilityOption[] {
  if (!typeId) return facilities;
  return facilities.filter((f) => f.type === typeId);
}

