# Quick Start: Document Upload Feature

## For Users

### How to Upload a Document

1. Go to the **Execution Listing** page
2. Find the execution entry you want to attach a document to
3. Click the **three-dot menu (⋮)** on the right side of the row
4. Select **"Upload Document"**
5. In the dialog that opens:
   - **Drag & drop** a file OR click **"Browse files"**
   - Enter a **document name** (optional - defaults to filename)
   - Select a **document type** (required)
   - Add a **description** (optional)
6. Click **"Upload"**
7. Wait for the upload to complete
8. You'll see a success message when done!

### File Requirements
- **Maximum size:** 10MB
- **Supported formats:** PDF, Word, Excel, Images (JPEG, PNG), CSV, Text files

## For Developers

### Quick Integration

#### 1. Upload a Document
```typescript
import { useUploadDocument } from "@/hooks/mutations/documents";

const uploadMutation = useUploadDocument({
  onSuccess: (data) => {
    console.log("Uploaded:", data);
  },
});

// Upload
uploadMutation.mutate({
  file: selectedFile,
  documentName: "My Document",
  documentType: "invoice",
  executionEntryId: "123",
  description: "Optional description",
});
```

#### 2. Fetch Documents
```typescript
import { useGetExecutionDocuments } from "@/hooks/queries/documents";

const { data, isLoading } = useGetExecutionDocuments({
  executionEntryId: 123,
});

const documents = data?.documents || [];
```

#### 3. Display Documents List
```typescript
import { ExecutionDocumentsList } from "@/app/dashboard/execution/_components/execution-documents-list";

<ExecutionDocumentsList executionEntryId={123} />
```

### Available Document Types
```typescript
type DocumentType = 
  | 'cash_book'
  | 'bank_statement'
  | 'vat_report'
  | 'invoice'
  | 'receipt'
  | 'purchase_order'
  | 'payment_voucher'
  | 'journal_entry'
  | 'ledger'
  | 'trial_balance'
  | 'supporting_document'
  | 'other';
```

### File Structure
```
apps/client/
├── fetchers/documents/          # API calls
├── hooks/
│   ├── mutations/documents/     # Upload hook
│   └── queries/documents/       # Fetch hook
└── app/dashboard/execution/
    └── _components/
        ├── upload-document-dialog.tsx      # Upload UI
        ├── execution-documents-list.tsx    # Display UI
        └── execution-table-columns.tsx     # Integration
```

### Key Features
✅ Drag & drop upload
✅ File validation (size, type)
✅ Upload progress
✅ Toast notifications
✅ Type-safe API
✅ Automatic cache invalidation
✅ Responsive design

### Testing
```bash
# Run type checking
npm run type-check

# Run linting
npm run lint

# Start dev server
npm run dev
```

### Troubleshooting

**Upload fails:**
- Check file size (max 10MB)
- Verify document type is selected
- Check network connection
- Check browser console for errors

**Documents don't appear:**
- Verify executionEntryId is correct
- Check if query is enabled
- Refresh the page
- Check API endpoint is accessible

**TypeScript errors:**
- Run `npm install` to ensure all dependencies are installed
- Check import paths are correct
- Verify types are exported properly

### Need Help?
- See `DOCUMENT_UPLOAD_README.md` for detailed documentation
- See `DOCUMENT_UPLOAD_INTEGRATION_SUMMARY.md` for implementation details
- Check server-side routes in `apps/server/src/api/routes/documents/`
