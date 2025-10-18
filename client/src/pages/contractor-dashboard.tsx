import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ProjectSelector } from "@/components/quote-generator/project-selector";
import { CustomerInfo } from "@/components/quote-generator/customer-info";
import { PhotosSection } from "@/components/quote-generator/photos-section";
import { AssessmentForm } from "@/components/quote-generator/assessment-form";
import { QuotePreview } from "@/components/quote-generator/quote-preview";
import { Quote } from "@/shared/schema";
import { AlertCircle, FileText } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function ContractorDashboard() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [generatedQuote, setGeneratedQuote] = useState<Quote | null>(null);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#2c3e50] to-primary text-white py-5">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-1">⚡ EV Charger Quote Generator</h1>
              <p className="text-sm opacity-90">Professional EV Charger Installation Quotes</p>
            </div>
            <Link href="/quotes">
              <Button variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/30" data-testid="button-view-all-quotes">
                <FileText className="w-4 h-4 mr-2" />
                View All Quotes
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="container mx-auto px-4 py-5 max-w-[1400px]">
        {/* Project Selector */}
        <ProjectSelector 
          selectedProjectId={selectedProjectId}
          onProjectSelect={setSelectedProjectId}
          onQuoteGenerated={(quote) => {
            setGeneratedQuote(quote);
          }}
        />

        {/* Main Grid */}
        {selectedProjectId ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
            {/* Left Column */}
            <div className="flex flex-col gap-5">
              <CustomerInfo projectId={selectedProjectId} />
              <PhotosSection projectId={selectedProjectId} />
              <AssessmentForm 
                projectId={selectedProjectId}
                onQuoteGenerated={setGeneratedQuote}
              />
            </div>

            {/* Right Column - Quote Preview */}
            <div className="lg:sticky lg:top-5 lg:self-start">
              {generatedQuote ? (
                <QuotePreview quote={generatedQuote} />
              ) : (
                <div className="bg-card rounded-lg p-8 shadow-sm border border-card-border">
                  <div className="text-center text-muted-foreground">
                    <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">No quote generated yet</p>
                    <p className="text-sm mt-1">Fill out the assessment form and click "Generate Quote"</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <Alert className="mt-5" data-testid="alert-select-project">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please select a project from the dropdown above to begin generating a quote.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
