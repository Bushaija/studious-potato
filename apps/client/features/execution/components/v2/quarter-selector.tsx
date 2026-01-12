"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, AlertCircle } from "lucide-react";
import { generateQuarterLabelsWithStatus } from "@/features/execution/utils/quarter-management";

interface QuarterSelectorProps {
  currentQuarter: "Q1" | "Q2" | "Q3" | "Q4";
  onQuarterChange?: (quarter: "Q1" | "Q2" | "Q3" | "Q4") => void;
}

export function QuarterSelector({ currentQuarter, onQuarterChange }: QuarterSelectorProps) {
  const quarterStatus = generateQuarterLabelsWithStatus();
  
  const getQuarterIcon = (quarter: any) => {
    if (quarter.isCurrent && quarter.isActive) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
    if (quarter.isActive) {
      return <CheckCircle className="h-4 w-4 text-blue-600" />;
    }
    if (quarter.isCurrent) {
      return <AlertCircle className="h-4 w-4 text-orange-600" />;
    }
    return <Clock className="h-4 w-4 text-gray-400" />;
  };

  const getStatusText = (quarter: any) => {
    if (quarter.isCurrent && quarter.isActive) {
      return "Current & Active";
    }
    if (quarter.isCurrent) {
      return "Current Quarter";
    }
    if (quarter.isActive) {
      return "Available for reporting";
    }
    return "Future quarter - not available yet";
  };

  const getStatusColor = (quarter: any) => {
    if (quarter.isCurrent && quarter.isActive) {
      return "bg-green-100 text-green-800";
    }
    if (quarter.isCurrent) {
      return "bg-orange-100 text-orange-800";
    }
    if (quarter.isActive) {
      return "bg-blue-100 text-blue-800";
    }
    return "bg-gray-100 text-gray-500";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📅 Quarter Status
          <Badge variant={currentQuarter === "Q1" ? "default" : "secondary"}>
            Currently Editing: {currentQuarter}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {quarterStatus.map((quarter) => (
          <div 
            key={quarter.quarter} 
            className={`flex items-center justify-between p-3 rounded-lg border ${
              quarter.line1 === currentQuarter ? "border-blue-300 bg-blue-50" : "border-gray-200"
            }`}
          >
            <div className="flex items-center gap-3">
              {getQuarterIcon(quarter)}
              <div>
                <div className="font-medium">{quarter.line1}</div>
                <div className="text-sm text-gray-600">{quarter.line2}</div>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-2">
              <Badge 
                variant="outline" 
                className={getStatusColor(quarter)}
              >
                {getStatusText(quarter)}
              </Badge>
              
              {quarter.line1 === currentQuarter && (
                <Badge variant="default" className="bg-blue-600">
                  ⭐ Currently Editing
                </Badge>
              )}
              
              {quarter.isActive && quarter.line1 !== currentQuarter && onQuarterChange && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onQuarterChange(quarter.line1 as "Q1" | "Q2" | "Q3" | "Q4")}
                  className="text-xs"
                >
                  Switch to {quarter.line1}
                </Button>
              )}
            </div>
          </div>
        ))}
        
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <div className="text-sm text-blue-800">
            <strong>💡 Tip:</strong> If you want to edit a different quarter, add <code className="bg-blue-100 px-1 rounded">quarter=Q2</code> etc. to your URL parameters.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
