// lib/planning-availability.ts

interface PlannedFacility {
    facilityId: number
    facilityName: string
    facilityType: string
    projectType: string
    plannedCount: number
  }
  
  interface Facility {
    id: string
    name: string
    type: string
  }
  
  /**
   * Creates an availability checker function that determines if a facility
   * is available for planning for a specific program
   */
  export function createAvailabilityChecker(
    facilities: Facility[],
    plannedFacilities: PlannedFacility[]
  ) {
    // Create a map of planned facilities for quick lookup
    const plannedFacilitiesMap = new Map<string, Set<string>>()
    
    console.log('🏗️ [createAvailabilityChecker] Creating availability checker with:', {
      facilitiesCount: facilities.length,
      plannedFacilitiesCount: plannedFacilities.length,
      plannedFacilities: plannedFacilities
    });
    
    plannedFacilities.forEach(planned => {
      const facilityName = planned.facilityName.toLowerCase().trim()
      const projectType = planned.projectType.toLowerCase().trim()
      
      if (!plannedFacilitiesMap.has(facilityName)) {
        plannedFacilitiesMap.set(facilityName, new Set())
      }
      plannedFacilitiesMap.get(facilityName)!.add(projectType)
      
      console.log(`📋 Mapped planned facility: ${facilityName} -> ${projectType}`);
    })
  
    console.log('📋 Final planned facilities map:', Array.from(plannedFacilitiesMap.entries()));
  
    /**
     * Check if a facility is available for planning for a specific program
     * @param facilityName - Name of the facility
     * @param program - Program type (HIV, TB, Malaria)
     * @returns true if facility is available for planning, false otherwise
     */
    return function isAvailableForPlanning(facilityName: string, program: string): boolean {
      if (!facilityName || !program) {
        console.log('❌ Invalid parameters:', { facilityName, program });
        return false;
      }
  
      const normalizedFacilityName = facilityName.toLowerCase().trim()
      const normalizedProgram = program.toLowerCase().trim()
      
      console.log(`🔍 Checking availability: ${normalizedFacilityName} for ${normalizedProgram}`);
      
      // Check if this specific facility has already been planned for this program
      const plannedPrograms = plannedFacilitiesMap.get(normalizedFacilityName)
      
      if (plannedPrograms && plannedPrograms.has(normalizedProgram)) {
        console.log(`🚫 Facility ${normalizedFacilityName} is already planned for ${normalizedProgram} program, excluding from available list`);
        return false // Already planned for this program
      }
      
      console.log(`✅ Facility ${normalizedFacilityName} is available for ${normalizedProgram} program`);
      return true // Available for planning
    }
  }