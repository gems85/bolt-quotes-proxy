import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ContractorDashboard from "@/pages/contractor-dashboard";
import QuotesDashboard from "@/pages/quotes-dashboard";
import CustomerQuoteView from "@/pages/customer-quote-view";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={ContractorDashboard} />
      <Route path="/quotes" component={QuotesDashboard} />
      <Route path="/quote/:quoteId" component={CustomerQuoteView} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
