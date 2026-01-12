"use client";

import * as React from "react";
import { FileText, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useGetExecutionDocuments } from "@/hooks/queries/documents";
import { formatBytes } from "@/lib/utils";

interface ExecutionDocumentsListProps {
  executionEntryId: number;
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

export function ExecutionDocumentsList({
  executionEntryId,
}: ExecutionDocumentsListProps) {
  const { data, isLoading } = useGetExecutionDocuments({
    executionEntryId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>Loading documents...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const documents = data?.documents || [];

  if (documents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>No documents uploaded yet</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents</CardTitle>
        <CardDescription>
          {documents.length} document{documents.length !== 1 ? "s" : ""} attached
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {documents.map((doc: any) => (
            <div
              key={doc.id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex items-center justify-center rounded border p-2 bg-accent/50">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">
                    {doc.documentName}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatBytes(doc.fileSize)}</span>
                    <span>•</span>
                    <Badge variant="outline" className="text-xs">
                      {DOCUMENT_TYPE_LABELS[doc.documentType] || doc.documentType}
                    </Badge>
                  </div>
                  {doc.description && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {doc.description}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    // Download document
                    window.open(`/api/documents/${doc.id}/download`, "_blank");
                  }}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
