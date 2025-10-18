import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, DollarSign, User } from "lucide-react";

interface VersionHistoryDialogProps {
  quoteId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VersionHistoryDialog({
  quoteId,
  open,
  onOpenChange,
}: VersionHistoryDialogProps) {
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);

  const { data: versionsData, isLoading } = useQuery<{
    success: boolean;
    data: any[];
  }>({
    queryKey: ["/api/quotes", quoteId, "versions"],
    enabled: open && !!quoteId,
  });

  const versions = versionsData?.data || [];

  const getChangesSummary = (version: any, previousVersion: any) => {
    if (!previousVersion) return "Initial version";

    const changes: string[] = [];

    if (version.totalAmount !== previousVersion.totalAmount) {
      const diff = version.totalAmount - previousVersion.totalAmount;
      changes.push(
        `Total changed by $${Math.abs(diff).toFixed(2)} ${diff > 0 ? "↑" : "↓"}`
      );
    }

    if (version.status !== previousVersion.status) {
      changes.push(`Status: ${previousVersion.status} → ${version.status}`);
    }

    return changes.length > 0 ? changes.join(", ") : "No significant changes";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Version History</DialogTitle>
          <DialogDescription>
            View all revisions for quote {quoteId}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No version history available</p>
            </div>
          ) : (
            <div className="space-y-3">
              {versions.map((version, index) => {
                const previousVersion = versions[index + 1];
                const isSelected = selectedVersion === version.version;

                return (
                  <div
                    key={version.id}
                    className={`p-4 rounded-lg border transition-colors cursor-pointer hover-elevate ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    }`}
                    onClick={() =>
                      setSelectedVersion(
                        isSelected ? null : version.version
                      )
                    }
                    data-testid={`version-${version.version}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          Version {version.version}
                        </Badge>
                        {index === 0 && (
                          <Badge variant="default">Latest</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          <span className="font-semibold">
                            ${version.totalAmount?.toFixed(2) || "0.00"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>
                          {version.dateCreated
                            ? format(
                                new Date(version.dateCreated),
                                "MMM d, yyyy 'at' h:mm a"
                              )
                            : "Unknown date"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <User className="w-4 h-4" />
                        <span>{version.modifiedBy}</span>
                      </div>
                    </div>

                    {index > 0 && (
                      <div className="mt-2 pt-2 border-t text-sm text-muted-foreground">
                        {getChangesSummary(version, previousVersion)}
                      </div>
                    )}

                    {isSelected && version.quoteData && (
                      <div className="mt-3 p-3 bg-muted rounded-md text-sm">
                        <div className="font-medium mb-2">Details:</div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-muted-foreground">
                              Charger Type:
                            </span>{" "}
                            {version.quoteData.charger?.type || "N/A"}
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Installation:
                            </span>{" "}
                            {version.quoteData.installation?.location || "N/A"}
                          </div>
                          {version.quoteData.services
                            ?.panelUpgradeRequired && (
                            <div className="col-span-2">
                              <span className="text-destructive">
                                ⚠️ Panel upgrade required
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
