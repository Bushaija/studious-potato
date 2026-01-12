interface ProgramFilterProps {
  filter: ProgramFilter;
  onFilterChange: (updates: Partial<ProgramFilter>) => void;
  isLoading?: boolean;
}

const ProgramFilterComponent: React.FC<ProgramFilterProps> = ({ 
  filter, 
  onFilterChange, 
  isLoading = false 
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Filter Health Facilities</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="program">Program</Label>
            <Select
              value={filter.program}
              onValueChange={(value: ProgramFilter['program']) => 
                onFilterChange({ program: value })
              }
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select program" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HIV">HIV</SelectItem>
                <SelectItem value="TB">TB</SelectItem>
                <SelectItem value="Malaria">Malaria</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="facilityType">Facility Type</Label>
            <Select
              value={filter.facilityType}
              onValueChange={(value: ProgramFilter['facilityType']) => 
                onFilterChange({ facilityType: value })
              }
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select facility type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hospital">Hospital</SelectItem>
                <SelectItem value="health_center">Health Center</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Badge variant="outline">{filter.program}</Badge>
          <Badge variant="outline">
            {filter.facilityType === 'health_center' ? 'Health Center' : 'Hospital'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};
