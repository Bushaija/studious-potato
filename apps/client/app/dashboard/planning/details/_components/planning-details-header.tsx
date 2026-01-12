"use client";

import { ArrowLeft, Edit, Download, Calendar, Building2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { jsPDF } from "jspdf";
import { PlanningActivity } from "../../_components/planning-table-columns";

interface PlanningDetailsHeaderProps {
  planning: PlanningActivity | null;
  onBack: () => void;
  onEdit: () => void;
  onExport: () => void;
}

export function PlanningDetailsHeader({ 
  planning, 
  onBack, 
  onEdit, 
  onExport 
}: PlanningDetailsHeaderProps) {
  const handleExportPDF = () => {
    if (!planning) return;

    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text("Planning Activities Report", 20, 30);
    
    // Facility and Project Info
    doc.setFontSize(12);
    doc.text(`Facility: ${planning.facility?.name || "N/A"}`, 20, 50);
    doc.text(`Project: ${planning.project?.name || "N/A"}`, 20, 60);
    doc.text(`Period: FY ${planning.reportingPeriod?.year || "N/A"}`, 20, 70);
    doc.text(`Created: ${format(new Date(planning.createdAt), "PPP")}`, 20, 80);
    
    // Activities Table Header
    doc.setFontSize(14);
    doc.text("Activities Breakdown", 20, 100);
    
    // Table headers
    doc.setFontSize(10);
    const headers = ["Activity", "Q1", "Q2", "Q3", "Q4", "Total"];
    const colWidths = [80, 20, 20, 20, 20, 20];
    let x = 20;
    
    headers.forEach((header, index) => {
      doc.text(header, x, 110);
      x += colWidths[index];
    });
    
    // Activities data
    let y = 120;
    const activities = planning.formDataNamed?.activities || {};
    
    Object.entries(activities).forEach(([activityName, data]: [string, any]) => {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      
      const q1Amount = (data.q1_count || 0) * (data.unit_cost || 0);
      const q2Amount = (data.q2_count || 0) * (data.unit_cost || 0);
      const q3Amount = (data.q3_count || 0) * (data.unit_cost || 0);
      const q4Amount = (data.q4_count || 0) * (data.unit_cost || 0);
      const total = q1Amount + q2Amount + q3Amount + q4Amount;
      
      x = 20;
      doc.text(activityName.substring(0, 30), x, y);
      x += colWidths[0];
      doc.text(`$${q1Amount.toFixed(0)}`, x, y);
      x += colWidths[1];
      doc.text(`$${q2Amount.toFixed(0)}`, x, y);
      x += colWidths[2];
      doc.text(`$${q3Amount.toFixed(0)}`, x, y);
      x += colWidths[3];
      doc.text(`$${q4Amount.toFixed(0)}`, x, y);
      x += colWidths[4];
      doc.text(`$${total.toFixed(0)}`, x, y);
      
      y += 10;
    });
    
    // Save the PDF
    doc.save(`planning-report-${planning.facility?.name || 'facility'}-${planning.reportingPeriod?.year || 'unknown'}.pdf`);
  };

  if (!planning) {
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
              Planning Activities - {planning.facility?.name}
            </h1>
            <p className="text-muted-foreground">
              {planning.project?.name} • FY {planning.reportingPeriod?.year}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
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
                <div className="font-medium">{planning.facility?.name}</div>
                <Badge variant="secondary">
                  {planning.facility?.facilityType?.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Reporting Period
              </div>
              <div className="space-y-1">
                <div className="font-medium">FY {planning.reportingPeriod?.year}</div>
                <div className="text-sm text-muted-foreground">
                  {format(new Date(planning.reportingPeriod?.startDate || ''), "MMM dd, yyyy")} - {format(new Date(planning.reportingPeriod?.endDate || ''), "MMM dd, yyyy")}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                Created By
              </div>
              <div className="space-y-1">
                <div className="font-medium">{planning.creator?.name}</div>
                <div className="text-sm text-muted-foreground">
                  {format(new Date(planning.createdAt), "PPP")}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

