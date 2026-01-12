"use client";

import React from "react";

interface ExecutionActionsState {
  isSubmitting: boolean;
  isDirty: boolean;
  isValid: boolean;
  validationErrors: Record<string, any>;
  lastSaved: Date | null;
  onSaveDraft: () => void;
  onSubmit: () => void;
  onCancel: () => void;
}

const ExecutionActionsContext = React.createContext<ExecutionActionsState | null>(null);

export function ExecutionActionsProvider({ value, children }: { value: ExecutionActionsState; children: React.ReactNode }) {
  return <ExecutionActionsContext.Provider value={value}>{children}</ExecutionActionsContext.Provider>;
}

export function useExecutionActions() {
  const ctx = React.useContext(ExecutionActionsContext);
  if (!ctx) throw new Error("useExecutionActions must be used within ExecutionActionsProvider");
  return ctx;
}


