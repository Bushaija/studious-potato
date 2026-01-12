import { z } from "zod";
import { isRedirectError } from "next/dist/client/components/redirect-error";

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getErrorMessage(err: unknown) {
  const unknownError = "Something went wrong, please try again later.";

  if (err instanceof z.ZodError) {
    const errors = err.issues.map((issue) => {
      return issue.message;
    });
    return errors.join("\n");
  }

  if (err instanceof Error) {
    return err.message;
  }

  if (isRedirectError(err)) {
    throw err;
  }

  return unknownError;
}

export function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(i ? 1 : 0)} ${sizes[i]}`;
}