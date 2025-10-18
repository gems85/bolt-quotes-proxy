import { useQuery, useMutation } from "@tanstack/react-query";
import { Project, Quote } from "@/shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RefreshCw, AlertCircle } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

interface ProjectSelectorProps {
  selectedProjectId: string | null;
  onProjectSelect: (projectId: string | null) => void;
  onQuoteGenerated?: (quote: Quote) => void;
}

export function ProjectSelector({ selectedProjectId, onProjectSelect }: ProjectSelectorProps) {
  const { data: projects, isLoading, refetch, isFetching, error } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    refetch();
  };

  // Parse error message for detailed diagnostics
  const getErrorDetails = () => {
    if (!error) return null;
    
    try {
      const errorObj = error as any;
      let errorMessage = errorObj.message || "Unknown error";
      let errorType = "Connection Error";
      let details: string[] = [];

      // Try to parse the error response
      if (errorMessage.includes("Airtable")) {
        errorType = "Airtable Configuration Error";
        details.push("The application cannot connect to Airtable.");
      }
      
      if (errorMessage.includes("INVALID_PERMISSIONS_OR_MODEL_NOT_FOUND")) {
        details.push("Check: API token has permission to access this base");
        details.push("Check: Base ID is correct in environment variables");
        details.push("Check: Table names match exactly (PROJECTS, PHOTOS, QUOTES, etc.)");
      }
      
      if (errorMessage.includes("authentication")) {
        details.push("Check: AIRTABLE_API_KEY is set in Vercel environment variables");
        details.push("Check: API token is valid and not expired");
      }

      return {
        type: errorType,
        message: errorMessage,
        details: details.length > 0 ? details : ["Please check Vercel logs for more information"]
      };
    } catch {
      return {
        type: "Error",
        message: String(error),
        details: ["Check console for more information"]
      };
    }
  };

  const errorDetails = getErrorDetails();

  return (
    <div className="space-y-4">
      <Card className="p-5 shadow-sm" data-testid="card-project-selector">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <label htmlFor="project-select" className="font-semibold text-foreground whitespace-nowrap">
            Select Project:
          </label>
          <Select value={selectedProjectId || ""} onValueChange={(value) => onProjectSelect(value || null)}>
            <SelectTrigger 
              id="project-select" 
              className="flex-1"
              data-testid="select-project"
              disabled={!!error}
            >
              <SelectValue placeholder={isLoading ? "Loading projects..." : error ? "Error loading projects" : "-- Select a project --"} />
            </SelectTrigger>
            <SelectContent>
              {projects?.map((project) => {
                const name = project.fields["Customer Name"] || "Unnamed Project";
                const address = project.fields["Customer Address"] || "";
                const status = project.fields["Project Status"] || "Pending";
                return (
                  <SelectItem 
                    key={project.id} 
                    value={project.id}
                    data-testid={`option-project-${project.id}`}
                  >
                    {name} - {address} ({status})
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <Button
            onClick={handleRefresh}
            disabled={isFetching}
            variant="default"
            className="whitespace-nowrap"
            data-testid="button-refresh-projects"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </Card>

      {/* Error Alert */}
      {errorDetails && (
        <Alert variant="destructive" data-testid="alert-airtable-error">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="font-semibold">{errorDetails.type}</AlertTitle>
          <AlertDescription>
            <p className="mb-2 text-sm">{errorDetails.message}</p>
            <div className="mt-3 space-y-1">
              <p className="font-semibold text-sm">Troubleshooting Steps:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {errorDetails.details.map((detail, idx) => (
                  <li key={idx}>{detail}</li>
                ))}
              </ul>
            </div>
            <div className="mt-3 p-2 bg-destructive/10 rounded text-xs font-mono">
              Raw error: {String(error)}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Empty state when no projects but no error */}
      {!error && !isLoading && projects?.length === 0 && (
        <Alert data-testid="alert-no-projects">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Projects Found</AlertTitle>
          <AlertDescription>
            No projects are available in Airtable. Add projects to your PROJECTS table to get started.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
