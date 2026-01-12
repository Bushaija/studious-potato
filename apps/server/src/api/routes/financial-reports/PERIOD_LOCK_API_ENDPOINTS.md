# Period Lock API Endpoints

This document describes the three new API endpoints for managing period locks in the financial reporting system.

## Endpoints

### 1. GET /period-locks

Retrieves all period locks for a specific facility.

**Query Parameters:**
- `facilityId` (required): The facility ID to retrieve locks for

**Response:**
```json
{
  "locks": [
    {
      "id": 1,
      "reportingPeriodId": 5,
      "projectId": 2,
      "facilityId": 10,
      "isLocked": true,
      "lockedBy": 123,
      "lockedAt": "2025-10-15T10:30:00Z",
      "lockedReason": "Report fully approved",
      "unlockedBy": null,
      "unlockedAt": null,
      "unlockedReason": null,
      "reportingPeriod": {
        "id": 5,
        "year": 2025,
        "periodType": "quarterly",
        "startDate": "2025-07-01",
        "endDate": "2025-09-30"
      },
      "project": {
        "id": 2,
        "name": "HIV Prevention Program",
        "code": "HIV-001",
        "projectType": "HIV"
      },
      "facility": {
        "id": 10,
        "name": "Central Health Center",
        "facilityType": "health_center"
      },
      "lockedByUser": {
        "id": 123,
        "name": "John Doe",
        "email": "john.doe@example.com"
      }
    }
  ]
}
```

**Requirements Addressed:** 6.5, 7.1, 7.2, 7.3, 7.4, 9.1, 9.2

---

### 2. POST /period-locks/:id/unlock

Unlocks a reporting period. Requires admin or superadmin role.

**URL Parameters:**
- `id` (required): The period lock ID to unlock

**Request Body:**
```json
{
  "reason": "Correction needed for accounting error"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Period unlocked successfully",
  "periodLock": {
    "id": 1,
    "reportingPeriodId": 5,
    "projectId": 2,
    "facilityId": 10,
    "isLocked": false,
    "lockedBy": 123,
    "lockedAt": "2025-10-15T10:30:00Z",
    "lockedReason": "Report fully approved",
    "unlockedBy": 456,
    "unlockedAt": "2025-10-20T14:15:00Z",
    "unlockedReason": "Correction needed for accounting error",
    "reportingPeriod": { ... },
    "project": { ... },
    "facility": { ... },
    "lockedByUser": { ... },
    "unlockedByUser": {
      "id": 456,
      "name": "Admin User",
      "email": "admin@example.com"
    }
  }
}
```

**Error Responses:**
- `400 Bad Request`: Missing or empty reason
- `403 Forbidden`: User does not have admin permission
- `404 Not Found`: Period lock not found

**Requirements Addressed:** 6.5, 7.1, 7.2, 7.3, 7.4, 9.1, 9.2, 9.3, 9.4, 9.5

---

### 3. GET /period-locks/audit/:id

Retrieves the complete audit trail for a specific period lock.

**URL Parameters:**
- `id` (required): The period lock ID to retrieve audit logs for

**Response:**
```json
{
  "auditLogs": [
    {
      "id": 3,
      "periodLockId": 1,
      "action": "UNLOCKED",
      "performedBy": 456,
      "performedAt": "2025-10-20T14:15:00Z",
      "reason": "Correction needed for accounting error",
      "metadata": null,
      "performer": {
        "id": 456,
        "name": "Admin User",
        "email": "admin@example.com"
      }
    },
    {
      "id": 2,
      "periodLockId": 1,
      "action": "EDIT_ATTEMPTED",
      "performedBy": 789,
      "performedAt": "2025-10-18T09:45:00Z",
      "reason": "User attempted to edit locked period",
      "metadata": null,
      "performer": {
        "id": 789,
        "name": "Jane Smith",
        "email": "jane.smith@example.com"
      }
    },
    {
      "id": 1,
      "periodLockId": 1,
      "action": "LOCKED",
      "performedBy": 123,
      "performedAt": "2025-10-15T10:30:00Z",
      "reason": "Report fully approved",
      "metadata": null,
      "performer": {
        "id": 123,
        "name": "John Doe",
        "email": "john.doe@example.com"
      }
    }
  ]
}
```

**Action Types:**
- `LOCKED`: Period was locked
- `UNLOCKED`: Period was unlocked by an administrator
- `EDIT_ATTEMPTED`: User attempted to edit data in a locked period

**Requirements Addressed:** 9.1, 9.2, 9.3, 9.4, 9.5

---

## Access Control

All endpoints require:
1. **Authentication**: User must be logged in
2. **Facility Access**: User must have access to the facility (based on district)
3. **Admin Permission** (unlock only): User must have `admin` or `superadmin` role

## Integration with Period Lock Service

These endpoints use the `PeriodLockService` class located at:
`apps/server/src/lib/services/period-lock-service.ts`

The service provides the following methods:
- `getLocksForFacility(facilityId)`: Retrieve all locks for a facility
- `unlockPeriod(lockId, userId, reason)`: Unlock a period (with permission check)
- `isPeriodLocked(reportingPeriodId, projectId, facilityId)`: Check lock status
- `validateEditOperation(...)`: Validate if an edit is allowed

## Database Schema

The endpoints interact with two tables:

### period_locks
- Stores the current lock status for each period/project/facility combination
- Unique constraint on (reporting_period_id, project_id, facility_id)

### period_lock_audit_log
- Stores all lock-related actions for audit purposes
- Foreign key to period_locks table
- Includes performer (user) information

## Testing

To test these endpoints:

1. **Get Period Locks:**
   ```bash
   curl -X GET "http://localhost:3000/api/period-locks?facilityId=10" \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

2. **Unlock Period:**
   ```bash
   curl -X POST "http://localhost:3000/api/period-locks/1/unlock" \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"reason": "Correction needed"}'
   ```

3. **Get Audit Log:**
   ```bash
   curl -X GET "http://localhost:3000/api/period-locks/audit/1" \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

## Related Tasks

This implementation completes Task 8 from the implementation plan:
- ✅ Create `GET /period-locks` endpoint to list all locks for a facility
- ✅ Create `POST /period-locks/:id/unlock` endpoint for admin unlock
- ✅ Create `GET /period-locks/audit/:id` endpoint to view audit log
- ✅ Add request/response schemas in `financial-reports.types.ts`
- ✅ Add route definitions in `financial-reports.routes.ts`
- ✅ Implement handlers in `financial-reports.handlers.ts`
