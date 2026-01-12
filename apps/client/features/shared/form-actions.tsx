import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, AlertCircle, Clock, Save, Send, X, FileText } from "lucide-react";

export interface FormActionsProps {
  module?: "planning" | "execution";
  onSaveDraft?: () => void;
  onSubmit?: () => void;
  onCancel?: () => void;
  onGenerateStatement?: () => void;
  onViewStatement?: () => void;
  onExport?: () => void;
  isSubmitting?: boolean;
  isDirty?: boolean;
  isValid?: boolean;
  validationErrors?: Record<string, any>;
  lastSaved?: Date | null;
  submitLabel?: string;
  draftLabel?: string;
  cancelLabel?: string;
  showStatementButtons?: boolean;
  canSaveDraft?: boolean;
  canSubmit?: boolean;
}

export function FormActions({
  module = "planning",
  onSaveDraft,
  onSubmit,
  onCancel,
  onGenerateStatement,
  onViewStatement,
  onExport,
  isSubmitting = false,
  isDirty = false,
  isValid = true,
  validationErrors = {},
  lastSaved,
  submitLabel,
  draftLabel = "Save Draft",
  cancelLabel = "Cancel",
  showStatementButtons = false,
  canSaveDraft = true,
  canSubmit = true,
}: FormActionsProps) {
  const errorCount = Object.keys(validationErrors).length;
  const effectiveSubmitLabel = submitLabel ?? (module === "execution" ? "Submit Execution" : "Submit Plan");

  return (
    <Card className="sticky bottom-0 z-10 shadow-lg border-t-2 border-2 border-black rounded-none mt-4">
      <CardContent>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              {isValid ? (
                <div className="flex items-center text-green-600">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  <span>Valid</span>
                </div>
              ) : (
                <div className="flex items-center text-red-600">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  <span>{errorCount} error{errorCount !== 1 ? "s" : ""}</span>
                </div>
              )}
            </div>

            <Separator orientation="vertical" className="h-4" />

            {isDirty && (
              <div className="flex items-center text-amber-600">
                <AlertCircle className="h-4 w-4 mr-1" />
                <span>Unsaved changes</span>
              </div>
            )}

            {lastSaved && (
              <div className="flex items-center text-gray-500">
                <Clock className="h-4 w-4 mr-1" />
                <span>Last saved: {lastSaved.toLocaleTimeString()}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {showStatementButtons && (
              <>
                {onGenerateStatement && (
                  <Button type="button" variant="outline" onClick={onGenerateStatement} disabled={isSubmitting} className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Generate Statement
                  </Button>
                )}
                {onViewStatement && (
                  <Button type="button" variant="outline" onClick={onViewStatement} disabled={isSubmitting} className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    View Statement
                  </Button>
                )}
                {onExport && (
                  <Button type="button" variant="outline" onClick={onExport} disabled={isSubmitting} className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Export
                  </Button>
                )}
              </>
            )}

            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting} className="flex items-center gap-2">
              <X className="h-4 w-4" />
              {cancelLabel}
            </Button>

            {onSaveDraft && (
              <Button
                type="button"
                variant="outline"
                onClick={onSaveDraft}
                disabled={isSubmitting || !isDirty || !canSaveDraft}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {draftLabel}
              </Button>
            )}

            {onSubmit && (
              <Button
                type="button"
                onClick={onSubmit}
                disabled={isSubmitting || !isValid || !canSubmit}
                className="flex items-center gap-2 min-w-[160px]"
              >
                <Send className="h-4 w-4" />
                {isSubmitting ? "Submitting..." : effectiveSubmitLabel}
              </Button>
            )}
          </div>
        </div>

        {!isValid && errorCount > 0 && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="text-sm text-red-800">
              <p className="font-semibold mb-2">Please fix the following issues:</p>
              <ul className="list-disc list-inside space-y-1 max-h-20 overflow-y-auto">
                {Object.entries(validationErrors).slice(0, 5).map(([field, errors]) => (
                  <li key={field}>
                    <span className="font-medium">{field}:</span>{" "}
                    {Array.isArray(errors) ? (errors as any).join(', ') : (errors as any)}
                  </li>
                ))}
                {errorCount > 5 && (
                  <li className="text-gray-600">... and {errorCount - 5} more error{errorCount - 5 !== 1 ? 's' : ''}</li>
                )}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default FormActions;


