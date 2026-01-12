import { useCallback, useMemo, useState } from "react";

import { useGetFacilitiesFilter } from "./use-get-facilities-filters";
import { useGetFacilityById } from "./use-get-facility-by-id";
import { useUser } from "@/components/providers/session-provider";
import type { Program, Facility, FacilityType, FacilityFilterState, CreatePlanArgs } from "@/types/facility";

interface UseFacilityFilterProps {
    programs: Program[];
    facilities: Facility[];
    getFacilityTypes: (program?: string) => FacilityType[];
    isAvailableForPlanning?: (facilityName: string, program: string) => boolean;
};

export const useFacilityFilter = ({ 
    programs,
    facilities,
    getFacilityTypes,
    isAvailableForPlanning,
}: UseFacilityFilterProps) => {
    const user = useUser();
    const [filterState, setFilterState] = useState<FacilityFilterState>({
        selectedProgram: '',
        selectedFacility: '',
        selectedFacilityType: '',
    });

    // Fetch facility data to get districtId
    const { data: facilityData } = useGetFacilityById(
        user?.facilityId, 
        Boolean(user?.facilityId)
    );

    console.log("facility fetched by id", facilityData)

    const userContext = useMemo(() => ({
        facilityId: user?.facilityId ? String(user.facilityId) : undefined,
        districtId: facilityData?.districtId ? String(facilityData.districtId) : undefined,
    }), [user?.facilityId, facilityData?.districtId]);

    const selectedProgramEnum = useMemo(() => {
        const found = programs.find((p) => p.id === filterState.selectedProgram)
        return found?.projectType ?? found?.name ?? ""
    }, [programs, filterState.selectedProgram]);

    // ENHANCED: Get available facility types based on selected program with TB rule
    const availableFacilityTypes = useMemo(() => {
        console.log('🏥 [availableFacilityTypes] Selected program:', filterState.selectedProgram);
        
        // Rule 3: Only hospitals support TB services
        if (filterState.selectedProgram === 'TB') {
            console.log('🏥 TB program selected - only showing hospitals');
            return [{ id: 'hospital', label: 'Hospital' }];
        }

        // For other programs or no selection, use the original function
        const result = getFacilityTypes(filterState.selectedProgram || undefined);
        console.log('🏥 [availableFacilityTypes] Result:', result);
        return result;
    }, [getFacilityTypes, filterState.selectedProgram]);

    const shouldFetchFacilities = Boolean(selectedProgramEnum);

    console.log("user context:: ", userContext)
    console.log("selectedProgramEnum:: ", selectedProgramEnum)

    const {
        data: facilitiesData,
        isLoading: isLoadingFacilities
    } = useGetFacilitiesFilter(
        shouldFetchFacilities ?
        {
            projectType: selectedProgramEnum as any,
            districtId: userContext.districtId
        }
        : {} as any
    );

    console.log("facilities data::x ", facilitiesData);

    const serverFacilities = useMemo<Facility[]>(() => {
        const items = facilitiesData?.data.facilities ?? []
        const mapped = items.map((f: any): Facility => ({
            id: String(f.id),
            name: f.name,
            type: String(f.facilityType) // Fix: use facilityType from API response
        }))
        console.log('🔄 [serverFacilities] Mapped facilities:', mapped);
        return mapped;
    }, [facilitiesData]);

    // ENHANCED: Apply all filtering rules properly
    const filteredFacilities = useMemo(() => {
        const source = serverFacilities.length > 0 ? serverFacilities : facilities
        console.log('🔍 [filteredFacilities] Source facilities:', source);
        console.log('🔍 [filteredFacilities] Selected program:', filterState.selectedProgram);
        console.log('🔍 [filteredFacilities] Selected facility type:', filterState.selectedFacilityType);
        
        let filtered = [...source];

        // Rule 3: For TB program, only show hospitals (this should be applied first)
        if (filterState.selectedProgram === 'TB') {
            console.log('🚫 [filteredFacilities] Filtering for TB - only hospitals');
            filtered = filtered.filter(facility => facility.type === 'hospital');
            console.log('🔍 [filteredFacilities] After TB filtering:', filtered);
        }

        // Rule 1: Filter by facility type if selected
        if (filterState.selectedFacilityType) {
            console.log('🏥 [filteredFacilities] Filtering by facility type:', filterState.selectedFacilityType);
            filtered = filtered.filter(facility => facility.type === filterState.selectedFacilityType);
            console.log('🔍 [filteredFacilities] After type filtering:', filtered);
        }
        
        // Rule 2: Filter out facilities that are already planned for the selected program
        if (filterState.selectedProgram && isAvailableForPlanning) {
            console.log('📋 [filteredFacilities] Filtering out already planned facilities for program:', selectedProgramEnum);
            filtered = filtered.filter(facility => {
                const isAvailable = isAvailableForPlanning(facility.name, selectedProgramEnum);
                console.log(`📋 Facility ${facility.name} available for ${selectedProgramEnum}:`, isAvailable);
                return isAvailable;
            });
            console.log('🔍 [filteredFacilities] After availability filtering:', filtered);
        }

        // Sort facilities alphabetically
        const sorted = filtered.sort((a, b) => a.name.localeCompare(b.name));
        console.log('🔍 [filteredFacilities] Final sorted result:', sorted);
        
        return sorted;
    }, [
        facilities,
        serverFacilities,
        filterState.selectedProgram,
        filterState.selectedFacilityType,
        selectedProgramEnum,
        isAvailableForPlanning
    ]);

    const updateProgram = useCallback((programId: string) => {
        console.log('🔄 [updateProgram] Updating program to:', programId);
        
        const newFacilityTypes = getFacilityTypes(programId)
        const shouldResetType = !newFacilityTypes.find(type => 
          type.id === filterState.selectedFacilityType
        )

        setFilterState(prev => {
            const newState: FacilityFilterState = {
                selectedProgram: programId,
                selectedFacilityType: shouldResetType ? '' : prev.selectedFacilityType,
                selectedFacility: '',
            };

            // ENHANCED: For TB program, automatically select hospital type
            if (programId === 'TB') {
                console.log('🏥 [updateProgram] TB selected - auto-selecting hospital');
                newState.selectedFacilityType = 'hospital';
            }

            console.log('🔄 [updateProgram] New state:', newState);
            return newState;
        });
    }, [getFacilityTypes, filterState.selectedFacilityType]);

    const updateFacilityType = useCallback((typeId: string) => {
        console.log('🏥 [updateFacilityType] Updating facility type to:', typeId);
        setFilterState(prev => ({
          ...prev,
          selectedFacilityType: typeId,
          selectedFacility: '', // Reset facility when type changes
        }))
    }, []);
    
    const updateFacility = useCallback((facilityId: string) => {
        console.log('🏢 [updateFacility] Updating facility to:', facilityId);
        setFilterState(prev => ({
          ...prev,
          selectedFacility: facilityId,
        }))
    }, []);

    const resetFilter = useCallback(() => {
        console.log('🔄 [resetFilter] Resetting all filters');
        setFilterState({
          selectedProgram: '',
          selectedFacilityType: '',
          selectedFacility: '',
        })
    }, []);

    const isValid = Boolean(
        filterState.selectedFacility && 
        filterState.selectedFacilityType && 
        filterState.selectedProgram
    );

    const buildCreatePlanArgs = useCallback((): CreatePlanArgs | null => {
        if (!isValid) return null

        const source = serverFacilities.length > 0 ? serverFacilities : facilities
        const facilityObj = source.find((f) => f.id === filterState.selectedFacility)

        // Use the numeric project ID directly
        const actualProjectId = filterState.selectedProgram

        return {
            facilityId: filterState.selectedFacility,
            facilityType: filterState.selectedFacilityType,
            projectId: actualProjectId,
            program: selectedProgramEnum,
            facilityName: facilityObj?.name,
        }
    }, [
        isValid,
        serverFacilities,
        facilities,
        filterState,
        selectedProgramEnum,
        programs
    ]);

    // ENHANCED: Get selected program name for display
    const selectedProgramName = useMemo(() => {
        const program = programs.find(p => p.id === filterState.selectedProgram)
        return program?.name || selectedProgramEnum
    }, [programs, filterState.selectedProgram, selectedProgramEnum]);

    // ENHANCED: Get selected facility name for display
    const selectedFacilityName = useMemo(() => {
        const source = serverFacilities.length > 0 ? serverFacilities : facilities
        const facility = source.find(f => f.id === filterState.selectedFacility)
        return facility?.name || ''
    }, [serverFacilities, facilities, filterState.selectedFacility]);

    return {
        // State
        filterState,
        availableFacilityTypes,
        filteredFacilities,
        isLoadingFacilities,
        isValid,
        selectedProgramName,
        selectedFacilityName,
        
        // Actions
        updateProgram,
        updateFacilityType,
        updateFacility,
        resetFilter,
        buildCreatePlanArgs,
    }
}