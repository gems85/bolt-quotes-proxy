import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Quote } from "@/shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Send, Copy, CheckCircle2, Loader2, AlertCircle, Download } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { generateQuotePDF, downloadPDF } from "@/lib/pdf-generator";

interface QuotePreviewProps {
  quote: Quote;
}

export function QuotePreview({ quote }: QuotePreviewProps) {
  const { toast } = useToast();
  const [shareableLink, setShareableLink] = useState(quote.shareableLink || "");
  const [linkCopied, setLinkCopied] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handleDownloadPDF = async () => {
    try {
      setIsGeneratingPDF(true);
      const pdfBlob = await generateQuotePDF(quote);
      downloadPDF(pdfBlob, `Quote-${quote.quoteId}.pdf`);
      toast({
        title: "PDF Downloaded",
        description: "Quote PDF has been downloaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const sendQuoteMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/send-quote", { quoteId: quote.quoteId, projectId: quote.projectId });
    },
    onSuccess: (response) => {
      if (response.success && response.data?.shareableLink) {
        setShareableLink(response.data.shareableLink);
        queryClient.invalidateQueries({ queryKey: ["/api/projects", quote.projectId] });
        toast({
          title: "Quote Sent",
          description: "Shareable link has been generated. You can now send it to the customer.",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate shareable link.",
        variant: "destructive",
      });
    },
  });

  const copyLink = () => {
    if (shareableLink) {
      navigator.clipboard.writeText(shareableLink);
      setLinkCopied(true);
      toast({
        title: "Link Copied",
        description: "Shareable link has been copied to clipboard.",
      });
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
    <div className="space-y-5">
      {/* Action Buttons */}
      {!shareableLink && (
        <Card className="p-4 space-y-3" data-testid="card-send-quote">
          <Button
            onClick={() => sendQuoteMutation.mutate()}
            disabled={sendQuoteMutation.isPending}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground min-h-11"
            data-testid="button-send-to-customer"
          >
            {sendQuoteMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating Link...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send to Customer
              </>
            )}
          </Button>
          <Button
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF}
            variant="outline"
            className="w-full min-h-11"
            data-testid="button-download-pdf"
          >
            {isGeneratingPDF ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </>
            )}
          </Button>
        </Card>
      )}

      {/* Shareable Link Display */}
      {shareableLink && (
        <div className="space-y-3">
          <Card className="p-4 bg-success/10 border-success" data-testid="card-shareable-link">
            <Label htmlFor="shareable-link" className="text-success font-semibold mb-2 block">
              Shareable Customer Link
            </Label>
            <div className="flex gap-2">
              <Input
                id="shareable-link"
                value={shareableLink}
                readOnly
                className="flex-1 bg-background"
                data-testid="input-shareable-link"
              />
              <Button
                onClick={copyLink}
                variant="outline"
                className="border-success text-success hover:bg-success hover:text-success-foreground"
                data-testid="button-copy-link"
              >
                {linkCopied ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Send this link to your customer to view and accept/reject the quote.
            </p>
          </Card>
          <Button
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF}
            variant="outline"
            className="w-full"
            data-testid="button-download-pdf-sent"
          >
            {isGeneratingPDF ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </>
            )}
          </Button>
        </div>
      )}

      {/* Quote Preview */}
      <Card className="p-6 overflow-hidden" data-testid="card-quote-preview">
        {/* Header */}
        <div className="text-center border-b-[3px] border-primary pb-4 mb-5">
          <h2 className="text-2xl font-bold text-foreground mb-2">Professional Installation Quote</h2>
          <div className="flex justify-between text-sm text-muted-foreground mt-3">
            <div><strong>Quote ID:</strong> {quote.quoteId}</div>
            <div><strong>Date:</strong> {quote.date}</div>
          </div>
        </div>

        {/* Validity Notice */}
        <Alert className="bg-warning/10 border-warning mb-5">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Quote Valid Until:</strong> {quote.validUntil} (30 days from quote date)
          </AlertDescription>
        </Alert>

        {/* Customer Section */}
        <div className="mb-5 p-5 bg-muted/30 rounded-lg">
          <h3 className="text-foreground font-semibold mb-3">Customer Information</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground font-semibold mb-1">Name</p>
              <p className="text-foreground font-medium">{quote.customer.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold mb-1">Email</p>
              <p className="text-foreground font-medium">{quote.customer.email}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold mb-1">Phone</p>
              <p className="text-foreground font-medium">{quote.customer.phone}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground font-semibold mb-1">Address</p>
              <p className="text-foreground font-medium">{quote.customer.address}</p>
            </div>
          </div>
        </div>

        {/* Installation Overview */}
        {quote.vehicle && (
          <div className="mb-5">
            <h3 className="text-foreground font-semibold mb-3">Installation Overview</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-muted/30 rounded-lg border-l-4 border-l-primary">
                <p className="text-xs text-muted-foreground mb-1">Vehicle</p>
                <p className="text-sm font-semibold text-foreground">{quote.vehicle.make} {quote.vehicle.model}</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg border-l-4 border-l-primary">
                <p className="text-xs text-muted-foreground mb-1">Location</p>
                <p className="text-sm font-semibold text-foreground">{quote.installation.location}</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg border-l-4 border-l-primary">
                <p className="text-xs text-muted-foreground mb-1">Distance</p>
                <p className="text-sm font-semibold text-foreground">{quote.installation.distance} ft</p>
              </div>
            </div>
          </div>
        )}

        {/* Price Breakdown */}
        <div className="mb-5 overflow-hidden rounded-lg border border-border">
          <div className="bg-[#2c3e50] text-white p-3">
            <h3 className="font-semibold">Price Breakdown</h3>
          </div>

          <div className="divide-y divide-border">
            <div className="flex justify-between p-3 text-sm hover-elevate">
              <span className="text-foreground font-medium">Materials & Equipment</span>
              <span className="text-success font-semibold">{formatCurrency(quote.pricing.materials)}</span>
            </div>
            <div className="flex justify-between p-3 text-sm hover-elevate">
              <span className="text-foreground font-medium">Labor ({quote.pricing.laborHours} hours)</span>
              <span className="text-success font-semibold">{formatCurrency(quote.pricing.labor)}</span>
            </div>
            <div className="flex justify-between p-3 text-sm hover-elevate">
              <span className="text-foreground font-medium">Conduit & Wiring</span>
              <span className="text-success font-semibold">{formatCurrency(quote.pricing.conduit)}</span>
            </div>
            {quote.pricing.permit > 0 && (
              <div className="flex justify-between p-3 text-sm hover-elevate">
                <span className="text-foreground font-medium">Permit Fees</span>
                <span className="text-success font-semibold">{formatCurrency(quote.pricing.permit)}</span>
              </div>
            )}
          </div>

          {/* Additional Services */}
          {quote.pricing.additionalServices.length > 0 && (
            <>
              <div className="bg-muted p-3 text-sm font-semibold text-foreground">Additional Services Required</div>
              <div className="divide-y divide-border">
                {quote.pricing.additionalServices.map((service, idx) => (
                  <div key={idx} className="flex justify-between p-3 text-sm hover-elevate">
                    <span className="text-foreground font-medium">{service.name}</span>
                    <span className="text-success font-semibold">{formatCurrency(service.cost)}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Selected Add-ons */}
          {quote.pricing.selectedAddons.length > 0 && (
            <>
              <div className="bg-muted p-3 text-sm font-semibold text-foreground">Optional Add-ons Selected</div>
              <div className="divide-y divide-border">
                {quote.pricing.selectedAddons.map((addon, idx) => (
                  <div key={idx} className="flex justify-between p-3 text-sm hover-elevate">
                    <span className="text-foreground font-medium">{addon.name}</span>
                    <span className="text-success font-semibold">{formatCurrency(addon.price)}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Subtotal, Markup, Tax */}
          <div className="bg-muted">
            <div className="flex justify-between p-3 font-semibold text-foreground">
              <span>Subtotal</span>
              <span>{formatCurrency(quote.pricing.subtotal)}</span>
            </div>
          </div>
          <div className="flex justify-between p-3 text-sm hover-elevate">
            <span className="text-foreground font-medium">Business Markup ({quote.pricing.markup}%)</span>
            <span className="text-success font-semibold">{formatCurrency(quote.pricing.markupAmount)}</span>
          </div>
          <div className="flex justify-between p-3 text-sm hover-elevate">
            <span className="text-foreground font-medium">Sales Tax ({quote.pricing.salesTaxRate}%)</span>
            <span className="text-success font-semibold">{formatCurrency(quote.pricing.salesTax)}</span>
          </div>

          {/* Total */}
          <div className="bg-success text-success-foreground p-4">
            <div className="flex justify-between text-lg font-bold">
              <span>Total Investment</span>
              <span>{formatCurrency(quote.pricing.total)}</span>
            </div>
          </div>
        </div>

        {/* Rebates */}
        {quote.rebates && quote.rebates.length > 0 && (
          <div className="mb-5 p-5 bg-success/10 rounded-lg border-l-4 border-l-success">
            <h3 className="text-success font-semibold mb-3">Available Rebates & Incentives</h3>
            <div className="space-y-3">
              {quote.rebates.map((rebate, idx) => (
                <div key={idx} className="pb-3 border-b border-success/20 last:border-0">
                  <p className="font-semibold text-success text-sm">{rebate.name}</p>
                  <p className="text-lg font-bold text-success my-1">{formatCurrency(rebate.amount)}</p>
                  {rebate.description && <p className="text-xs text-foreground">{rebate.description}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Financing */}
        {quote.financingOptions && quote.financingOptions.length > 0 && (
          <div className="p-5 bg-info/10 rounded-lg border-l-4 border-l-info">
            <h3 className="text-info font-semibold mb-3">Financing Options Available</h3>
            <div className="grid grid-cols-3 gap-3">
              {quote.financingOptions.map((plan, idx) => (
                <div key={idx} className="p-3 bg-background rounded-lg border border-info/30">
                  <p className="font-semibold text-info text-sm mb-1">{plan.term}</p>
                  <p className="text-base font-bold text-info mb-1">{formatCurrency(plan.monthlyPayment)}/mo</p>
                  <p className="text-xs text-muted-foreground">{plan.apr}% APR</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
