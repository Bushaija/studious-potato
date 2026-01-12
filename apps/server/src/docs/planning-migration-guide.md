# Planning Module Migration Guide

This guide shows you how to migrate from hardcoded planning constants to the new centralized, scalable planning system.

## 🎯 Migration Overview

### Before (Old System)
- ❌ Hardcoded constants in multiple files
- ❌ Manual synchronization required for changes  
- ❌ No version control or audit trail
- ❌ Limited flexibility for new programs

### After (New System)
- ✅ Database-driven, dynamic configuration
- ✅ Real-time updates without deployments
- ✅ Complete version history and rollback
- ✅ Template system for activity reuse
- ✅ Admin interface for non-technical users

## 🔄 Step-by-Step Migration

### Step 1: Replace Hardcoded Constants with API Calls

#### Before: Using Hardcoded Constants
```typescript
// OLD: features/planning/constants/hiv/hospital-activities.ts
export const HIV_HOSPITAL_ACTIVITIES = {
  "Human Resources": [
    { activity: "Medical Doctor", typeOfActivity: "Medical Doctor" },
    { activity: "Nurse", typeOfActivity: "Nurse" },
    // ... more hardcoded activities
  ],
  "Transport and Communication": [
    { activity: "Transport", typeOfActivity: "Transport" },
    // ... more hardcoded activities
  ],
};

// OLD: Component using hardcoded constants
import { HIV_HOSPITAL_ACTIVITIES } from "@/features/planning/constants/hiv/hospital-activities";

export function PlanningForm() {
  const activities = HIV_HOSPITAL_ACTIVITIES;
  
  return (
    <div>
      {Object.entries(activities).map(([category, categoryActivities]) => (
        <div key={category}>
          <h3>{category}</h3>
          {categoryActivities.map(activity => (
            <div key={activity.activity}>{activity.activity}</div>
          ))}
        </div>
      ))}
    </div>
  );
}
```

#### After: Using Centralized API
```typescript
// NEW: Component using centralized system
import { useLegacyPlanningInterface } from "@/features/planning-config/api/use-planning-activities";

export function PlanningForm() {
  const { activities, isLoading, error } = useLegacyPlanningInterface('HIV', 'hospital');
  
  if (isLoading) return <div>Loading activities...</div>;
  if (error) return <div>Error loading activities</div>;
  
  return (
    <div>
      {Object.entries(activities).map(([category, categoryActivities]) => (
        <div key={category}>
          <h3>{category}</h3>
          {categoryActivities.map(activity => (
            <div key={activity.activity}>{activity.activity}</div>
          ))}
        </div>
      ))}
    </div>
  );
}
```

### Step 2: Update Form Generation

#### Before: Hardcoded Form Generation
```typescript
// OLD: Using hardcoded constants to generate forms
import { HIV_HOSPITAL_ACTIVITIES } from "@/features/planning/constants/hiv/hospital-activities";

export function generateDefaultHIVActivities() {
  const defaultActivities = [];
  
  Object.entries(HIV_HOSPITAL_ACTIVITIES).forEach(([category, activities]) => {
    activities.forEach(activity => {
      defaultActivities.push({
        activityCategory: category,
        typeOfActivity: activity.typeOfActivity,
        activity: activity.activity,
        frequency: 0,
        unitCost: 0,
        // ... other fields
      });
    });
  });
  
  return defaultActivities;
}
```

#### After: Dynamic Form Generation
```typescript
// NEW: Using centralized system for form generation
import { useGenerateDefaultActivities } from "@/features/planning-config/api/use-planning-activities";

export function PlanningFormWithDefaults({ projectCode, facilityType }) {
  const defaultActivities = useGenerateDefaultActivities(projectCode, facilityType);
  
  return (
    <form>
      {defaultActivities.map(activity => (
        <div key={activity.id}>
          <label>{activity.activity}</label>
          <input 
            name={`frequency_${activity.id}`}
            defaultValue={activity.frequency}
            type="number"
          />
          <input 
            name={`unitCost_${activity.id}`}
            defaultValue={activity.unitCost}
            type="number"
          />
        </div>
      ))}
    </form>
  );
}
```

### Step 3: Modernize Planning Components

#### Before: Static Planning Component
```typescript
// OLD: Static component with hardcoded structure
import { TB_HEALTH_CENTER_ACTIVITIES } from "@/features/planning/constants/tb/health-center-activities";

export function TBPlanningComponent() {
  const [activities, setActivities] = useState(() => {
    // Hardcoded initialization
    return Object.entries(TB_HEALTH_CENTER_ACTIVITIES).flatMap(([category, acts]) =>
      acts.map(act => ({
        category,
        activity: act.activity,
        frequency: 0,
        unitCost: 0,
      }))
    );
  });

  return (
    <div>
      <h2>TB Health Center Planning</h2>
      {activities.map((activity, index) => (
        <div key={index}>
          <span>{activity.category}: {activity.activity}</span>
          <input 
            value={activity.frequency}
            onChange={e => {
              const newActivities = [...activities];
              newActivities[index].frequency = Number(e.target.value);
              setActivities(newActivities);
            }}
          />
        </div>
      ))}
    </div>
  );
}
```

#### After: Dynamic Planning Component
```typescript
// NEW: Dynamic component using centralized system
import { useCategorizedActivities } from "@/features/planning-config/api/use-planning-activities";

export function TBPlanningComponent() {
  const { categorizedActivities, isLoading, error } = useCategorizedActivities('TB', 'health_center');
  const [formData, setFormData] = useState({});

  if (isLoading) return <div>Loading TB activities...</div>;
  if (error) return <div>Error: {error.message}</div>;

  const handleActivityChange = (activityId: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [activityId]: {
        ...prev[activityId],
        [field]: value,
      }
    }));
  };

  return (
    <div>
      <h2>TB Health Center Planning</h2>
      {Object.entries(categorizedActivities).map(([categoryName, activities]) => (
        <div key={categoryName}>
          <h3>{categoryName}</h3>
          {activities.map(activity => (
            <div key={activity.id}>
              <span>{activity.name}</span>
              <input 
                type="number"
                placeholder="Frequency"
                value={formData[activity.id]?.frequency || activity.defaultFrequency || 0}
                onChange={e => handleActivityChange(activity.id, 'frequency', Number(e.target.value))}
              />
              <input 
                type="number"
                placeholder="Unit Cost"
                value={formData[activity.id]?.unitCost || activity.defaultUnitCost || 0}
                onChange={e => handleActivityChange(activity.id, 'unitCost', Number(e.target.value))}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
```

### Step 4: Add Activity Search and Filtering

#### New Feature: Enhanced Search Capabilities
```typescript
// NEW: Advanced search component using centralized system
import { useActivitySearch, usePlanningActivities } from "@/features/planning-config/api/use-planning-activities";

export function ActivitySearchComponent({ projectCode, facilityType }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  
  const { data } = usePlanningActivities(projectCode, facilityType);
  const filteredActivities = useActivitySearch(projectCode, facilityType, searchTerm, categoryFilter);
  
  return (
    <div>
      <div className="search-controls">
        <input 
          type="text"
          placeholder="Search activities..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        
        <select 
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
        >
          <option value="">All Categories</option>
          {data?.categories.map(category => (
            <option key={category.id} value={category.code}>
              {category.name}
            </option>
          ))}
        </select>
      </div>
      
      <div className="activity-results">
        {filteredActivities.map(activity => (
          <div key={activity.id} className="activity-card">
            <h4>{activity.name}</h4>
            <p>Category: {data?.categories.find(c => c.id === activity.categoryVersionId)?.name}</p>
            {activity.defaultFrequency && <p>Default Frequency: {activity.defaultFrequency}</p>}
            {activity.defaultUnitCost && <p>Default Cost: ${activity.defaultUnitCost}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Step 5: Template Management Interface

#### New Feature: Activity Template Management
```typescript
// NEW: Template management component
import { useActivityTemplates, useCreateActivityTemplate } from "@/features/planning-config/api/use-planning-activities";

export function TemplateManagementComponent() {
  const { data: templates, isLoading } = useActivityTemplates();
  const createTemplate = useCreateActivityTemplate();
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    categoryType: '',
    tags: [],
  });

  const handleCreateTemplate = async () => {
    try {
      await createTemplate.mutateAsync(newTemplate);
      setNewTemplate({ name: '', description: '', categoryType: '', tags: [] });
    } catch (error) {
      console.error('Failed to create template:', error);
    }
  };

  if (isLoading) return <div>Loading templates...</div>;

  return (
    <div>
      <h2>Activity Templates</h2>
      
      {/* Create New Template */}
      <div className="create-template">
        <h3>Create New Template</h3>
        <input 
          type="text"
          placeholder="Template Name"
          value={newTemplate.name}
          onChange={e => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
        />
        <textarea 
          placeholder="Description"
          value={newTemplate.description}
          onChange={e => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
        />
        <select 
          value={newTemplate.categoryType}
          onChange={e => setNewTemplate(prev => ({ ...prev, categoryType: e.target.value }))}
        >
          <option value="">Select Category Type</option>
          <option value="HR">Human Resources</option>
          <option value="TRC">Transport & Communication</option>
          <option value="PA">Programme Activities</option>
          <option value="HPE">Health Promotion & Education</option>
        </select>
        <button 
          onClick={handleCreateTemplate}
          disabled={!newTemplate.name || !newTemplate.categoryType}
        >
          Create Template
        </button>
      </div>
      
      {/* Existing Templates */}
      <div className="templates-list">
        <h3>Existing Templates</h3>
        {templates?.data.map(template => (
          <div key={template.id} className="template-card">
            <h4>{template.name}</h4>
            <p>{template.description}</p>
            <div className="template-meta">
              <span>Category: {template.categoryType}</span>
              <span>Tags: {template.tags.join(', ')}</span>
              <span>Status: {template.isActive ? 'Active' : 'Inactive'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## 🔧 Migration Utilities

### Backward Compatibility Wrapper
```typescript
// Utility to provide gradual migration path
export function createLegacyCompatibilityWrapper<T>(
  legacyConstants: T,
  projectCode: string,
  facilityType: "hospital" | "health_center"
) {
  return function useLegacyCompatible() {
    const { activities, isLoading, error } = useLegacyPlanningInterface(projectCode, facilityType);
    
    // Return API data if available, otherwise fallback to hardcoded constants
    if (isLoading || error) {
      return { activities: legacyConstants, isLoading, error };
    }
    
    return { activities, isLoading: false, error: null };
  };
}

// Usage example
import { HIV_HOSPITAL_ACTIVITIES } from "./old-constants";

export const useHIVHospitalActivities = createLegacyCompatibilityWrapper(
  HIV_HOSPITAL_ACTIVITIES,
  'HIV',
  'hospital'
);
```

### Data Migration Utility
```typescript
// Utility to help migrate existing data to new format
export async function migrateHardcodedConstants() {
  const migrations = [
    {
      projectCode: 'HIV',
      facilityType: 'hospital' as const,
      constants: HIV_HOSPITAL_ACTIVITIES,
    },
    {
      projectCode: 'TB',
      facilityType: 'health_center' as const,
      constants: TB_HEALTH_CENTER_ACTIVITIES,
    },
    // Add more migrations as needed
  ];

  for (const migration of migrations) {
    try {
      const categories = Object.entries(migration.constants).map(([categoryName, activities], index) => ({
        code: categoryName.replace(/\s+/g, '_').toUpperCase(),
        name: categoryName,
        displayOrder: index + 1,
        activities: activities.map((activity, actIndex) => ({
          name: activity.activity,
          displayOrder: actIndex + 1,
          isTotalRow: false,
        })),
      }));

      await fetch('/api/planning-config/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: 1, // You'll need to map this properly
          facilityType: migration.facilityType,
          categories,
          changeReason: 'Migration from hardcoded constants',
        }),
      });

      console.log(`Migrated ${migration.projectCode} ${migration.facilityType}`);
    } catch (error) {
      console.error(`Failed to migrate ${migration.projectCode} ${migration.facilityType}:`, error);
    }
  }
}
```

## 📋 Migration Checklist

### Phase 1: Preparation
- [ ] Set up new database tables
- [ ] Deploy API endpoints
- [ ] Run data migration scripts
- [ ] Verify API functionality

### Phase 2: Component Migration
- [ ] Identify all components using hardcoded constants
- [ ] Replace with `useLegacyPlanningInterface` for backward compatibility
- [ ] Test existing functionality works unchanged
- [ ] Gradually replace with more specific hooks (`useCategorizedActivities`, `usePlanningActivities`)

### Phase 3: Enhanced Features
- [ ] Add activity search functionality
- [ ] Implement template management
- [ ] Add real-time updates
- [ ] Create admin interfaces

### Phase 4: Cleanup
- [ ] Remove hardcoded constant files
- [ ] Update imports across codebase
- [ ] Remove legacy compatibility wrappers
- [ ] Update documentation

## 🚨 Common Migration Issues

### Issue 1: Component Re-renders
**Problem**: Components re-render unnecessarily when switching to API calls.
**Solution**: Use proper memoization and query caching.

```typescript
// Good: Proper memoization
const activities = useMemo(() => {
  return data?.activities.filter(activity => activity.isActive);
}, [data?.activities]);

// Better: Built-in query caching
const { data } = usePlanningActivities(projectCode, facilityType, {
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

### Issue 2: Loading States
**Problem**: Users see empty forms while data loads.
**Solution**: Implement proper loading states and skeletons.

```typescript
// Good: Proper loading handling
if (isLoading) {
  return <PlanningFormSkeleton />;
}

if (error) {
  return <ErrorBoundary error={error} />;
}

return <PlanningForm activities={activities} />;
```

### Issue 3: Data Structure Mismatch
**Problem**: New API structure doesn't match old constants.
**Solution**: Use compatibility hooks during transition.

```typescript
// Transition approach
const legacyData = useLegacyPlanningInterface(projectCode, facilityType);
// Eventually replace with:
const modernData = useCategorizedActivities(projectCode, facilityType);
```

## 🎉 Benefits After Migration

1. **Dynamic Configuration**: Add new programs without code changes
2. **Version Control**: Track all changes with complete audit trail
3. **Template Reuse**: Share common activities across programs
4. **Real-time Updates**: Changes reflect immediately for all users
5. **Better Scaling**: Support unlimited programs and activities
6. **Admin Interface**: Non-technical users can manage activities
7. **Performance**: Cached API calls with smart invalidation

## 📞 Support

If you encounter issues during migration:
1. Check the API endpoints are working: `/api/planning-config/activities`
2. Verify database migration completed successfully
3. Test with legacy compatibility hooks first
4. Use browser DevTools to debug API calls
5. Check the console for detailed error messages

This migration will transform your planning module from a static, hardcoded system into a flexible, scalable, and maintainable solution that can easily adapt to changing business requirements. 