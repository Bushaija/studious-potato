"use client";

import * as React from "react";
import { FileText, Download, Upload, Eye, Calendar, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useGetExecutionDocuments } from "@/hooks/queries/documents";
import { UploadDocumentDialog } from "./upload-document-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBytes } from "@/lib/utils";
import { format } from "date-fns";

interface ExecutionDocumentsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  executionEntryId: number;
  facilityName?: string;
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  cash_book: "Cash Book",
  bank_statement: "Bank Statement",
  vat_report: "VAT Report",
  invoice: "Invoice",
  receipt: "Receipt",
  purchase_order: "Purchase Order",
  payment_voucher: "Payment Voucher",
  journal_entry: "Journal Entry",
  ledger: "Ledger",
  trial_balance: "Trial Balance",
  supporting_document: "Supporting Document",
  other: "Other",
};

const DOCUMENT_TYPE_COLORS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  cash_book: "default",
  bank_statement: "secondary",
  vat_report: "outline",
  invoice: "default",
  receipt: "secondary",
  purchase_order: "outline",
  payment_voucher: "default",
  journal_entry: "secondary",
  ledger: "outline",
  trial_balance: "default",
  supporting_document: "secondary",
  other: "outline",
};

export function ExecutionDocumentsSheet({
  open,
  onOpenChange,
  executionEntryId,
  facilityName,
}: ExecutionDocumentsSheetProps) {
  const [uploadDialogOpen, setUploadDialogOpen] = React.useState(false);
  const { data, isLoading } = useGetExecutionDocuments({
    executionEntryId,
    enabled: open,
  });

  const documents = data?.documents || [];

  // Get document types that have been uploaded
  const uploadedTypes = new Set(documents.map((doc: any) => doc.documentType));
  
  // All possible document types
  const allTypes = Object.keys(DOCUMENT_TYPE_LABELS);
  const missingTypes = allTypes.filter(type => !uploadedTypes.has(type));

  const handleDownload = (documentId: number, fileName: string) => {
    // Open download in new tab
    window.open(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/documents/${documentId}/download`,
      "_blank"
    );
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-[600px]">
          <SheetHeader>
            <SheetTitle>Attached Documents</SheetTitle>
            <SheetDescription>
              {facilityName && `${facilityName} - `}
              {documents.length} document{documents.length !== 1 ? "s" : ""} attached
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4 p-4">
            {/* Upload Button */}
            <Button
              onClick={() => setUploadDialogOpen(true)}
              className="w-full"
              variant="outline"
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload New Document
            </Button>

            <Separator />

            {/* Document Type Checklist */}
            {missingTypes.length > 0 && (
              <div className="rounded-lg border bg-muted/50 p-2">
                <h4 className="font-medium text-sm mb-2">Missing Document Types</h4>
                <div className="flex flex-wrap gap-2">
                  {missingTypes.map((type) => (
                    <Badge key={type} variant="outline" className="text-xs">
                      {DOCUMENT_TYPE_LABELS[type]}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Documents List */}
            <ScrollArea className="h-[calc(100vh-300px)]">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-lg border p-2">
                      <Skeleton className="h-4 w-3/4 mb-2" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  ))}
                </div>
              ) : documents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-medium text-lg mb-2">No documents yet</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Upload your first document to get started
                  </p>
                  <Button
                    onClick={() => setUploadDialogOpen(true)}
                    variant="outline"
                    size="sm"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Document
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 p-4">
                  {documents.map((doc: any) => (
                    <div
                      key={doc.id}
                      className="rounded-lg border p-4 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        {/* File Icon */}
                        <div className="flex items-center justify-center rounded border p-2 bg-accent/50 shrink-0">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        </div>

                        {/* Document Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h4 className="font-medium text-sm truncate">
                              {doc.documentName}
                            </h4>
                            <Badge
                              variant={DOCUMENT_TYPE_COLORS[doc.documentType] || "outline"}
                              className="text-xs shrink-0"
                            >
                              {DOCUMENT_TYPE_LABELS[doc.documentType] || doc.documentType}
                            </Badge>
                          </div>

                          {/* Metadata */}
                          <div className="space-y-1 text-xs text-muted-foreground">
                            <div className="flex items-center gap-4">
                              <span className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                {formatBytes(doc.fileSize)}
                              </span>
                              {doc.uploadedAt && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {format(new Date(doc.uploadedAt), "MMM d, yyyy")}
                                </span>
                              )}
                            </div>
                            {doc.uploader && (
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                <span>{doc.uploader.name || doc.uploader.email}</span>
                              </div>
                            )}
                          </div>

                          {/* Description */}
                          {doc.description && (
                            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                              {doc.description}
                            </p>
                          )}

                          {/* Actions */}
                          <div className="flex items-center gap-2 mt-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownload(doc.id, doc.documentName)}
                            >
                              <Eye className="mr-1 h-3 w-3" />
                              Preview
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownload(doc.id, doc.documentName)}
                            >
                              <Download className="mr-1 h-3 w-3" />
                              Download
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>

      <UploadDocumentDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        executionEntryId={executionEntryId}
      />
    </>
  );
}
