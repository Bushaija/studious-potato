import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { FolderKanban } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ProjectBreakdownCardProps {
  projectBreakdown: Array<{
    projectId: number;
    projectName: string;
    projectCode: string;
    allocated: number;
    spent: number;
    remaining: number;
    utilizationPercentage: number;
  }>;
}

export function ProjectBreakdownCard({ projectBreakdown }: ProjectBreakdownCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getUtilizationColor = (percentage: number) => {
    if (percentage > 90) return "text-red-600";
    if (percentage > 75) return "text-yellow-600";
    return "text-green-600";
  };

  return (
    <Card className="col-span-1">
      <CardHeader>
        <div className="flex items-center gap-2">
          <FolderKanban className="h-5 w-5" />
          <CardTitle>Project Breakdown</CardTitle>
        </div>
        <CardDescription>Budget allocation by project</CardDescription>
      </CardHeader>
      <CardContent>
        {projectBreakdown.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FolderKanban className="h-12 w-12 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No projects found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Projects will appear here once created
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {projectBreakdown.map((project) => (
              <div key={project.projectId} className="space-y-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium leading-none">
                        {project.projectName}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {project.projectCode}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Allocated: {formatCurrency(project.allocated)}</span>
                      <span>Spent: {formatCurrency(project.spent)}</span>
                    </div>
                  </div>
                  <div className={`text-sm font-semibold ${getUtilizationColor(project.utilizationPercentage)}`}>
                    {project.utilizationPercentage.toFixed(1)}%
                  </div>
                </div>
                <Progress value={project.utilizationPercentage} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  Remaining: {formatCurrency(project.remaining)}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
