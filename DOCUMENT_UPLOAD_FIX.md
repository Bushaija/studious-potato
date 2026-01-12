# Document Upload Fix - Zod Validation Error

## Problem

When uploading a document, a Zod validation error was occurring:

```json
{
  "success": false,
  "error": {
    "name": "ZodError",
    "issues": [
      {
        "code": "custom",
        "path": ["file"],
        "message": "Input not instance of File"
      },
      {
        "expected": "string",
        "code": "invalid_type",
        "path": ["documentName"],
        "message": "Invalid input: expected string, received undefined"
      },
      {
        "code": "invalid_value",
        "path": ["documentType"],
        "message": "Invalid option: expected one of ..."
      },
      {
        "expected": "string",
        "code": "invalid_type",
        "path": ["executionEntryId"],
        "message": "Invalid input: expected string, received undefined"
      }
    ]
  }
}
```

## Root Cause

The issue was caused by two problems:

1. **Incorrect Hono Client Usage**: The Hono client doesn't properly handle multipart/form-data uploads. Using `client.documents.$post({ form: formData })` doesn't correctly serialize the FormData object.

2. **Upload Timing**: The upload was being triggered inside the FileUpload component's `onUpload` callback, which was causing the form data to not be properly populated at the time of submission.

## Solution

### 1. Use Native Fetch for Multipart Upload

Changed from using the Hono client to using native `fetch` for multipart/form-data uploads:

**Before:**
```typescript
const response = await (client as any).documents.$post({
  form: formData,
});
```

**After:**
```typescript
const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/documents`, {
  method: "POST",
  body: formData,
  credentials: "include",
});
```

This ensures the FormData is sent correctly with proper multipart boundaries.

### 2. Simplified Upload Flow

Removed the `onUpload` callback from the FileUpload component and moved the upload logic directly to the submit button handler:

**Before:**
```typescript
<FileUpload
  onUpload={onUpload}  // ❌ Upload triggered by component
  ...
/>
```

**After:**
```typescript
<FileUpload
  // ✅ No onUpload callback
  ...
/>

// Upload triggered by submit button
const handleSubmit = async () => {
  await uploadMutation.mutateAsync({
    file,
    documentName: documentName || file.name,
    documentType: documentType as any,
    executionEntryId: executionEntryId.toString(),
    description: description || undefined,
  });
};
```

### 3. Removed Progress Bar from File Item

Since we're not using the FileUpload component's built-in upload mechanism, we removed the progress bar from individual file items:

**Before:**
```typescript
<FileUploadItem>
  <div>...</div>
  <FileUploadItemProgress />  // ❌ Not needed
</FileUploadItem>
```

**After:**
```typescript
<FileUploadItem>
  <div>...</div>
  // ✅ No progress bar
</FileUploadItem>
```

## Files Modified

1. **`apps/client/fetchers/documents/upload-document.ts`**
   - Changed from Hono client to native fetch
   - Properly constructs FormData
   - Includes credentials for authentication

2. **`apps/client/app/dashboard/execution/_components/upload-document-dialog.tsx`**
   - Removed `onUpload` callback
   - Simplified `handleSubmit` to directly call mutation
   - Removed progress bar from file items
   - Better error handling

## Testing

After these changes, test the following:

1. ✅ Upload a document with all fields filled
2. ✅ Upload a document with only required fields (file + document type)
3. ✅ Verify file is correctly sent to server
4. ✅ Verify document name defaults to filename if not provided
5. ✅ Verify executionEntryId is correctly sent
6. ✅ Verify document type is correctly sent
7. ✅ Verify optional fields (description, metadata) work
8. ✅ Verify success toast appears
9. ✅ Verify document appears in the list

## Why This Works

### Native Fetch vs Hono Client

The Hono client is designed for JSON payloads and doesn't properly handle multipart/form-data. When you pass a FormData object to the Hono client, it tries to serialize it as JSON, which loses the file binary data and form field structure.

Native `fetch` with FormData:
- ✅ Automatically sets correct `Content-Type: multipart/form-data` header
- ✅ Properly encodes file binary data
- ✅ Maintains form field boundaries
- ✅ Preserves file metadata (name, type, size)

### Direct Upload vs Component Callback

By moving the upload logic to the submit button:
- ✅ All form fields are guaranteed to be populated
- ✅ Validation happens before upload
- ✅ Better control over upload timing
- ✅ Simpler error handling
- ✅ More predictable behavior

## Environment Variables

Ensure `NEXT_PUBLIC_BACKEND_URL` is set in your `.env` file:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:9999/api
```

This is used to construct the full API endpoint URL for the fetch request.

## Additional Notes

### Authentication

The `credentials: "include"` option ensures cookies are sent with the request, which is necessary for authentication:

```typescript
fetch(url, {
  credentials: "include",  // ✅ Sends cookies
})
```

### FormData Construction

The FormData is constructed correctly with all required fields:

```typescript
const formData = new FormData();
formData.append("file", data.file);                    // File object
formData.append("documentName", data.documentName);    // String
formData.append("documentType", data.documentType);    // Enum string
formData.append("executionEntryId", data.executionEntryId); // String
```

### Type Safety

The TypeScript types remain the same and provide full type safety:

```typescript
export interface UploadDocumentRequest {
  file: File;
  documentName: string;
  documentType: 'cash_book' | 'bank_statement' | ...;
  executionEntryId: string;
  description?: string;
  metadata?: string;
}
```

## Future Improvements

If you want to add upload progress in the future, you can use XMLHttpRequest or a library like axios:

```typescript
const xhr = new XMLHttpRequest();

xhr.upload.addEventListener("progress", (e) => {
  if (e.lengthComputable) {
    const percentComplete = (e.loaded / e.total) * 100;
    setUploadProgress(percentComplete);
  }
});

xhr.open("POST", url);
xhr.send(formData);
```

## Summary

The fix involved:
1. ✅ Using native fetch instead of Hono client for multipart uploads
2. ✅ Simplifying the upload flow by removing component callbacks
3. ✅ Ensuring all form data is properly populated before upload
4. ✅ Maintaining authentication with credentials

The document upload feature should now work correctly without Zod validation errors.
