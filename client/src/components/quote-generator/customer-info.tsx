import { useQuery, useMutation } from "@tanstack/react-query";
import { Project } from "@/shared/schema";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CustomerInfoProps {
  projectId: string;
}

const STATUS_OPTIONS = [
  "Pending Photos",
  "Photos Uploaded",
  "Quote Draft",
  "Quote Sent",
  "Quote Viewed",
  "Accepted",
  "Scheduled",
  "Completed",
  "Rejected",
  "Canceled",
];

export function CustomerInfo({ projectId }: CustomerInfoProps) {
  const { toast } = useToast();

  const { data: project, isLoading } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      return await apiRequest("PATCH", `/api/projects/${projectId}/status`, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      toast({
        title: "Status Updated",
        description: "Project status has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update project status.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Card className="p-5 flex items-center justify-center min-h-[200px]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  if (!project) return null;

  const fields = project.fields;

  return (
    <Card className="p-5" data-testid="card-customer-info">
      <h2 className="text-lg font-semibold text-foreground mb-3 pb-2 border-b-2 border-primary">
        Customer Information
      </h2>

      <div className="grid grid-cols-2 gap-3">
        <div data-testid="info-quote-id">
          <p className="text-xs text-muted-foreground font-semibold mb-1">Quote ID</p>
          <p className="text-primary font-bold text-base">{fields["Quote ID"] || "Not assigned"}</p>
        </div>

        <div data-testid="info-status">
          <p className="text-xs text-muted-foreground font-semibold mb-1">Status</p>
          <Select
            value={fields["Project Status"] || "Pending Photos"}
            onValueChange={(value) => updateStatusMutation.mutate(value)}
          >
            <SelectTrigger className="h-9" data-testid="select-project-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <p className="text-xs text-muted-foreground font-semibold mb-1">Customer Name</p>
          <p className="text-foreground" data-testid="text-customer-name">{fields["Customer Name"] || "N/A"}</p>
        </div>

        <div>
          <p className="text-xs text-muted-foreground font-semibold mb-1">Email</p>
          <p className="text-foreground">{fields["Customer Email"] || "N/A"}</p>
        </div>

        <div>
          <p className="text-xs text-muted-foreground font-semibold mb-1">Phone</p>
          <p className="text-foreground">{fields["Customer Phone"] || "N/A"}</p>
        </div>

        <div>
          <p className="text-xs text-muted-foreground font-semibold mb-1">Address</p>
          <p className="text-foreground">{fields["Customer Address"] || "N/A"}</p>
        </div>

        <div>
          <p className="text-xs text-muted-foreground font-semibold mb-1">EV Make</p>
          <p className="text-foreground">{fields["EV Make"] || "N/A"}</p>
        </div>

        <div>
          <p className="text-xs text-muted-foreground font-semibold mb-1">EV Model</p>
          <p className="text-foreground">{fields["EV Model"] || "N/A"}</p>
        </div>

        <div>
          <p className="text-xs text-muted-foreground font-semibold mb-1">Installation Location</p>
          <p className="text-foreground">{fields["Install Location"] || "N/A"}</p>
        </div>

        <div>
          <p className="text-xs text-muted-foreground font-semibold mb-1">Permit Required</p>
          <p className="text-foreground">{fields["Permit Required"] ? "Required" : "Not required"}</p>
        </div>
      </div>
    </Card>
  );
}
