import districtsProvincesData from "@/constants/districts-provinces.json";
import facilitiesData from "@/constants/facilities-data.json";

/**
 * Capitalizes the first letter of a string and lowercases the rest.
 * @param s The string to capitalize.
 * @returns The capitalized string.
 */
const capitalize = (s: string) => {
    if (!s) return "";
    const trimmed = s.trim();
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

/**
 * Retrieves a sorted list of all unique provinces from the canonical data source.
 * The list is formatted for use in a dropdown/select component.
 * @returns An array of objects with `value` (lowercase) and `label` (capitalized) for each province.
 */
export function getProvinces(): Array<{ value: string; label: string }> {
  const provinces = [...new Set(districtsProvincesData.map(item => item.province))];
  
  return provinces.sort().map(province => ({
    value: province.toLowerCase(),
    label: capitalize(province),
  }));
}

/**
 * Retrieves a sorted list of districts for a given province from the canonical data source.
 * The list is formatted for use in a dropdown/select component.
 * @param province The name of the province.
 * @returns An array of objects with `value` (lowercase) and `label` (capitalized) for each district.
 */
export function getDistrictsByProvince(province: string): Array<{ value: string; label: string }> {
  if (!province) return [];

  const districts = districtsProvincesData
    .filter(item => item.province.toLowerCase() === province.toLowerCase())
    .map(item => item.district);
  
  const uniqueDistricts = [...new Set(districts)];
  
  return uniqueDistricts.sort().map(district => ({
    value: district.toLowerCase(),
    label: capitalize(district),
  }));
}

/**
 * Retrieves a sorted list of hospitals for a given district within a province.
 * It filters for facilities of type 'hospital' from the facilities data source.
 * The list is formatted for use in a dropdown/select component.
 * @param province The name of the province.
 * @param district The name of the district.
 * @param program Optional program filter (e.g., 'hiv', 'malaria', 'tb').
 * @returns An array of objects with `value` (lowercase) and `label` (capitalized) for each hospital.
 */
export function getHospitalsByDistrict(
  province: string, 
  district: string, 
  program?: string
): Array<{ value: string; label: string }> {
  if (!province || !district) return [];
  
  const provinceLower = province.toLowerCase();
  const districtLower = district.toLowerCase();

  const hospitals = facilitiesData
    .filter(facility => 
      facility.province.toLowerCase() === provinceLower &&
      facility.district.toLowerCase() === districtLower &&
      facility['facility-type'] === 'hospital' &&
      (!program || facility.programs?.includes(program.toLowerCase()))
    )
    .flatMap(facility => facility.hospitals || [])
    .map(hospital => hospital.trim())
    .filter(hospital => hospital.length > 0);

  const uniqueHospitals = [...new Set(hospitals)];

  return uniqueHospitals.sort().map(hospital => ({
    value: hospital.toLowerCase(),
    label: capitalize(hospital),
  }));
}

/**
 * Retrieves a sorted list of health centers for a given hospital.
 * It filters for facilities that have health centers associated with the specified hospital.
 * The list is formatted for use in a dropdown/select component.
 * @param hospital The name of the hospital.
 * @param program Optional program filter (e.g., 'hiv', 'malaria', 'tb').
 * @returns An array of objects with `value` (lowercase) and `label` (capitalized) for each health center.
 */
export function getHealthCentersByHospital(
  hospital: string, 
  program?: string
): Array<{ value: string; label: string, programs: string[] }> {
  if (!hospital) return [];
  
  const hospitalLower = hospital.toLowerCase();

  const healthCenters = facilitiesData
    .filter(facility => 
        facility.hospitals?.some(h => h.toLowerCase().includes(hospitalLower)) &&
        (!program || facility.programs?.includes(program.toLowerCase()))
      )
      .flatMap(facility => facility['health-centers'] || [])
      .map(healthCenter => healthCenter.trim())
      .filter(healthCenter => healthCenter.length > 0);
    
  const uniqueHealthCenters = [...new Set(healthCenters)];

  return uniqueHealthCenters.sort().map((healthCenter) => {
    // Find the facility that contains this health-center to retrieve its programs
    const facilityWithHC = facilitiesData.find((f) =>
      f["health-centers"]?.some((hc: string) => hc.trim().toLowerCase() === healthCenter.toLowerCase())
    );
    return {
      value: healthCenter.toLowerCase(),
      label: capitalize(healthCenter),
      programs: facilityWithHC?.programs ?? [],
    };
  });
}

/**
 * Retrieves all hospitals with optional program filtering.
 * @param program Optional program filter (e.g., 'hiv', 'malaria', 'tb').
 * @returns Array of hospital objects with value and label.
 */
export async function getHospitals(program?: string) {
  // Simulate API call or lazy loading
  const hospitals = facilitiesData
    .filter(facility => 
      facility['facility-type'] === 'hospital' &&
      (!program || facility.programs?.includes(program.toLowerCase()))
    )
    .flatMap(facility => facility.hospitals)
    .filter((hospital, index, self) => self.indexOf(hospital) === index)
    .sort()
    .map(hospital => ({
      value: hospital,
      label: hospital.trim().charAt(0).toUpperCase() + hospital.trim().slice(1)
    }));

  return hospitals;
}

/**
 * Retrieves all unique programs from facilities data.
 * @returns Array of program objects with value and label.
 */
export function getPrograms(): Array<{ value: string; label: string }> {
  const allPrograms = facilitiesData
    .flatMap(facility => facility.programs || [])
    .filter((program, index, self) => self.indexOf(program) === index)
    .sort();

  return allPrograms.map(program => ({
    value: program.toLowerCase(),
    label: capitalize(program),
  }));
}

// For future use with actual API
export async function fetchHospitalsByLocation(province: string, district: string, program?: string) {
  // TODO: Implement actual API call
  const hospitals = await getHospitals(program);
  return hospitals.filter(hospital => 
    hospital.label.toLowerCase().includes(province.toLowerCase()) ||
    hospital.label.toLowerCase().includes(district.toLowerCase())
  );
} 