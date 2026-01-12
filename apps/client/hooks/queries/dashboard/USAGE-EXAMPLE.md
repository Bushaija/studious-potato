# Dashboard Hooks Usage Examples

## Facility Overview Hook

### Basic Usage (All Accessible Facilities)
```tsx
import { useGetFacilityOverview } from "@/hooks/queries/dashboard/use-get-facility-overview";

function DashboardOverview() {
  const { data, isLoading, error } = useGetFacilityOverview();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h2>{data.facility.name}</h2>
      <p>Budget Utilization: {data.budgetSummary.utilizationPercentage}%</p>
      <p>Total Allocated: ${data.budgetSummary.totalAllocated}</p>
      <p>Total Spent: ${data.budgetSummary.totalSpent}</p>
      
      <h3>Projects</h3>
      {data.projectBreakdown.map(project => (
        <div key={project.projectId}>
          <h4>{project.projectName} ({project.projectCode})</h4>
          <p>Utilization: {project.utilizationPercentage}%</p>
        </div>
      ))}
    </div>
  );
}
```

### Filtered by Specific Facility
```tsx
import { useGetFacilityOverview } from "@/hooks/queries/dashboard/use-get-facility-overview";

function FacilitySpecificOverview({ facilityId }: { facilityId: number }) {
  const { data, isLoading } = useGetFacilityOverview({ facilityId });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h2>{data.facility.name}</h2>
      {/* ... rest of component */}
    </div>
  );
}
```

## Tasks Hook

### Basic Usage (All Accessible Facilities)
```tsx
import { useGetTasks } from "@/hooks/queries/dashboard/use-get-tasks";

function TasksDashboard() {
  const { data, isLoading, error } = useGetTasks();

  if (isLoading) return <div>Loading tasks...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h2>My Tasks</h2>
      
      <section>
        <h3>Pending Plans ({data.pendingPlans.length})</h3>
        {data.pendingPlans.map(plan => (
          <div key={plan.projectId}>
            <p>{plan.projectName} - Due: {new Date(plan.deadline).toLocaleDateString()}</p>
          </div>
        ))}
      </section>

      <section>
        <h3>Pending Executions ({data.pendingExecutions.length})</h3>
        {data.pendingExecutions.map(exec => (
          <div key={`${exec.projectId}-${exec.quarter}`}>
            <p>{exec.projectName} - Q{exec.quarter}</p>
          </div>
        ))}
      </section>

      <section>
        <h3>Upcoming Deadlines</h3>
        {data.upcomingDeadlines.map(deadline => (
          <div key={deadline.reportingPeriodId}>
            <p>FY {deadline.year} - {deadline.daysRemaining} days remaining</p>
          </div>
        ))}
      </section>
    </div>
  );
}
```

### Filtered by Specific Facility
```tsx
import { useGetTasks } from "@/hooks/queries/dashboard/use-get-tasks";

function FacilityTasks({ facilityId }: { facilityId: number }) {
  const { data, isLoading } = useGetTasks({ facilityId });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Tasks for Facility {facilityId}</h2>
      <p>Pending Plans: {data.pendingPlans.length}</p>
      <p>Pending Executions: {data.pendingExecutions.length}</p>
    </div>
  );
}
```

## Combined Dashboard Example

```tsx
import { useGetFacilityOverview } from "@/hooks/queries/dashboard/use-get-facility-overview";
import { useGetTasks } from "@/hooks/queries/dashboard/use-get-tasks";
import { useState } from "react";

function AccountantDashboard() {
  const [selectedFacilityId, setSelectedFacilityId] = useState<number | undefined>();

  const { data: overview, isLoading: overviewLoading } = useGetFacilityOverview({ 
    facilityId: selectedFacilityId 
  });
  
  const { data: tasks, isLoading: tasksLoading } = useGetTasks({ 
    facilityId: selectedFacilityId 
  });

  if (overviewLoading || tasksLoading) {
    return <div>Loading dashboard...</div>;
  }

  return (
    <div className="dashboard">
      {/* Facility Selector for Hospital Accountants */}
      <select 
        value={selectedFacilityId || ''} 
        onChange={(e) => setSelectedFacilityId(e.target.value ? Number(e.target.value) : undefined)}
      >
        <option value="">All Facilities (District View)</option>
        {/* Add facility options here */}
      </select>

      {/* Budget Overview Section */}
      <section className="budget-overview">
        <h2>{overview.facility.name}</h2>
        <div className="stats">
          <div>Total Allocated: ${overview.budgetSummary.totalAllocated}</div>
          <div>Total Spent: ${overview.budgetSummary.totalSpent}</div>
          <div>Utilization: {overview.budgetSummary.utilizationPercentage}%</div>
        </div>
      </section>

      {/* Tasks Section */}
      <section className="tasks">
        <h2>My Tasks</h2>
        <div className="task-counts">
          <div>Pending Plans: {tasks.pendingPlans.length}</div>
          <div>Pending Executions: {tasks.pendingExecutions.length}</div>
          <div>Corrections Needed: {tasks.correctionsRequired.length}</div>
        </div>
      </section>
    </div>
  );
}
```

## Access Control Notes

### For Hospital Accountants:
- Without `facilityId`: See aggregated data for their hospital + all health centers in district
- With `facilityId`: See data for specific facility (if they have access)

### For Health Center Accountants:
- Can only see their own facility data
- Attempting to access other facilities returns 403 error

## Query Key Structure

The hooks use the following query keys for caching:

```typescript
// Facility Overview
["dashboard", "facility-overview", facilityId]

// Tasks
["dashboard", "tasks", facilityId]
```

This allows for:
- Automatic cache invalidation when facility changes
- Separate caching for different facilities
- Easy manual invalidation if needed

## Manual Cache Invalidation

```tsx
import { useQueryClient } from "@tanstack/react-query";

function SomeComponent() {
  const queryClient = useQueryClient();

  const refreshDashboard = () => {
    // Invalidate all dashboard queries
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    
    // Or invalidate specific queries
    queryClient.invalidateQueries({ queryKey: ["dashboard", "facility-overview"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard", "tasks"] });
  };

  return <button onClick={refreshDashboard}>Refresh Dashboard</button>;
}
```
