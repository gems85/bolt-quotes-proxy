import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Project, CompanyConfig, Quote, QuoteForm } from "@/shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Calculator } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { US_STATES } from "@/lib/constants";

interface AssessmentFormProps {
  projectId: string;
  onQuoteGenerated: (quote: Quote) => void;
}

export function AssessmentForm({ projectId, onQuoteGenerated }: AssessmentFormProps) {
  const { toast } = useToast();

  const { data: project } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

  const { data: config } = useQuery<CompanyConfig>({
    queryKey: ["/api/company-config"],
  });

  // Form state
  const [formData, setFormData] = useState<QuoteForm>({
    projectId,
    distance: 20,
    conduitType: "surface",
    chargerType: "hardwired",
    panelType: "standard",
    panelCapacity: 200,
    availableSlots: 3,
    panelAge: "new",
    state: "GA",
    installLocation: "garage-attached",
    laborRate: 95,
    markup: 20,
    propertyType: "single-family",
    selectedAddons: [],
  });

  // Update form when project loads
  useEffect(() => {
    if (project) {
      setFormData(prev => ({
        ...prev,
        installLocation: mapInstallLocation(project.fields["Install Location"]),
      }));
    }
  }, [project]);

  // Update defaults when config loads
  useEffect(() => {
    if (config) {
      setFormData(prev => ({
        ...prev,
        laborRate: config.laborRate,
        markup: config.defaultMarkup,
      }));
    }
  }, [config]);

  const generateQuoteMutation = useMutation({
    mutationFn: async (data: QuoteForm) => {
      return await apiRequest<Quote>("POST", "/api/generate-quote", data);
    },
    onSuccess: (response) => {
      if (response.success && response.data) {
        onQuoteGenerated(response.data);
        toast({
          title: "Quote Generated",
          description: "Your quote has been generated successfully.",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate quote.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    generateQuoteMutation.mutate(formData);
  };

  const handleAddonToggle = (addonName: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      selectedAddons: checked 
        ? [...prev.selectedAddons, addonName]
        : prev.selectedAddons.filter(a => a !== addonName),
    }));
  };

  return (
    <Card className="p-5" data-testid="card-assessment-form">
      <h2 className="text-lg font-semibold text-foreground mb-3 pb-2 border-b-2 border-primary">
        Quote Assessment
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Property Details */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm text-foreground">Property Details</h3>
          
          <div>
            <Label htmlFor="propertyType">Property Type</Label>
            <Select 
              value={formData.propertyType} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, propertyType: value }))}
            >
              <SelectTrigger id="propertyType" data-testid="select-property-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single-family">Single-family home</SelectItem>
                <SelectItem value="townhouse">Townhouse</SelectItem>
                <SelectItem value="condo">Condo/Apartment</SelectItem>
                <SelectItem value="multi-family">Multi-family</SelectItem>
                <SelectItem value="commercial">Commercial</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="state">State</Label>
            <Select 
              value={formData.state} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, state: value }))}
            >
              <SelectTrigger id="state" data-testid="select-state">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {US_STATES.map((state) => (
                  <SelectItem key={state.code} value={state.code}>
                    {state.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="distance">Distance from Panel to Charger Location (feet)</Label>
            <Input
              id="distance"
              type="number"
              min="0"
              value={formData.distance}
              onChange={(e) => setFormData(prev => ({ ...prev, distance: parseInt(e.target.value) || 0 }))}
              data-testid="input-distance"
            />
          </div>

          <div>
            <Label htmlFor="installLocation">Installation Location</Label>
            <Select 
              value={formData.installLocation} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, installLocation: value }))}
            >
              <SelectTrigger id="installLocation" data-testid="select-install-location">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="garage-attached">Attached Garage</SelectItem>
                <SelectItem value="garage-detached">Detached Garage</SelectItem>
                <SelectItem value="driveway">Driveway</SelectItem>
                <SelectItem value="carport">Carport</SelectItem>
                <SelectItem value="exterior-wall">Exterior Wall</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Installation Details */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm text-foreground">Installation Details</h3>

          <div>
            <Label htmlFor="conduitType">Conduit/Wiring Type</Label>
            <Select 
              value={formData.conduitType} 
              onValueChange={(value: any) => setFormData(prev => ({ ...prev, conduitType: value }))}
            >
              <SelectTrigger id="conduitType" data-testid="select-conduit-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="surface">Surface Mount</SelectItem>
                <SelectItem value="concealed">Concealed/In-Wall</SelectItem>
                <SelectItem value="underground">Underground</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="chargerType">Charger Type</Label>
            <Select 
              value={formData.chargerType} 
              onValueChange={(value: any) => setFormData(prev => ({ ...prev, chargerType: value }))}
            >
              <SelectTrigger id="chargerType" data-testid="select-charger-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hardwired">Hardwired Charger</SelectItem>
                <SelectItem value="nema">NEMA Outlet (14-50)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Panel Information */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm text-foreground">Electrical Panel Information</h3>

          <div>
            <Label htmlFor="panelType">Panel Type</Label>
            <Select 
              value={formData.panelType} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, panelType: value }))}
            >
              <SelectTrigger id="panelType" data-testid="select-panel-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard Circuit Breaker</SelectItem>
                <SelectItem value="fuse">Fuse Box</SelectItem>
                <SelectItem value="subpanel">Subpanel</SelectItem>
                <SelectItem value="main">Main Service Panel</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="panelCapacity">Panel Capacity (amps)</Label>
            <Input
              id="panelCapacity"
              type="number"
              value={formData.panelCapacity}
              onChange={(e) => setFormData(prev => ({ ...prev, panelCapacity: parseInt(e.target.value) || 200 }))}
              data-testid="input-panel-capacity"
            />
          </div>

          <div>
            <Label htmlFor="availableSlots">Available Breaker Slots</Label>
            <Input
              id="availableSlots"
              type="number"
              min="0"
              value={formData.availableSlots}
              onChange={(e) => setFormData(prev => ({ ...prev, availableSlots: parseInt(e.target.value) || 0 }))}
              data-testid="input-available-slots"
            />
          </div>

          <div>
            <Label htmlFor="panelAge">Panel Age/Condition</Label>
            <Select 
              value={formData.panelAge} 
              onValueChange={(value: any) => setFormData(prev => ({ ...prev, panelAge: value }))}
            >
              <SelectTrigger id="panelAge" data-testid="select-panel-age">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New (less than 10 years)</SelectItem>
                <SelectItem value="old">Old (10+ years or outdated)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Pricing Configuration */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm text-foreground">Pricing Configuration</h3>

          <div>
            <Label htmlFor="laborRate">Labor Rate ($/hour)</Label>
            <Input
              id="laborRate"
              type="number"
              value={formData.laborRate}
              onChange={(e) => setFormData(prev => ({ ...prev, laborRate: parseFloat(e.target.value) || 95 }))}
              data-testid="input-labor-rate"
            />
          </div>

          <div>
            <Label htmlFor="markup">Business Markup (%)</Label>
            <Input
              id="markup"
              type="number"
              value={formData.markup}
              onChange={(e) => setFormData(prev => ({ ...prev, markup: parseFloat(e.target.value) || 20 }))}
              data-testid="input-markup"
            />
          </div>
        </div>

        {/* Optional Add-ons */}
        {config && config.optionalAddons.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-foreground">Optional Add-ons</h3>
            <div className="space-y-2">
              {config.optionalAddons.map((addon) => (
                <div 
                  key={addon.name} 
                  className="flex items-center gap-3 p-3 bg-muted rounded-md"
                  data-testid={`addon-${addon.name}`}
                >
                  <Checkbox
                    id={`addon-${addon.name}`}
                    checked={formData.selectedAddons.includes(addon.name)}
                    onCheckedChange={(checked) => handleAddonToggle(addon.name, checked as boolean)}
                  />
                  <Label htmlFor={`addon-${addon.name}`} className="flex-1 cursor-pointer">
                    {addon.name}
                    {addon.description && (
                      <span className="block text-xs text-muted-foreground">{addon.description}</span>
                    )}
                  </Label>
                  <span className="text-success font-semibold">
                    ${addon.price.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Generate Button */}
        <Button
          type="submit"
          className="w-full bg-success hover:bg-success/90 text-success-foreground min-h-11"
          disabled={generateQuoteMutation.isPending}
          data-testid="button-generate-quote"
        >
          {generateQuoteMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating Quote...
            </>
          ) : (
            <>
              <Calculator className="w-4 h-4 mr-2" />
              Generate Quote
            </>
          )}
        </Button>
      </form>
    </Card>
  );
}

// Helper function to map installation location
function mapInstallLocation(location?: string): string {
  const map: Record<string, string> = {
    "Garage": "garage-attached",
    "Attached Garage": "garage-attached",
    "Detached Garage": "garage-detached",
    "Driveway": "driveway",
    "Carport": "carport",
    "Exterior Wall": "exterior-wall",
  };
  return map[location || ""] || "garage-attached";
}
