"use client";

import { ArrowLeft, Edit, Download, Calendar, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface ExecutionDetailsHeaderProps {
  execution: any | null;
  onBack: () => void;
  onEdit: () => void;
  correctedContext?: {
    projectType?: string;
    facilityType?: string;
    quarter?: string;
    corrected?: boolean;
    source?: string;
  };
}

export function ExecutionDetailsHeader({ execution, onBack, onEdit, correctedContext }: ExecutionDetailsHeaderProps) {
  const handleExportPDF = async () => {
    if (!execution) return;

    // Lazy load jsPDF only when needed
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.text("Execution Activities Report", 20, 30);

    // Facility and Project Info
    doc.setFontSize(12);
    doc.text(`Facility: ${execution?.facility?.name || "N/A"}`, 20, 50);
    doc.text(`Program: ${execution?.formData?.context?.projectType || execution?.project?.projectType || execution?.metadata?.program || "N/A"}`, 20, 60);
    doc.text(`Quarter: ${execution?.formData?.context?.quarter || execution?.metadata?.quarter || "N/A"}`, 20, 70);
    if (execution?.createdAt) doc.text(`Created: ${format(new Date(execution.createdAt), "PPP")}`, 20, 80);

    // Activities Table Header
    doc.setFontSize(14);
    doc.text("Activities Breakdown", 20, 100);

    // Table headers
    doc.setFontSize(10);
    const headers = ["Code", "Q1", "Q2", "Q3", "Q4", "Comment"];
    const colWidths = [60, 20, 20, 20, 20, 60];
    let x = 20;

    headers.forEach((header, index) => {
      doc.text(header, x, 110);
      x += colWidths[index];
    });

    // Activities data
    let y = 120;
    const activitiesData = execution?.formData?.activities;
    const activities = activitiesData && typeof activitiesData === 'object' 
      ? Object.entries(activitiesData).map(([code, activity]: [string, any]) => ({
          code,
          ...activity
        }))
      : [];

    for (const a of activities) {
      if (y > 280) { doc.addPage(); y = 20; }
      x = 20;
      doc.text(String(a.code ?? "-"), x, y);
      x += colWidths[0];
      doc.text(String(a.q1 ?? 0), x, y); x += colWidths[1];
      doc.text(String(a.q2 ?? 0), x, y); x += colWidths[2];
      doc.text(String(a.q3 ?? 0), x, y); x += colWidths[3];
      doc.text(String(a.q4 ?? 0), x, y); x += colWidths[4];
      doc.text(String(a.comment ?? ""), x, y);
      y += 10;
    }

    // Save the PDF
    doc.save(`execution-report-${execution?.facility?.name || 'facility'}-${execution?.formData?.quarter || 'Q'}.pdf`);
  };

  if (!execution) {
    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="space-y-2">
            <div className="h-8 w-64 bg-muted animate-pulse rounded" />
            <div className="h-4 w-96 bg-muted animate-pulse rounded" />
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="outline" size="sm" disabled>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              Execution Activities - {execution.facility?.name}
            </h1>
            <p className="text-muted-foreground">
              {(correctedContext?.projectType || execution.formData?.context?.projectType || execution.project?.projectType || execution.metadata?.program) ?? 'Program'} • {(correctedContext?.quarter || execution.formData?.context?.quarter || execution.metadata?.quarter) ?? 'Quarter'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Quick Update
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4" />
                Facility Information
              </div>
              <div className="space-y-1">
                <div className="font-medium">{execution.facility?.name}</div>
                <Badge variant="secondary">
                  {(execution.facility?.facilityType || execution.metadata?.facilityType || '')?.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Reporting Period
              </div>
              <div className="space-y-1">
                <div className="font-medium">Quarter {(correctedContext?.quarter || execution.formData?.context?.quarter || execution.metadata?.quarter) ?? '—'}</div>
                <div className="text-sm text-muted-foreground">
                  FY {execution.reportingPeriod?.year ?? '—'}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Created At
              </div>
              <div className="space-y-1">
                <div className="font-medium">{execution.createdAt ? format(new Date(execution.createdAt), "PPP") : '—'}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ExecutionDetailsHeader;



