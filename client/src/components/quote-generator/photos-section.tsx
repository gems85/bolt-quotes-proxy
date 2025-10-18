import { useQuery } from "@tanstack/react-query";
import { Photo } from "@/shared/schema";
import { Card } from "@/components/ui/card";
import { Loader2, Image as ImageIcon } from "lucide-react";

interface PhotosSectionProps {
  projectId: string;
}

export function PhotosSection({ projectId }: PhotosSectionProps) {
  const { data: photos, isLoading } = useQuery<Photo[]>({
    queryKey: ["/api/photos", projectId],
    enabled: !!projectId,
  });

  if (isLoading) {
    return (
      <Card className="p-5" data-testid="card-photos-loading">
        <h2 className="text-lg font-semibold text-foreground mb-3 pb-2 border-b-2 border-primary">
          Installation Photos
        </h2>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  if (!photos || photos.length === 0) {
    return (
      <Card className="p-5" data-testid="card-photos-empty">
        <h2 className="text-lg font-semibold text-foreground mb-3 pb-2 border-b-2 border-primary">
          Installation Photos
        </h2>
        <div className="text-center py-8 text-muted-foreground">
          <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No photos found for this project.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5" data-testid="card-photos">
      <h2 className="text-lg font-semibold text-foreground mb-3 pb-2 border-b-2 border-primary">
        Installation Photos
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {photos.map((photo) => {
          const fields = photo.fields;
          const photoType = fields["Photo Type"] || "Unknown";
          const attachments = fields["File"];
          const imageUrl = attachments?.[0]?.thumbnails?.large?.url || attachments?.[0]?.url;

          return (
            <div 
              key={photo.id} 
              className="border border-border rounded-md overflow-hidden"
              data-testid={`photo-item-${photo.id}`}
            >
              {imageUrl ? (
                <img 
                  src={imageUrl} 
                  alt={photoType}
                  className="w-full h-48 object-cover"
                />
              ) : (
                <div className="w-full h-48 bg-muted flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-muted-foreground opacity-50" />
                </div>
              )}
              <div className="bg-muted p-2 text-center text-sm font-medium">
                {photoType}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
