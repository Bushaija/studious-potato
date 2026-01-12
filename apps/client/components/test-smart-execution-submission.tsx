"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useSmartExecutionSubmission } from "@/hooks/mutations/executions/use-smart-execution-submission";
import useCheckExistingExecution from "@/hooks/queries/executions/use-check-existing-execution";
import { toast } from "sonner";

interface TestFormData {
  projectId: string;
  facilityId: string;
  reportingPeriodId: string;
  schemaId: string;
  quarter: "Q1" | "Q2" | "Q3" | "Q4";
  projectType: "HIV" | "Malaria" | "TB";
  facilityType: "hospital" | "health_center";
  facilityName: string;
  activityCode: string;
  q1Amount: string;
  q2Amount: string;
  q3Amount: string;
  q4Amount: string;
  comment: string;
}

export function TestSmartExecutionSubmission() {
  const [formData, setFormData] = useState<TestFormData>({
    projectId: "2",
    facilityId: "17",
    reportingPeriodId: "2",
    schemaId: "8",
    quarter: "Q1",
    projectType: "HIV",
    facilityType: "health_center",
    facilityName: "Test Facility",
    activityCode: "HIV_EXEC_HEALTH_CENTER_A_1",
    q1Amount: "100",
    q2Amount: "0",
    q3Amount: "0",
    q4Amount: "0",
    comment: "Test comment",
  });

  // Check if execution already exists
  const { 
    data: existingExecution, 
    isLoading: isCheckingExisting,
    refetch: recheckExisting 
  } = useCheckExistingExecution({
    projectId: formData.projectId,
    facilityId: formData.facilityId,
    reportingPeriodId: formData.reportingPeriodId,
  });

  // Smart submission hook
  const smartSubmission = useSmartExecutionSubmission({
    onSuccess: (data, isUpdate) => {
      const action = isUpdate ? "updated" : "created";
      toast.success(`✅ Execution ${action} successfully!`, {
        description: isUpdate 
          ? "The quarterly data has been merged with the existing execution record."
          : "A new execution record has been created for this combination.",
      });
      // Refresh the existing check
      recheckExisting();
    },
    onError: (error, isUpdate) => {
      const action = isUpdate ? "update" : "create";
      toast.error(`❌ Failed to ${action} execution`, {
        description: error.message,
      });
    },
  });

  const handleInputChange = (field: keyof TestFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    try {
      const activities = [{
        code: formData.activityCode,
        q1: Number(formData.q1Amount) || 0,
        q2: Number(formData.q2Amount) || 0,
        q3: Number(formData.q3Amount) || 0,
        q4: Number(formData.q4Amount) || 0,
        comment: formData.comment,
      }];

      await smartSubmission.mutateAsync({
        projectId: Number(formData.projectId),
        facilityId: Number(formData.facilityId),
        reportingPeriodId: Number(formData.reportingPeriodId),
        schemaId: Number(formData.schemaId),
        formData: {
          activities,
          quarter: formData.quarter,
        },
        metadata: {
          projectType: formData.projectType,
          facilityType: formData.facilityType,
          quarter: formData.quarter,
          facilityName: formData.facilityName,
          program: formData.projectType,
          projectId: Number(formData.projectId),
          facilityId: Number(formData.facilityId),
          reportingPeriodId: Number(formData.reportingPeriodId),
          source: "test-smart-execution-submission",
        },
      });
    } catch (error) {
      console.error("Test submission error:", error);
    }
  };

  const handleQuickTest = (quarter: "Q1" | "Q2" | "Q3" | "Q4", amount: string) => {
    setFormData(prev => ({
      ...prev,
      quarter,
      q1Amount: quarter === "Q1" ? amount : "0",
      q2Amount: quarter === "Q2" ? amount : "0",
      q3Amount: quarter === "Q3" ? amount : "0",
      q4Amount: quarter === "Q4" ? amount : "0",
      comment: `Test ${quarter} data - ${amount}`,
    }));
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>🧪 Smart Execution Submission Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Display */}
          <div className="p-4 border rounded-lg bg-muted/50">
            <h3 className="font-semibold mb-2">Current Status:</h3>
            {isCheckingExisting ? (
              <p className="text-muted-foreground">🔍 Checking for existing execution...</p>
            ) : existingExecution?.exists ? (
              <div className="space-y-2">
                <p className="text-green-600">✅ Execution record EXISTS (ID: {existingExecution.entry?.id})</p>
                <p className="text-sm text-muted-foreground">
                  Next submission will UPDATE the existing record
                </p>
                <div className="text-xs bg-green-50 p-2 rounded">
                  <strong>Existing Data Summary:</strong>
                  <br />• Facility: {existingExecution.entry?.facility?.name}
                  <br />• Project: {existingExecution.entry?.project?.name}
                  <br />• Activities: {Object.keys(existingExecution.entry?.formData?.activities || {}).length}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-blue-600">🆕 No existing execution record found</p>
                <p className="text-sm text-muted-foreground">
                  Next submission will CREATE a new record
                </p>
              </div>
            )}
          </div>

          {/* Quick Test Buttons */}
          <div className="space-y-2">
            <h3 className="font-semibold">Quick Test Scenarios:</h3>
            <div className="flex gap-2 flex-wrap">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleQuickTest("Q1", "1000")}
              >
                Test Q1 (Create)
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleQuickTest("Q2", "2000")}
              >
                Test Q2 (Update)
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleQuickTest("Q3", "3000")}
              >
                Test Q3 (Update)
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleQuickTest("Q4", "4000")}
              >
                Test Q4 (Update)
              </Button>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="projectId">Project ID</Label>
              <Input
                id="projectId"
                value={formData.projectId}
                onChange={(e) => handleInputChange("projectId", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="facilityId">Facility ID</Label>
              <Input
                id="facilityId"
                value={formData.facilityId}
                onChange={(e) => handleInputChange("facilityId", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reportingPeriodId">Reporting Period ID</Label>
              <Input
                id="reportingPeriodId"
                value={formData.reportingPeriodId}
                onChange={(e) => handleInputChange("reportingPeriodId", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="schemaId">Schema ID</Label>
              <Input
                id="schemaId"
                value={formData.schemaId}
                onChange={(e) => handleInputChange("schemaId", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quarter">Quarter</Label>
              <Select value={formData.quarter} onValueChange={(value: "Q1" | "Q2" | "Q3" | "Q4") => handleInputChange("quarter", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Q1">Q1</SelectItem>
                  <SelectItem value="Q2">Q2</SelectItem>
                  <SelectItem value="Q3">Q3</SelectItem>
                  <SelectItem value="Q4">Q4</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="projectType">Project Type</Label>
              <Select value={formData.projectType} onValueChange={(value: "HIV" | "Malaria" | "TB") => handleInputChange("projectType", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HIV">HIV</SelectItem>
                  <SelectItem value="Malaria">Malaria</SelectItem>
                  <SelectItem value="TB">TB</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="facilityType">Facility Type</Label>
              <Select value={formData.facilityType} onValueChange={(value: "hospital" | "health_center") => handleInputChange("facilityType", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hospital">Hospital</SelectItem>
                  <SelectItem value="health_center">Health Center</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="facilityName">Facility Name</Label>
            <Input
              id="facilityName"
              value={formData.facilityName}
              onChange={(e) => handleInputChange("facilityName", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="activityCode">Activity Code</Label>
            <Input
              id="activityCode"
              value={formData.activityCode}
              onChange={(e) => handleInputChange("activityCode", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="q1Amount">Q1 Amount</Label>
              <Input
                id="q1Amount"
                type="number"
                value={formData.q1Amount}
                onChange={(e) => handleInputChange("q1Amount", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="q2Amount">Q2 Amount</Label>
              <Input
                id="q2Amount"
                type="number"
                value={formData.q2Amount}
                onChange={(e) => handleInputChange("q2Amount", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="q3Amount">Q3 Amount</Label>
              <Input
                id="q3Amount"
                type="number"
                value={formData.q3Amount}
                onChange={(e) => handleInputChange("q3Amount", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="q4Amount">Q4 Amount</Label>
              <Input
                id="q4Amount"
                type="number"
                value={formData.q4Amount}
                onChange={(e) => handleInputChange("q4Amount", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">Comment</Label>
            <Textarea
              id="comment"
              value={formData.comment}
              onChange={(e) => handleInputChange("comment", e.target.value)}
              placeholder="Enter your comment here..."
            />
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              onClick={handleSubmit}
              disabled={smartSubmission.isPending}
              className="flex-1"
            >
              {smartSubmission.isPending ? "⏳ Submitting..." : "🚀 Submit Execution"}
            </Button>
            <Button
              variant="outline"
              onClick={() => recheckExisting()}
              disabled={isCheckingExisting}
            >
              {isCheckingExisting ? "🔍 Checking..." : "🔄 Refresh Status"}
            </Button>
          </div>
        </CardContent>
      </Card>

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>📋 Test Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <strong>1. Test CREATE scenario:</strong>
                <p>• Click "Test Q1 (Create)" or ensure no existing record exists</p>
                <p>• Submit - should create a new execution record</p>
              </div>
              <div>
                <strong>2. Test UPDATE scenario:</strong>
                <p>• After creating a record, click "Test Q2 (Update)" or any other quarter</p>
                <p>• Submit - should update the existing record with new quarterly data</p>
              </div>
              <div>
                <strong>3. Test Quarter Visibility Fix:</strong>
                <p>• Create Q1 data with some activities</p>
                <p>• Submit Q1 data</p>
                <p>• Switch to Q2 - you should see Q1 data displayed with 🔒 icon</p>
                <p>• Q1 quarters should show existing values but be read-only</p>
                <p>• Q2 should be editable for new data</p>
              </div>
              <div>
                <strong>4. Verify behavior:</strong>
                <p>• Watch the status display change after each submission</p>
                <p>• Check toast notifications for success/error messages</p>
                <p>• Verify that only one database record exists per combination</p>
                <p>• Ensure previously submitted quarters show their data with lock icons</p>
              </div>
            </CardContent>
          </Card>
    </div>
  );
}
