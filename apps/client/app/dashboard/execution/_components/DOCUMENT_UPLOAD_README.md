# Document Upload Integration

This document describes the document upload feature integrated into the execution listing table.

## Overview

Users can now upload documents directly from the execution listing table by clicking the "Upload Document" action in the row actions menu.

## Components

### 1. Upload Document Dialog (`upload-document-dialog.tsx`)
A modal dialog that allows users to:
- Upload a single file (max 10MB)
- Specify document name (optional, defaults to filename)
- Select document type (required)
- Add description (optional)
- Add metadata (optional)

**Supported Document Types:**
- Cash Book
- Bank Statement
- VAT Report
- Invoice
- Receipt
- Purchase Order
- Payment Voucher
- Journal Entry
- Ledger
- Trial Balance
- Supporting Document
- Other

**File Upload Features:**
- Drag & drop support
- File preview
- Upload progress indicator
- File validation (size, type)
- Error handling with toast notifications

### 2. Execution Table Columns (`execution-table-columns.tsx`)
Updated to include:
- "Upload Document" action in the dropdown menu
- Integration with the upload dialog
- Upload icon from lucide-react

## API Integration

### Fetchers
**Location:** `apps/client/fetchers/documents/`

- `upload-document.ts` - Handles document upload to the server
- `get-execution-documents.ts` - Fetches documents for an execution entry

### Hooks

**Mutations:** `apps/client/hooks/mutations/documents/`
- `use-upload-document.ts` - React Query mutation hook for uploading documents

**Queries:** `apps/client/hooks/queries/documents/`
- `use-get-execution-documents.ts` - React Query hook for fetching execution documents

## Usage

### Upload a Document
1. Navigate to the execution listing page
2. Click the three-dot menu (⋮) on any execution row
3. Select "Upload Document"
4. In the dialog:
   - Drag & drop a file or click "Browse files"
   - Enter document name (optional)
   - Select document type (required)
   - Add description (optional)
5. Click "Upload"

### Fetch Documents for an Execution
```typescript
import { useGetExecutionDocuments } from "@/hooks/queries/documents";

const { data, isLoading } = useGetExecutionDocuments({
  executionEntryId: 123,
});

// Access documents
const documents = data?.documents;
```

## API Endpoint

**POST** `/documents`

**Request Body (multipart/form-data):**
- `file` - File to upload (required)
- `documentName` - Display name (required)
- `documentType` - Document category (required)
- `executionEntryId` - Execution entry ID (required)
- `description` - Optional description
- `metadata` - Optional JSON metadata

**Response:**
Returns the created document with all relations (uploader, verifier, execution entry, etc.)

## File Validation

- **Max file size:** 10MB
- **Allowed types:** PDF, Word, Excel, images (JPEG, PNG), CSV, text files
- Validation happens both client-side and server-side

## Error Handling

- File size validation
- File type validation
- Network errors
- Server errors
- All errors display user-friendly toast notifications

## Future Enhancements

Potential improvements:
- Multiple file upload
- Document preview before upload
- Document list view in execution details
- Document download functionality
- Document verification workflow
- Document deletion with soft delete
