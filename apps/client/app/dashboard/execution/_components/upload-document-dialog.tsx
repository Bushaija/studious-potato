"use client";

import * as React from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemMetadata,
  FileUploadItemPreview,
  FileUploadList,
  FileUploadTrigger,
} from "@/components/ui/file-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUploadDocument } from "@/hooks/mutations/documents/use-upload-document";
import { toast } from "sonner";

interface UploadDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  executionEntryId: number;
}

const DOCUMENT_TYPES = [
  { value: "cash_book", label: "Cash Book" },
  { value: "bank_statement", label: "Bank Statement" },
  { value: "vat_report", label: "VAT Report" },
  { value: "invoice", label: "Invoice" },
  { value: "receipt", label: "Receipt" },
  { value: "purchase_order", label: "Purchase Order" },
  { value: "payment_voucher", label: "Payment Voucher" },
  { value: "journal_entry", label: "Journal Entry" },
  { value: "ledger", label: "Ledger" },
  { value: "trial_balance", label: "Trial Balance" },
  { value: "supporting_document", label: "Supporting Document" },
  { value: "other", label: "Other" },
] as const;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function UploadDocumentDialog({
  open,
  onOpenChange,
  executionEntryId,
}: UploadDocumentDialogProps) {
  const [files, setFiles] = React.useState<File[]>([]);
  const [documentName, setDocumentName] = React.useState("");
  const [documentType, setDocumentType] = React.useState<string>("");
  const [description, setDescription] = React.useState("");
  const [isUploading, setIsUploading] = React.useState(false);

  const uploadMutation = useUploadDocument({
    onSuccess: () => {
      handleClose();
    },
  });

  const handleClose = () => {
    setFiles([]);
    setDocumentName("");
    setDocumentType("");
    setDescription("");
    setIsUploading(false);
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (files.length === 0) {
      toast.error("Please select a file to upload");
      return;
    }

    if (!documentType) {
      toast.error("Please select a document type");
      return;
    }

    setIsUploading(true);

    try {
      const file = files[0];
      
      await uploadMutation.mutateAsync({
        file,
        documentName: documentName || file.name,
        documentType: documentType as any,
        executionEntryId: executionEntryId.toString(),
        description: description || undefined,
      });

      handleClose();
    } catch (error) {
      // Error is already handled by the mutation hook
      console.error("Upload error:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const onFileReject = React.useCallback((file: File, message: string) => {
    toast.error(message, {
      description: `"${file.name.length > 20 ? `${file.name.slice(0, 20)}...` : file.name}" has been rejected`,
    });
  }, []);

  const onFileValidate = React.useCallback((file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      return "File size exceeds 10MB limit";
    }
    return null;
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Attach a document to this execution entry. Maximum file size is 10MB.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <FileUpload
            value={files}
            onValueChange={setFiles}
            onFileReject={onFileReject}
            onFileValidate={onFileValidate}
            maxFiles={1}
            maxSize={MAX_FILE_SIZE}
            className="w-full"
          >
            <FileUploadDropzone>
              <div className="flex flex-col items-center gap-1 text-center">
                <div className="flex items-center justify-center rounded-full border p-2.5">
                  <Upload className="size-6 text-muted-foreground" />
                </div>
                <p className="font-medium text-sm">Drag & drop file here</p>
                <p className="text-muted-foreground text-xs">
                  Or click to browse (max 10MB)
                </p>
              </div>
              <FileUploadTrigger asChild>
                <Button variant="outline" size="sm" className="mt-2 w-fit">
                  Browse files
                </Button>
              </FileUploadTrigger>
            </FileUploadDropzone>

            <FileUploadList>
              {files.map((file, index) => (
                <FileUploadItem key={index} value={file} className="flex-col">
                  <div className="flex w-full items-center gap-2">
                    <FileUploadItemPreview />
                    <FileUploadItemMetadata />
                    <FileUploadItemDelete asChild>
                      <Button variant="ghost" size="icon" className="size-7">
                        <X />
                      </Button>
                    </FileUploadItemDelete>
                  </div>
                </FileUploadItem>
              ))}
            </FileUploadList>
          </FileUpload>

          <div className="space-y-2">
            <Label htmlFor="documentName">Document Name</Label>
            <Input
              id="documentName"
              placeholder="Enter document name (optional)"
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="documentType">
              Document Type <span className="text-destructive">*</span>
            </Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger id="documentType">
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Enter description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isUploading || files.length === 0 || !documentType}>
            {isUploading ? "Uploading..." : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
