# Document Upload - User Flow

## Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Execution Listing Page                    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Facility  │ Type    │ Period │ Program │ Actions  │    │
│  ├────────────────────────────────────────────────────┤    │
│  │ Hospital A│ Hospital│ FY 2024│ HIV     │    ⋮     │◄───┼─── 1. Click menu
│  │ Clinic B  │ Clinic  │ FY 2024│ TB      │    ⋮     │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ 2. Click "Upload Document"
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Upload Document Dialog                     │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  📁 Drag & drop file here                          │    │
│  │     Or click to browse (max 10MB)                  │    │
│  │                                                     │    │
│  │     [Browse files]                                 │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Document Name (optional)                                   │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Enter document name...                             │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Document Type *                                            │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Select document type ▼                             │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Description (optional)                                     │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Enter description...                               │    │
│  │                                                     │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│                          [Cancel]  [Upload]                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ 3. Select file
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   File Selected State                        │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ 📄 invoice.pdf                                     │    │
│  │ 2.5 MB                                             │ ✕  │
│  │ ▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░ 50%                         │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Document Name                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ invoice.pdf                                        │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Document Type *                                            │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Invoice                                            │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Description                                                │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Q1 2024 Invoice for medical supplies              │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│                          [Cancel]  [Upload]                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ 4. Click Upload
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Uploading State                           │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ 📄 invoice.pdf                                     │    │
│  │ 2.5 MB                                             │    │
│  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░ 90%                         │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│                          [Cancel]  [Uploading...]           │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ 5. Upload complete
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Success Notification                      │
│                                                              │
│  ✅ Document uploaded successfully                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ 6. Dialog closes
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Back to Execution Listing Page                  │
│                                                              │
│  (Document is now attached to the execution entry)          │
└─────────────────────────────────────────────────────────────┘
```

## Step-by-Step User Journey

### Step 1: Navigate to Execution Listing
- User is on the execution listing page
- Sees a table with all execution entries
- Each row has an actions menu (⋮)

### Step 2: Open Upload Dialog
- User clicks the actions menu (⋮) on desired row
- Dropdown menu appears with options:
  - View Details
  - Edit
  - **Upload Document** ← User clicks this
  - Delete
- Upload dialog opens as a modal

### Step 3: Select File
**Option A: Drag & Drop**
- User drags a file from their computer
- Drops it into the dropzone area
- File is automatically added

**Option B: Browse**
- User clicks "Browse files" button
- File picker dialog opens
- User selects a file
- File is added to the upload area

### Step 4: Fill Form Fields
**Required:**
- Document Type: User selects from dropdown
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

**Optional:**
- Document Name: Auto-filled with filename, can be changed
- Description: User can add notes about the document

### Step 5: Validate
**Client-side validation:**
- File size must be ≤ 10MB
- Document type must be selected
- File must be present

**If validation fails:**
- Error toast appears
- User sees specific error message
- Form remains open for correction

### Step 6: Upload
- User clicks "Upload" button
- Button changes to "Uploading..." and is disabled
- Progress bar shows upload progress
- File preview shows percentage

### Step 7: Success
- Upload completes successfully
- Success toast appears: "Document uploaded successfully"
- Dialog automatically closes
- User returns to execution listing
- Document is now attached to the execution entry

### Step 8: Error Handling (if upload fails)
- Error toast appears with specific message
- Dialog remains open
- User can retry or cancel
- Common errors:
  - Network error
  - File too large
  - Invalid file type
  - Server error

## User Interactions

### Mouse/Trackpad
- Click actions menu
- Click "Upload Document"
- Click "Browse files"
- Click file to select
- Click "Upload" button
- Click "Cancel" to close

### Keyboard
- Tab to navigate between fields
- Enter to submit form
- Escape to close dialog
- Arrow keys in dropdown menus

### Touch (Mobile/Tablet)
- Tap actions menu
- Tap "Upload Document"
- Tap "Browse files"
- Tap to select file
- Tap "Upload" button
- Swipe to dismiss dialog

## Accessibility Features

### Screen Reader Support
- All form fields have labels
- Upload progress announced
- Success/error messages announced
- Dialog has proper ARIA attributes

### Keyboard Navigation
- Full keyboard support
- Focus management
- Tab order is logical
- Escape closes dialog

### Visual Indicators
- Clear focus states
- High contrast text
- Loading indicators
- Progress bars
- Status icons

## Mobile Responsiveness

### Small Screens (< 640px)
- Dialog takes full width
- Stacked form layout
- Touch-friendly buttons
- Larger tap targets

### Medium Screens (640px - 1024px)
- Dialog is centered
- Optimal form width
- Comfortable spacing

### Large Screens (> 1024px)
- Dialog is centered
- Maximum width constraint
- Plenty of whitespace

## Performance Considerations

### File Upload
- Chunked upload for large files
- Progress tracking
- Cancellation support
- Retry on failure

### UI Updates
- Optimistic updates
- Query invalidation
- Cache management
- Real-time feedback

## Security Features

### Client-side
- File type validation
- File size validation
- Input sanitization
- XSS prevention

### Server-side
- File type verification
- Virus scanning (if implemented)
- Access control
- Rate limiting

## Error States

### File Too Large
```
❌ File size exceeds 10MB limit
"invoice.pdf" has been rejected
```

### Invalid File Type
```
❌ File type not accepted
"document.exe" has been rejected
```

### Network Error
```
❌ Failed to upload document
Network error. Please check your connection and try again.
```

### Server Error
```
❌ Failed to upload document
An unexpected error occurred. Please try again.
```

### Missing Required Field
```
❌ Please select a document type
```

## Success State

```
✅ Document uploaded successfully
```

## Tips for Users

1. **Prepare your file first** - Make sure it's the right file and under 10MB
2. **Choose the correct document type** - This helps with organization
3. **Add a description** - Future you will thank you
4. **Check the file name** - Rename if needed for clarity
5. **Wait for confirmation** - Don't close the dialog until you see success
6. **Check your upload** - Verify the document appears in the list

## Common Questions

**Q: Can I upload multiple files at once?**
A: Currently, only one file per upload. You can upload multiple times.

**Q: What happens if I close the dialog during upload?**
A: The upload will be cancelled. You'll need to start over.

**Q: Can I edit the document after uploading?**
A: You can edit the metadata (name, description) but not the file itself.

**Q: How do I delete a document?**
A: Contact an administrator or use the document management interface.

**Q: What file types are supported?**
A: PDF, Word, Excel, Images (JPEG, PNG), CSV, and text files.

**Q: Is there a limit on how many documents I can upload?**
A: No limit on number of documents, but each must be under 10MB.
