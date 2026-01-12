# Integration Examples

## Example 1: Add Documents Section to Execution Details Page

```typescript
// apps/client/app/dashboard/execution/details/[id]/page.tsx

import { ExecutionDocumentsList } from "../../_components/execution-documents-list";
import { UploadDocumentDialog } from "../../_components/upload-document-dialog";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { useState } from "react";

export default function ExecutionDetailsPage({ params }: { params: { id: string } }) {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const executionId = parseInt(params.id);

  return (
    <div className="space-y-6">
      {/* Existing execution details */}
      <div>
        {/* ... execution form/details ... */}
      </div>

      {/* Documents Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Attached Documents</h2>
          <Button onClick={() => setUploadDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Upload Document
          </Button>
        </div>

        <ExecutionDocumentsList executionEntryId={executionId} />

        <UploadDocumentDialog
          open={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
          executionEntryId={executionId}
        />
      </div>
    </div>
  );
}
```

## Example 2: Custom Upload Button Component

```typescript
// apps/client/components/upload-document-button.tsx

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { UploadDocumentDialog } from "@/app/dashboard/execution/_components/upload-document-dialog";

interface UploadDocumentButtonProps {
  executionEntryId: number;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
}

export function UploadDocumentButton({
  executionEntryId,
  variant = "default",
  size = "default",
  className,
}: UploadDocumentButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
      >
        <Upload className="mr-2 h-4 w-4" />
        Upload Document
      </Button>

      <UploadDocumentDialog
        open={open}
        onOpenChange={setOpen}
        executionEntryId={executionEntryId}
      />
    </>
  );
}
```

## Example 3: Document Count Badge

```typescript
// apps/client/components/document-count-badge.tsx

"use client";

import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import { useGetExecutionDocuments } from "@/hooks/queries/documents";

interface DocumentCountBadgeProps {
  executionEntryId: number;
}

export function DocumentCountBadge({ executionEntryId }: DocumentCountBadgeProps) {
  const { data, isLoading } = useGetExecutionDocuments({
    executionEntryId,
  });

  if (isLoading) {
    return (
      <Badge variant="outline" className="gap-1">
        <FileText className="h-3 w-3" />
        <span>...</span>
      </Badge>
    );
  }

  const count = data?.documents?.length || 0;

  if (count === 0) {
    return null;
  }

  return (
    <Badge variant="secondary" className="gap-1">
      <FileText className="h-3 w-3" />
      <span>{count}</span>
    </Badge>
  );
}
```

## Example 4: Add Document Count to Table Column

```typescript
// In execution-table-columns.tsx

{
  id: "documents",
  header: "Documents",
  cell: ({ row }) => {
    const execution = row.original;
    return <DocumentCountBadge executionEntryId={execution.id} />;
  },
  enableSorting: false,
  enableColumnFilter: false,
}
```

## Example 5: Programmatic Upload

```typescript
// apps/client/components/bulk-document-upload.tsx

"use client";

import { useUploadDocument } from "@/hooks/mutations/documents";
import { toast } from "sonner";

export function BulkDocumentUpload() {
  const uploadMutation = useUploadDocument();

  const handleBulkUpload = async (files: File[], executionEntryId: number) => {
    const results = await Promise.allSettled(
      files.map((file) =>
        uploadMutation.mutateAsync({
          file,
          documentName: file.name,
          documentType: "supporting_document",
          executionEntryId: executionEntryId.toString(),
        })
      )
    );

    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    toast.success(`Uploaded ${successful} documents`, {
      description: failed > 0 ? `${failed} failed` : undefined,
    });
  };

  return (
    <input
      type="file"
      multiple
      onChange={(e) => {
        const files = Array.from(e.target.files || []);
        handleBulkUpload(files, 123); // Replace with actual ID
      }}
    />
  );
}
```

## Example 6: Document Upload with Custom Validation

```typescript
"use client";

import { useUploadDocument } from "@/hooks/mutations/documents";
import { toast } from "sonner";

export function CustomValidationUpload() {
  const uploadMutation = useUploadDocument({
    onSuccess: (data) => {
      console.log("Upload successful:", data);
    },
    onError: (error) => {
      console.error("Upload failed:", error);
    },
  });

  const handleUpload = async (file: File, executionEntryId: number) => {
    // Custom validation
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type", {
        description: "Only PDF and images are allowed",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large", {
        description: "Maximum file size is 5MB",
      });
      return;
    }

    // Proceed with upload
    await uploadMutation.mutateAsync({
      file,
      documentName: file.name,
      documentType: "invoice",
      executionEntryId: executionEntryId.toString(),
      description: `Uploaded on ${new Date().toLocaleDateString()}`,
    });
  };

  return null; // Your UI here
}
```

## Example 7: Document Upload Progress Tracker

```typescript
"use client";

import { useState } from "react";
import { Progress } from "@/components/ui/progress";
import { useUploadDocument } from "@/hooks/mutations/documents";

export function UploadProgressTracker() {
  const [progress, setProgress] = useState(0);
  const uploadMutation = useUploadDocument();

  const handleUploadWithProgress = async (file: File, executionEntryId: number) => {
    setProgress(0);

    // Simulate progress (in real scenario, you'd get this from the upload)
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    try {
      await uploadMutation.mutateAsync({
        file,
        documentName: file.name,
        documentType: "receipt",
        executionEntryId: executionEntryId.toString(),
      });

      clearInterval(interval);
      setProgress(100);
    } catch (error) {
      clearInterval(interval);
      setProgress(0);
    }
  };

  return (
    <div className="space-y-2">
      <Progress value={progress} />
      <p className="text-sm text-muted-foreground">{progress}% uploaded</p>
    </div>
  );
}
```

## Example 8: Conditional Upload Button

```typescript
// Show upload button only for certain roles or statuses

"use client";

import { useUser } from "@/components/providers/session-provider";
import { UploadDocumentButton } from "@/components/upload-document-button";

interface ConditionalUploadProps {
  executionEntryId: number;
  executionStatus: string;
}

export function ConditionalUpload({
  executionEntryId,
  executionStatus,
}: ConditionalUploadProps) {
  const user = useUser();

  // Only show for admin or accountant roles
  const canUpload = user?.role === "admin" || user?.role === "accountant";

  // Don't show if execution is approved
  const isEditable = executionStatus !== "approved";

  if (!canUpload || !isEditable) {
    return null;
  }

  return <UploadDocumentButton executionEntryId={executionEntryId} />;
}
```

## Example 9: Document Upload with Metadata

```typescript
"use client";

import { useUploadDocument } from "@/hooks/mutations/documents";

export function UploadWithMetadata() {
  const uploadMutation = useUploadDocument();

  const handleUpload = async (file: File, executionEntryId: number) => {
    const metadata = {
      uploadedBy: "John Doe",
      department: "Finance",
      fiscalYear: "2024",
      quarter: "Q1",
      tags: ["important", "reviewed"],
    };

    await uploadMutation.mutateAsync({
      file,
      documentName: file.name,
      documentType: "cash_book",
      executionEntryId: executionEntryId.toString(),
      description: "Q1 Cash Book with reconciliation",
      metadata: JSON.stringify(metadata),
    });
  };

  return null; // Your UI here
}
```

## Example 10: Refetch Documents After Upload

```typescript
"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useUploadDocument } from "@/hooks/mutations/documents";

export function UploadWithRefetch() {
  const queryClient = useQueryClient();
  const uploadMutation = useUploadDocument({
    onSuccess: (data, variables) => {
      // Manually refetch documents
      queryClient.invalidateQueries({
        queryKey: ["documents", "execution", variables.executionEntryId],
      });

      // Or refetch all execution-related queries
      queryClient.invalidateQueries({
        queryKey: ["execution"],
      });
    },
  });

  return null; // Your UI here
}
```

## Tips

1. **Always validate files** before uploading
2. **Show progress indicators** for better UX
3. **Handle errors gracefully** with user-friendly messages
4. **Invalidate queries** after successful upload
5. **Use TypeScript** for type safety
6. **Test with different file types** and sizes
7. **Consider mobile users** - make UI responsive
8. **Add loading states** during upload
9. **Provide feedback** with toast notifications
10. **Document your code** for future maintainers
