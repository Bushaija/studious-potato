# Document Management Feature - Complete Guide

## Overview

A comprehensive document management system integrated into the execution listing table, allowing users to:
- View document counts at a glance
- Upload documents
- View all attached documents
- Preview/download documents
- Track missing document types

## Features Implemented

### 1. Documents Column in Execution Table
**Location:** New column between "Activities Count" and "Actions"

**Features:**
- Badge showing document count
- Color-coded based on count:
  - **Outline (Gray)**: 0 documents
  - **Secondary (Blue)**: 1-3 documents  
  - **Default (Primary)**: 4+ documents (well documented)
- Clickable to open documents sheet
- Real-time count updates

### 2. View Documents Action
**Location:** Actions dropdown menu

**Features:**
- New "View Documents" menu item
- Opens sheet panel with full document list
- Positioned above "Upload Document" for better UX flow

### 3. Documents Sheet Panel
**Location:** Slides in from right side

**Features:**
- **Header**: Shows facility name and document count
- **Upload Button**: Quick access to upload new documents
- **Missing Types Indicator**: Shows which document types haven't been uploaded yet
- **Document List**: Scrollable list of all attached documents
- **Empty State**: Helpful message when no documents exist

**Each Document Shows:**
- Document name
- Document type badge (color-coded)
- File size
- Upload date
- Uploader name
- Description (if provided)
- Preview button
- Download button

### 4. Document Type Tracking
**12 Document Types:**
1. Cash Book
2. Bank Statement
3. VAT Report
4. Invoice
5. Receipt
6. Purchase Order
7. Payment Voucher
8. Journal Entry
9. Ledger
10. Trial Balance
11. Supporting Document
12. Other

**Missing Types Display:**
- Shows badges for document types not yet uploaded
- Helps users track what's missing
- Only visible when there are missing types

## User Flows

### Flow 1: View Documents from Table
```
1. User sees document count badge in table
2. Clicks on badge
3. Sheet opens showing all documents
4. User can preview/download documents
5. User can upload new documents
6. Sheet closes
```

### Flow 2: View Documents from Actions Menu
```
1. User clicks actions menu (⋮)
2. Selects "View Documents"
3. Sheet opens showing all documents
4. User can preview/download documents
5. User can upload new documents
6. Sheet closes
```

### Flow 3: Upload from Documents Sheet
```
1. User opens documents sheet
2. Clicks "Upload New Document" button
3. Upload dialog opens
4. User uploads document
5. Sheet refreshes with new document
6. Document count badge updates
```

### Flow 4: Preview/Download Document
```
1. User opens documents sheet
2. Finds desired document
3. Clicks "Preview" or "Download"
4. Document opens in new tab
5. User can view/save document
```

## Components Created

### 1. ExecutionDocumentsSheet
**File:** `apps/client/app/dashboard/execution/_components/execution-documents-sheet.tsx`

**Props:**
```typescript
interface ExecutionDocumentsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  executionEntryId: number;
  facilityName?: string;
}
```

**Features:**
- Full-width sheet on mobile, 600px on desktop
- Scrollable document list
- Loading states with skeletons
- Empty state with call-to-action
- Missing document types indicator
- Integrated upload dialog

### 2. DocumentCountBadge
**File:** `apps/client/app/dashboard/execution/_components/document-count-badge.tsx`

**Props:**
```typescript
interface DocumentCountBadgeProps {
  executionEntryId: number;
  onClick?: () => void;
}
```

**Features:**
- Shows document count
- Color-coded by count
- Clickable
- Loading state
- Icon + number display

### 3. Updated ExecutionTableColumns
**File:** `apps/client/app/dashboard/execution/_components/execution-table-columns.tsx`

**Changes:**
- Added "Documents" column
- Added "View Documents" action
- Integrated DocumentCountBadge
- Integrated ExecutionDocumentsSheet
- Updated imports

## Visual Design

### Documents Column
```
┌──────────────┐
│  Documents   │
├──────────────┤
│   📄 0       │  ← Gray outline badge
│   📄 2       │  ← Blue secondary badge
│   📄 5       │  ← Primary badge
└──────────────┘
```

### Actions Menu
```
┌─────────────────────┐
│ 👁 View Details     │
│ ✏️ Edit             │
├─────────────────────┤
│ 📄 View Documents   │  ← New
│ ⬆️ Upload Document  │
├─────────────────────┤
│ 🗑️ Delete           │
└─────────────────────┘
```

### Documents Sheet
```
┌────────────────────────────────────────┐
│ Attached Documents                  ✕  │
│ Hospital A - 3 documents attached      │
├────────────────────────────────────────┤
│                                        │
│  [⬆️ Upload New Document]              │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │ Missing Document Types           │ │
│  │ Cash Book  VAT Report  Ledger    │ │
│  └──────────────────────────────────┘ │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │ 📄 invoice.pdf          [Invoice]│ │
│  │ 2.5 MB • Jan 7, 2026             │ │
│  │ John Doe                         │ │
│  │ Q1 2024 Invoice                  │ │
│  │ [👁 Preview] [⬇️ Download]       │ │
│  └──────────────────────────────────┘ │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │ 📄 receipt.pdf         [Receipt] │ │
│  │ 1.2 MB • Jan 5, 2026             │ │
│  │ Jane Smith                       │ │
│  │ [👁 Preview] [⬇️ Download]       │ │
│  └──────────────────────────────────┘ │
│                                        │
└────────────────────────────────────────┘
```

## Technical Implementation

### Data Flow
```
ExecutionTable
    ↓
DocumentCountBadge
    ↓ (fetches count)
useGetExecutionDocuments
    ↓
API: /documents/execution-entry/:id
    ↓
Returns: { documents: [...], executionEntry: {...} }
```

### State Management
- React Query for data fetching
- Local state for sheet/dialog open/close
- Automatic cache invalidation on upload
- Real-time updates

### Performance Optimizations
- Lazy loading: Documents only fetched when sheet opens
- Skeleton loading states
- Efficient re-renders with React.memo
- Query caching with React Query

## API Endpoints Used

### 1. Get Execution Documents
```
GET /documents/execution-entry/:executionEntryId
```

**Response:**
```json
{
  "documents": [
    {
      "id": 1,
      "documentName": "invoice.pdf",
      "documentType": "invoice",
      "fileSize": 2621440,
      "uploadedAt": "2026-01-07T10:30:00Z",
      "description": "Q1 2024 Invoice",
      "uploader": {
        "id": 1,
        "name": "John Doe",
        "email": "john@example.com"
      }
    }
  ],
  "executionEntry": {
    "id": 123,
    "facilityId": 1,
    "projectId": 1,
    "reportingPeriodId": 1
  }
}
```

### 2. Download Document
```
GET /documents/:id/download
```

**Response:** Binary file stream

## Usage Examples

### Example 1: Add Documents Column to Custom Table
```typescript
import { DocumentCountBadge } from "@/app/dashboard/execution/_components/document-count-badge";
import { ExecutionDocumentsSheet } from "@/app/dashboard/execution/_components/execution-documents-sheet";

{
  id: "documents",
  header: "Documents",
  cell: ({ row }) => {
    const [open, setOpen] = useState(false);
    
    return (
      <>
        <DocumentCountBadge
          executionEntryId={row.original.id}
          onClick={() => setOpen(true)}
        />
        
        <ExecutionDocumentsSheet
          open={open}
          onOpenChange={setOpen}
          executionEntryId={row.original.id}
          facilityName={row.original.facility?.name}
        />
      </>
    );
  },
}
```

### Example 2: Standalone Documents Sheet
```typescript
import { ExecutionDocumentsSheet } from "@/app/dashboard/execution/_components/execution-documents-sheet";

function MyComponent() {
  const [open, setOpen] = useState(false);
  
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        View Documents
      </Button>
      
      <ExecutionDocumentsSheet
        open={open}
        onOpenChange={setOpen}
        executionEntryId={123}
        facilityName="Hospital A"
      />
    </>
  );
}
```

### Example 3: Document Count Badge Only
```typescript
import { DocumentCountBadge } from "@/app/dashboard/execution/_components/document-count-badge";

function MyComponent() {
  return (
    <div>
      <span>Documents: </span>
      <DocumentCountBadge executionEntryId={123} />
    </div>
  );
}
```

## Accessibility

### Keyboard Navigation
- Tab through all interactive elements
- Enter/Space to activate buttons
- Escape to close sheet
- Arrow keys in scrollable areas

### Screen Readers
- Proper ARIA labels
- Semantic HTML
- Descriptive button text
- Status announcements

### Visual
- High contrast colors
- Clear focus indicators
- Readable font sizes
- Icon + text labels

## Responsive Design

### Mobile (< 640px)
- Full-width sheet
- Stacked document cards
- Touch-friendly buttons
- Larger tap targets

### Tablet (640px - 1024px)
- 600px sheet width
- Optimized spacing
- Comfortable touch targets

### Desktop (> 1024px)
- 600px sheet width
- Hover states
- Keyboard shortcuts
- Mouse interactions

## Testing Checklist

### Functional Testing
- [ ] Document count displays correctly
- [ ] Badge color changes based on count
- [ ] Clicking badge opens sheet
- [ ] "View Documents" action opens sheet
- [ ] Upload button works in sheet
- [ ] Preview button opens document
- [ ] Download button downloads document
- [ ] Missing types indicator shows correctly
- [ ] Empty state displays when no documents
- [ ] Loading states show during fetch

### Integration Testing
- [ ] Upload updates count immediately
- [ ] Sheet refreshes after upload
- [ ] Multiple sheets can be opened
- [ ] Sheet closes properly
- [ ] Query cache updates correctly

### UI/UX Testing
- [ ] Smooth animations
- [ ] Proper spacing
- [ ] Readable text
- [ ] Clear icons
- [ ] Intuitive navigation
- [ ] Helpful empty states

### Performance Testing
- [ ] Fast initial load
- [ ] Smooth scrolling
- [ ] No memory leaks
- [ ] Efficient re-renders
- [ ] Quick sheet open/close

## Future Enhancements

### Short-term
- [ ] Document search/filter in sheet
- [ ] Sort documents by date/type/name
- [ ] Bulk document download
- [ ] Document preview modal (PDF viewer)
- [ ] Document edit metadata

### Medium-term
- [ ] Document verification workflow
- [ ] Document comments/notes
- [ ] Document version history
- [ ] Document sharing
- [ ] Document templates

### Long-term
- [ ] OCR for document text extraction
- [ ] AI-powered document categorization
- [ ] Document comparison
- [ ] Document analytics
- [ ] Document archiving

## Troubleshooting

### Issue: Document count not updating
**Solution:** Check query invalidation in upload mutation

### Issue: Sheet not opening
**Solution:** Check state management and open prop

### Issue: Documents not loading
**Solution:** Check API endpoint and executionEntryId

### Issue: Preview/download not working
**Solution:** Check NEXT_PUBLIC_BACKEND_URL environment variable

### Issue: Missing types not showing
**Solution:** Check document type mapping and uploaded types

## Summary

This feature provides a complete document management solution with:
- ✅ Visual document count in table
- ✅ Easy access to view documents
- ✅ Quick upload functionality
- ✅ Document type tracking
- ✅ Preview/download capabilities
- ✅ Responsive design
- ✅ Accessible interface
- ✅ Real-time updates

The implementation follows best practices for React, TypeScript, and shadcn/ui components, ensuring maintainability and scalability.
