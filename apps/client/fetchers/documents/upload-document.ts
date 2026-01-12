import { honoClient as client } from "@/api-client/index";
import type { InferResponseType } from "hono/client";

export interface UploadDocumentRequest {
  file: File;
  documentName: string;
  documentType: 'cash_book' | 'bank_statement' | 'vat_report' | 'invoice' | 'receipt' | 'purchase_order' | 'payment_voucher' | 'journal_entry' | 'ledger' | 'trial_balance' | 'supporting_document' | 'other';
  executionEntryId: string;
  description?: string;
  metadata?: string;
}

export type UploadDocumentResponse = InferResponseType<
  (typeof client)["documents"]["$post"]
>;

export async function uploadDocument(data: UploadDocumentRequest) {
  const formData = new FormData();
  formData.append("file", data.file);
  formData.append("documentName", data.documentName);
  formData.append("documentType", data.documentType);
  formData.append("executionEntryId", data.executionEntryId);
  
  if (data.description) {
    formData.append("description", data.description);
  }
  
  if (data.metadata) {
    formData.append("metadata", data.metadata);
  }

  // Use fetch directly for multipart/form-data
  const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/documents`, {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const result = await response.json();
  return result as UploadDocumentResponse;
}
