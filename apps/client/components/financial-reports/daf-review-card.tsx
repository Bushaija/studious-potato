"use client";

import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface DafReviewCardProps {
  report: {
    id: number;
    reportCode: string;
    title: string;
    status: any;
    fiscalYear: string;
    submittedAt: string | null;
    facility?: {
      name: string;
      facilityType?: string;
      district?: {
        name: string;
      };
    };
    project?: {
      name: string;
    };
    submitter?: {
      name: string;
    };
  };
  onClick?: () => void;
  isSelected?: boolean;
}

// Map report codes to friendly names
function getReportDisplayName(reportCode: string): string {
  const mapping: Record<string, string> = {
    'REV_EXP': 'Revenue and Expenditure',
    'CASH_FLOW': 'Cash Flow Statement',
    'BALANCE_SHEET': 'Balance Sheet',
    'ASSETS': 'Assets Statement',
    'LIABILITIES': 'Liabilities Statement',
  };
  
  return mapping[reportCode] || reportCode;
}

// Format time ago
function getTimeAgo(date: string | null): string {
  if (!date) return '';
  
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true })
      .replace('about ', '')
      .replace(' ago', '');
  } catch {
    return '';
  }
}

export function DafReviewCard({ report, onClick, isSelected = false }: DafReviewCardProps) {
  const displayName = getReportDisplayName(report.reportCode);
  const timeAgo = getTimeAgo(report.submittedAt);
  
  // Safely extract submitter name
  const submitterName = typeof report.submitter === 'string' 
    ? report.submitter 
    : report.submitter?.name || 'Unknown';
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-4 rounded-none transition-all my-4 cursor-pointer",
        "hover:bg-accent/50",
        isSelected && "bg-accent border-l-4 border-l-[#39C3C0]"
      )}
    >
      <div className="space-y-1">
        <h3 className="font-semibold text-sm leading-tight text-foreground">
          {displayName}
        </h3>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className="capitalize">{submitterName}</span>
          {timeAgo && (
            <>
              <span>·</span>
              <span>{timeAgo}{" ago"}</span>
            </>
          )}
        </div>
      </div>
    </button>
  );
}
