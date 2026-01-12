"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Loader } from "lucide-react";
import type { FormSchemaConfig } from "@/lib/form-schema";

interface FormLayoutProps {
  config: FormSchemaConfig;
  children: React.ReactNode;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
  onCancel?: () => void;
  className?: string;
  // Modal control props
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SheetModalLayout({
  config,
  children,
  onSubmit,
  isPending,
  onCancel,
  className,
  open,
  onOpenChange,
}: FormLayoutProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className={cn("flex flex-col gap-6", className)}>
        <SheetHeader className="text-left">
          <SheetTitle>{config.title}</SheetTitle>
          {config.description && (
            <SheetDescription>{config.description}</SheetDescription>
          )}
        </SheetHeader>
        
        <form onSubmit={onSubmit} className="flex-1 space-y-4">
          {children}
          
          <SheetFooter className="gap-2 pt-2 sm:space-x-0">
            {config.showCancel !== false && (
              <SheetClose asChild>
                <Button type="button" variant="outline" onClick={onCancel}>
                  {config.cancelText || "Cancel"}
                </Button>
              </SheetClose>
            )}
            <Button type="submit" disabled={isPending}>
              {isPending && (
                <Loader className="mr-2 size-4 animate-spin" aria-hidden="true" />
              )}
              {config.submitText || "Save"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export function FullPageLayout({
  config,
  children,
  onSubmit,
  isPending,
  onCancel,
  className,
}: FormLayoutProps) {
  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">{config.title}</h1>
          {config.description && (
            <p className="text-muted-foreground">{config.description}</p>
          )}
        </div>
        
        <form onSubmit={onSubmit} className="space-y-6">
          <div className={cn("space-y-6", className)}>
            {children}
          </div>
          
          <div className="flex items-center justify-end space-x-4 pt-6 border-t">
            {config.showCancel !== false && (
              <Button type="button" variant="outline" onClick={onCancel}>
                {config.cancelText || "Cancel"}
              </Button>
            )}
            <Button type="submit" disabled={isPending}>
              {isPending && (
                <Loader className="mr-2 size-4 animate-spin" aria-hidden="true" />
              )}
              {config.submitText || "Save"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Helper function to determine grid classes based on column span
export function getGridClasses(colSpan: number, columns: number = 4): string {
  const spanMap: Record<number, string> = {
    1: "col-span-1",
    2: "col-span-2", 
    3: "col-span-3",
    4: "col-span-4",
    5: "col-span-5",
    6: "col-span-6",
    12: "col-span-12",
  };
  
  return spanMap[colSpan] || "col-span-1";
}

// Helper function to get grid container classes
export function getGridContainerClasses(columns: number): string {
  const columnMap: Record<number, string> = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3", 
    4: "grid-cols-4",
  };
  
  return `grid gap-4 ${columnMap[columns] || "grid-cols-1"}`;
}

// Utility function for conditional classes
function cn(...classes: (string | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
