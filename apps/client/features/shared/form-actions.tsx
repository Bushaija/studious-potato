import React, { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, AlertCircle, Save, Send, X, Loader2 } from "lucide-react";

export interface FormActionsProps {
  module?: "planning" | "execution";
  onSaveDraft?: () => void | Promise<void>;
  onSubmit?: () => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  isDirty?: boolean;
  isValid?: boolean;
  validationErrors?: Record<string, any>;
  lastSaved?: Date | null;
  submitLabel?: string;
  draftLabel?: string;
  cancelLabel?: string;
  canSaveDraft?: boolean;
  canSubmit?: boolean;
}

export function FormActions({
  module = "planning",
  onSaveDraft,
  onSubmit,
  onCancel,
  isSubmitting = false,
  isDirty = false,
  isValid = true,
  validationErrors = {},
  lastSaved,
  submitLabel,
  draftLabel = "Save Draft",
  cancelLabel = "Cancel",
  canSaveDraft = true,
  canSubmit = true,
}: FormActionsProps) {
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const errorCount = Object.keys(validationErrors).length;
  const effectiveSubmitLabel = submitLabel ?? (module === "execution" ? "Submit Execution" : "Submit Plan");

  const handleSaveDraft = useCallback(async () => {
    if (!onSaveDraft || isSavingDraft) return;
    
    setIsSavingDraft(true);
    try {
      await onSaveDraft();
    } finally {
      // Small delay to show the saving state
      setTimeout(() => {
        setIsSavingDraft(false);
      }, 300);
    }
  }, [onSaveDraft, isSavingDraft]);

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

            {isDirty && !lastSaved && (
              <div className="flex items-center text-amber-600">
                <AlertCircle className="h-4 w-4 mr-1" />
                <span>Unsaved changes</span>
              </div>
            )}

            {lastSaved && (
              <div className="flex items-center text-green-600">
                <CheckCircle className="h-4 w-4 mr-1" />
                <span>Auto-saved {lastSaved.toLocaleTimeString()}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting} className="flex items-center gap-2">
              <X className="h-4 w-4" />
              {cancelLabel}
            </Button>

            {onSaveDraft && (
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveDraft}
                disabled={isSubmitting || isSavingDraft || !canSaveDraft}
                className="flex items-center gap-2"
              >
                {isSavingDraft ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {isSavingDraft ? "Saving..." : draftLabel}
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


