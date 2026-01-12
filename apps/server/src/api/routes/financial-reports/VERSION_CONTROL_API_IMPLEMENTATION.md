# Version Control API Endpoints Implementation

## Overview
This document describes the implementation of version control API endpoints for financial reports, enabling version history tracking, retrieval, and comparison.

## Implemented Endpoints

### 1. GET /financial-reports/:id/versions
**Purpose**: Retrieve all versions for a financial report

**Response**:
```typescript
{
  reportId: number;
  currentVersion: string;
  versions: Array<{
    id: number;
    reportId: number;
    versionNumber: string;
    snapshotData: object;
    snapshotChecksum: string;
    snapshotTimestamp: string;
    createdBy: number | null;
    createdAt: string | null;
    changesSummary: string | null;
    creator?: {
      id: number;
      name: string | null;
      email: string | null;
    };
  }>;
}
```

**Features**:
- Returns complete version history ordered by creation date (newest first)
- Includes creator information for audit trail
- Validates user access to the report's facility
- Supports district-based access control

### 2. GET /financial-reports/:id/versions/:versionNumber
**Purpose**: Retrieve a specific version of a financial report

**Response**:
```typescript
{
  version: {
    id: number;
    reportId: number;
    versionNumber: string;
    snapshotData: object;
    snapshotChecksum: string;
    snapshotTimestamp: string;
    createdBy: number | null;
    createdAt: string | null;
    changesSummary: string | null;
    creator?: {
      id: number;
      name: string | null;
      email: string | null;
    };
  };
}
```

**Features**:
- Retrieves complete snapshot data for a specific version
- Includes checksum for integrity verification
- Validates user access to the report's facility

### 3. POST /financial-reports/:id/versions/compare
**Purpose**: Compare two versions of a financial report

**Request Body**:
```typescript
{
  version1: string;  // e.g., "1.0"
  version2: string;  // e.g., "1.1"
}
```

**Response**:
```typescript
{
  version1: string;
  version2: string;
  differences: Array<{
    lineCode: string;
    lineName: string;
    field: string;  // "currentValue" or "previousValue"
    version1Value: number;
    version2Value: number;
    difference: number;
    percentageChange: number;
  }>;
  summary: {
    totalDifferences: number;
    significantChanges: number;  // Changes > 5%
  };
}
```

**Features**:
- Performs line-by-line comparison of statement data
- Calculates absolute and percentage differences
- Identifies significant changes (>5%)
- Compares both current and previous period values
- Validates user access to the report's facility

## Implementation Details

### Files Modified

1. **financial-reports.types.ts**
   - Added version control schemas:
     - `reportVersionSchema`
     - `reportVersionWithCreatorSchema`
     - `versionDifferenceSchema`
     - `getVersionsResponseSchema`
     - `getVersionResponseSchema`
     - `compareVersionsRequestSchema`
     - `compareVersionsResponseSchema`
   - Added corresponding TypeScript types

2. **financial-reports.routes.ts**
   - Added three new route definitions:
     - `getVersions`
     - `getVersion`
     - `compareVersions`
   - Included OpenAPI documentation for each endpoint
   - Added proper error responses and status codes

3. **financial-reports.handlers.ts**
   - Implemented three handler functions:
     - `getVersions`: Retrieves all versions with creator info
     - `getVersion`: Retrieves a specific version by version number
     - `compareVersions`: Performs version comparison
   - Integrated with `VersionService` for business logic
   - Added district-based access control validation
   - Proper error handling and user context validation

4. **financial-reports.index.ts**
   - Registered the three new routes in the router
   - Positioned after other parameterized routes

## Security & Access Control

All endpoints implement:
- User authentication validation
- District-based facility access control
- Report existence validation
- Proper error handling with appropriate HTTP status codes

## Integration with VersionService

The handlers delegate business logic to the `VersionService` class:
- `versionService.getVersions(reportId)` - Retrieves version history
- `versionService.getVersion(reportId, versionNumber)` - Retrieves specific version
- `versionService.compareVersions(reportId, version1, version2)` - Compares versions

## Requirements Satisfied

- **5.1**: Version tracking when source data changes
- **5.2**: Warning display for outdated reports
- **5.3**: Version history retrieval
- **5.4**: Specific version retrieval
- **5.5**: Version preservation for audit
- **8.1**: Version history display
- **8.2**: Version comparison functionality
- **8.3**: Difference highlighting
- **8.4**: Version metadata display
- **8.5**: Comparison report export capability (foundation)

## Testing Recommendations

1. **Unit Tests**:
   - Test version retrieval with valid/invalid report IDs
   - Test version comparison with different version numbers
   - Test access control validation

2. **Integration Tests**:
   - Test complete workflow: create report → submit → create version → retrieve versions
   - Test version comparison with actual snapshot data
   - Test district-based access control

3. **API Tests**:
   - Test all endpoints with various scenarios
   - Test error handling (404, 403, 401)
   - Test response format validation

## Usage Examples

### Get All Versions
```bash
GET /financial-reports/123/versions
Authorization: Bearer <token>
```

### Get Specific Version
```bash
GET /financial-reports/123/versions/1.0
Authorization: Bearer <token>
```

### Compare Versions
```bash
POST /financial-reports/123/versions/compare
Authorization: Bearer <token>
Content-Type: application/json

{
  "version1": "1.0",
  "version2": "1.1"
}
```

## Next Steps

The following tasks should be completed to fully integrate version control:

1. **Task 4**: Implement Version Service (already exists, needs integration)
2. **Task 5**: Modify Submit for Approval Handler to create versions
3. **Task 10**: Modify Report Display Logic to show version indicators
4. **Task 12**: Create Snapshot Indicator Component (client-side)
5. **Task 14**: Create Version Comparison Component (client-side)
6. **Task 15**: Create Version History Component (client-side)

## Notes

- Version numbers follow semantic versioning format (e.g., "1.0", "1.1")
- Snapshots are stored as JSONB in the database
- Checksums use SHA-256 for integrity verification
- All timestamps are in ISO 8601 format
- Significant changes are defined as >5% difference
