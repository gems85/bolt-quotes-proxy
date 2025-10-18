import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Quote, CustomerDecision } from "@/shared/schema";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function CustomerQuoteView() {
  const [, params] = useRoute("/quote/:quoteId");
  const quoteId = params?.quoteId || "";
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [decisionMade, setDecisionMade] = useState(false);
  const { toast } = useToast();

  const { data: quote, isLoading, error } = useQuery<Quote>({
    queryKey: ["/api/quote", quoteId],
    enabled: !!quoteId,
  });

  const submitDecisionMutation = useMutation({
    mutationFn: async (decision: CustomerDecision) => {
      return await apiRequest("POST", "/api/customer-decision", decision);
    },
    onSuccess: () => {
      setDecisionMade(true);
      toast({
        title: "Decision Submitted",
        description: "Your response has been recorded and the contractor has been notified.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit your decision. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAccept = () => {
    if (!quote) return;
    submitDecisionMutation.mutate({
      quoteId: quote.quoteId,
      projectId: quote.projectId,
      decision: "accept",
    });
  };

  const handleReject = () => {
    if (!quote) return;
    submitDecisionMutation.mutate({
      quoteId: quote.quoteId,
      projectId: quote.projectId,
      decision: "reject",
      reason: rejectReason,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary mb-3" />
          <p className="text-muted-foreground">Loading your quote...</p>
        </div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Unable to load quote. The link may be invalid or expired.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Gradient */}
      <div className="bg-gradient-to-r from-[#2c3e50] to-primary text-white py-6 border-b-[3px] border-primary">
        <div className="container mx-auto px-4 max-w-4xl">
          <h1 className="text-3xl font-bold text-center mb-2">EV Charger Installation Quote</h1>
          <p className="text-center text-sm opacity-90">Professional Installation Estimate</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Decision Success Message */}
        {decisionMade && (
          <Alert className="mb-6 bg-success/10 border-success text-success-foreground" data-testid="alert-decision-success">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              Thank you! Your decision has been submitted successfully.
            </AlertDescription>
          </Alert>
        )}

        {/* Quote Header */}
        <Card className="mb-6 p-6" data-testid="card-quote-header">
          <div className="text-center border-b border-border pb-4 mb-4">
            <h2 className="text-primary text-2xl font-semibold mb-2">Quote Details</h2>
            <div className="flex justify-between text-sm text-muted-foreground mt-3">
              <div><strong>Quote ID:</strong> {quote.quoteId}</div>
              <div><strong>Date:</strong> {quote.date}</div>
            </div>
          </div>

          <Alert className="bg-warning/10 border-warning" data-testid="alert-validity">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Quote Valid Until:</strong> {quote.validUntil} (30 days from quote date)
            </AlertDescription>
          </Alert>
        </Card>

        {/* Customer Information */}
        <Card className="mb-6 p-6 bg-muted/30" data-testid="card-customer-info">
          <h3 className="text-lg font-semibold mb-4">Customer Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground font-semibold mb-1">Name</p>
              <p className="text-foreground font-medium" data-testid="text-customer-name">{quote.customer.name}</p>
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
        </Card>

        {/* Installation Overview */}
        {quote.vehicle && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Installation Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Card className="p-4 bg-muted/30 border-l-4 border-l-primary" data-testid="card-vehicle">
                <p className="text-xs text-muted-foreground mb-1">Vehicle to Charge</p>
                <p className="text-base font-semibold text-foreground">{quote.vehicle.make} {quote.vehicle.model}</p>
              </Card>
              <Card className="p-4 bg-muted/30 border-l-4 border-l-primary">
                <p className="text-xs text-muted-foreground mb-1">Installation Location</p>
                <p className="text-base font-semibold text-foreground">{quote.installation.location}</p>
              </Card>
              <Card className="p-4 bg-muted/30 border-l-4 border-l-primary">
                <p className="text-xs text-muted-foreground mb-1">Distance from Panel</p>
                <p className="text-base font-semibold text-foreground">{quote.installation.distance} feet</p>
              </Card>
            </div>
          </div>
        )}

        {/* Price Breakdown */}
        <Card className="mb-6 overflow-hidden" data-testid="card-pricing">
          <div className="bg-[#2c3e50] text-white p-4">
            <h3 className="text-lg font-semibold">Price Breakdown</h3>
          </div>

          <div className="divide-y divide-border">
            <div className="flex justify-between p-3 hover-elevate" data-testid="item-materials">
              <span className="text-foreground font-medium">Materials & Equipment</span>
              <span className="text-success font-semibold">{formatCurrency(quote.pricing.materials)}</span>
            </div>
            <div className="flex justify-between p-3 hover-elevate" data-testid="item-labor">
              <span className="text-foreground font-medium">Labor ({quote.pricing.laborHours} hours)</span>
              <span className="text-success font-semibold">{formatCurrency(quote.pricing.labor)}</span>
            </div>
            <div className="flex justify-between p-3 hover-elevate">
              <span className="text-foreground font-medium">Conduit & Wiring</span>
              <span className="text-success font-semibold">{formatCurrency(quote.pricing.conduit)}</span>
            </div>
            {quote.pricing.permit > 0 && (
              <div className="flex justify-between p-3 hover-elevate">
                <span className="text-foreground font-medium">Permit Fees</span>
                <span className="text-success font-semibold">{formatCurrency(quote.pricing.permit)}</span>
              </div>
            )}
          </div>

          {/* Additional Services */}
          {quote.pricing.additionalServices.length > 0 && (
            <>
              <div className="bg-muted p-3 font-semibold text-foreground">Additional Services Required</div>
              <div className="divide-y divide-border">
                {quote.pricing.additionalServices.map((service, idx) => (
                  <div key={idx} className="flex justify-between p-3 hover-elevate">
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
              <div className="bg-muted p-3 font-semibold text-foreground">Optional Add-ons Selected</div>
              <div className="divide-y divide-border">
                {quote.pricing.selectedAddons.map((addon, idx) => (
                  <div key={idx} className="flex justify-between p-3 hover-elevate">
                    <span className="text-foreground font-medium">{addon.name}</span>
                    <span className="text-success font-semibold">{formatCurrency(addon.price)}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Subtotal, Markup, Tax */}
          <div className="bg-muted">
            <div className="flex justify-between p-4 font-semibold text-foreground" data-testid="item-subtotal">
              <span>Subtotal</span>
              <span>{formatCurrency(quote.pricing.subtotal)}</span>
            </div>
          </div>
          <div className="flex justify-between p-3 hover-elevate">
            <span className="text-foreground font-medium">Business Markup ({quote.pricing.markup}%)</span>
            <span className="text-success font-semibold">{formatCurrency(quote.pricing.markupAmount)}</span>
          </div>
          <div className="flex justify-between p-3 hover-elevate" data-testid="item-tax">
            <span className="text-foreground font-medium">Sales Tax ({quote.pricing.salesTaxRate}%)</span>
            <span className="text-success font-semibold">{formatCurrency(quote.pricing.salesTax)}</span>
          </div>

          {/* Total */}
          <div className="bg-success text-success-foreground p-5" data-testid="item-total">
            <div className="flex justify-between text-xl font-bold">
              <span>Total Investment</span>
              <span>{formatCurrency(quote.pricing.total)}</span>
            </div>
          </div>
        </Card>

        {/* Rebates */}
        {quote.rebates && quote.rebates.length > 0 && (
          <Card className="mb-6 p-5 bg-success/10 border-l-4 border-l-success" data-testid="card-rebates">
            <h3 className="text-success font-semibold text-lg mb-3">Available Rebates & Incentives</h3>
            <div className="space-y-3">
              {quote.rebates.map((rebate, idx) => (
                <div key={idx} className="pb-3 border-b border-success/20 last:border-0">
                  <p className="font-semibold text-success">{rebate.name}</p>
                  <p className="text-xl font-bold text-success my-1">{formatCurrency(rebate.amount)}</p>
                  {rebate.description && <p className="text-sm text-foreground">{rebate.description}</p>}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Financing Options */}
        {quote.financingOptions && quote.financingOptions.length > 0 && (
          <Card className="mb-6 p-5 bg-info/10 border-l-4 border-l-info" data-testid="card-financing">
            <h3 className="text-info font-semibold text-lg mb-3">Financing Options Available</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {quote.financingOptions.map((plan, idx) => (
                <Card key={idx} className="p-4 bg-background border border-info/30">
                  <p className="font-semibold text-info mb-1">{plan.term}</p>
                  <p className="text-xl font-bold text-info mb-1">{formatCurrency(plan.monthlyPayment)}/mo</p>
                  <p className="text-xs text-muted-foreground">{plan.apr}% APR</p>
                </Card>
              ))}
            </div>
          </Card>
        )}

        {/* Decision Buttons */}
        {!decisionMade && (
          <Card className="p-6 bg-card" data-testid="card-decision-buttons">
            <h3 className="text-lg font-semibold mb-4">Ready to proceed?</h3>
            
            {!showRejectReason ? (
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  size="lg"
                  onClick={handleAccept}
                  disabled={submitDecisionMutation.isPending}
                  className="flex-1 bg-success hover:bg-success/90 text-success-foreground min-h-12"
                  data-testid="button-accept-quote"
                >
                  {submitDecisionMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5 mr-2" />
                      Accept Quote
                    </>
                  )}
                </Button>
                <Button 
                  size="lg"
                  variant="outline"
                  onClick={() => setShowRejectReason(true)}
                  className="flex-1 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground min-h-12"
                  data-testid="button-reject-quote"
                >
                  <XCircle className="w-5 h-5 mr-2" />
                  Reject Quote
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="reject-reason">Please tell us why you're rejecting this quote (optional)</Label>
                  <Textarea
                    id="reject-reason"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="e.g., Price too high, looking for different options, etc."
                    className="mt-2"
                    rows={4}
                    data-testid="textarea-reject-reason"
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={handleReject}
                    disabled={submitDecisionMutation.isPending}
                    variant="destructive"
                    className="flex-1"
                    data-testid="button-submit-rejection"
                  >
                    {submitDecisionMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Submit Rejection"
                    )}
                  </Button>
                  <Button
                    onClick={() => {
                      setShowRejectReason(false);
                      setRejectReason("");
                    }}
                    variant="outline"
                    data-testid="button-cancel-rejection"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
