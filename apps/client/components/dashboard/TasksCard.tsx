import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ClipboardList, 
  FileText, 
  AlertCircle, 
  Calendar,
  Clock
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TasksCardProps {
  tasks: {
    pendingPlans: Array<{
      projectId: number;
      projectName: string;
      projectCode: string;
      reportingPeriodId: number;
      reportingPeriodYear: number;
      deadline: string | null;
      status: string;
    }>;
    pendingExecutions: Array<{
      projectId: number;
      projectName: string;
      projectCode: string;
      reportingPeriodId: number;
      reportingPeriodYear: number;
      quarter: number | null;
      deadline: string | null;
      status: string;
    }>;
    correctionsRequired: Array<{
      id: number;
      entityType: "planning" | "execution";
      projectId: number;
      projectName: string;
      projectCode: string;
      reportingPeriodId: number;
      reportingPeriodYear: number;
      quarter: number | null;
      feedback: string | null;
      updatedAt: string;
    }>;
    upcomingDeadlines: Array<{
      reportingPeriodId: number;
      year: number;
      periodType: string;
      endDate: string;
      daysRemaining: number;
    }>;
  };
}

export function TasksCard({ tasks }: TasksCardProps) {
  const totalTasks =
    tasks.pendingPlans.length +
    tasks.pendingExecutions.length +
    tasks.correctionsRequired.length;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "No deadline";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Card className="col-span-1">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            <CardTitle>Tasks & Deadlines</CardTitle>
          </div>
          <Badge variant="secondary">{totalTasks} Total</Badge>
        </div>
        <CardDescription>Pending submissions and corrections</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="plans" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="plans" className="text-xs">
              Plans
              {tasks.pendingPlans.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">
                  {tasks.pendingPlans.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="executions" className="text-xs">
              Exec
              {tasks.pendingExecutions.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">
                  {tasks.pendingExecutions.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="corrections" className="text-xs">
              Fixes
              {tasks.correctionsRequired.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">
                  {tasks.correctionsRequired.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="deadlines" className="text-xs">
              Due
            </TabsTrigger>
          </TabsList>

          {/* Pending Plans */}
          <TabsContent value="plans" className="mt-4">
            <ScrollArea className="h-[300px] pr-4">
              {tasks.pendingPlans.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">No pending plans</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    All planning submissions are up to date
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.pendingPlans.map((plan) => (
                    <div
                      key={plan.projectId}
                      className="flex items-start justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{plan.projectName}</p>
                          <Badge variant="outline" className="text-xs">
                            {plan.projectCode}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          FY {plan.reportingPeriodYear}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>Due: {formatDate(plan.deadline)}</span>
                        </div>
                      </div>
                      <Badge variant="secondary">{plan.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Pending Executions */}
          <TabsContent value="executions" className="mt-4">
            <ScrollArea className="h-[300px] pr-4">
              {tasks.pendingExecutions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">No pending executions</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    All execution reports are submitted
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.pendingExecutions.map((exec, index) => (
                    <div
                      key={`${exec.projectId}-${exec.quarter}-${index}`}
                      className="flex items-start justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{exec.projectName}</p>
                          <Badge variant="outline" className="text-xs">
                            {exec.projectCode}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground">
                            FY {exec.reportingPeriodYear}
                          </p>
                          {exec.quarter && (
                            <Badge variant="secondary" className="text-xs">
                              Q{exec.quarter}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>Due: {formatDate(exec.deadline)}</span>
                        </div>
                      </div>
                      <Badge variant="secondary">{exec.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Corrections Required */}
          <TabsContent value="corrections" className="mt-4">
            <ScrollArea className="h-[300px] pr-4">
              {tasks.correctionsRequired.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">No corrections needed</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    All submissions are approved
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.correctionsRequired.map((correction) => (
                    <Alert key={correction.id} variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{correction.projectName}</p>
                            <Badge variant="outline" className="text-xs">
                              {correction.entityType}
                            </Badge>
                          </div>
                          {correction.feedback && (
                            <p className="text-xs">{correction.feedback}</p>
                          )}
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Upcoming Deadlines */}
          <TabsContent value="deadlines" className="mt-4">
            <ScrollArea className="h-[300px] pr-4">
              {tasks.upcomingDeadlines.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Clock className="h-12 w-12 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">No upcoming deadlines</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.upcomingDeadlines.map((deadline) => (
                    <div
                      key={deadline.reportingPeriodId}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          FY {deadline.year} ({deadline.periodType})
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Ends: {formatDate(deadline.endDate)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">
                          {deadline.daysRemaining}
                        </p>
                        <p className="text-xs text-muted-foreground">days left</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
