"use client";

import { useUser } from "@/components/providers/session-provider";
import { FinancialReportsTable } from "./_components/financial-reports-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function FinancialReportsPage() {
  const user = useUser();

  return (
    <div className="container mx-auto p-4 md:p-8 h-full">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold tracking-tight">Financial Reports</h1>
            </div>
            <p className="text-muted-foreground">
              Manage and submit your financial reports for approval
            </p>
          </div>
        </div>

        {/* Reports Table */}
        <Card>
          <CardHeader>
            <CardTitle>My Reports</CardTitle>
            <CardDescription>
              View, edit, and submit your draft and rejected reports
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FinancialReportsTable userId={Number(user?.id)} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}