import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Eye, Send, ArrowLeft, History } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { VersionHistoryDialog } from "@/components/version-history-dialog";

export default function QuotesDashboard() {
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [versionHistoryQuoteId, setVersionHistoryQuoteId] = useState<string | null>(null);

  const { data: quotesData, isLoading } = useQuery<{ success: boolean; data: any[] }>({
    queryKey: ["/api/quotes", statusFilter],
    enabled: true,
  });

  const quotes = quotesData?.data || [];

  const filteredQuotes = quotes.filter((quote: any) => {
    const matchesSearch = 
      quote.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.quoteId?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case "accepted":
        return "default";
      case "rejected":
        return "destructive";
      case "quote sent":
      case "quote viewed":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <header className="bg-gradient-to-r from-blue-600 to-green-600 text-white p-6 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold" data-testid="text-page-title">Quotes Dashboard</h1>
              <p className="text-blue-100 mt-1">Manage all your EV charger installation quotes</p>
            </div>
            <Link href="/">
              <Button variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/30" data-testid="button-back-to-generator">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Generator
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>All Quotes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search by customer name or quote ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-quotes"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Statuses</SelectItem>
                  <SelectItem value="Quote Draft">Draft</SelectItem>
                  <SelectItem value="Quote Sent">Sent</SelectItem>
                  <SelectItem value="Quote Viewed">Viewed</SelectItem>
                  <SelectItem value="Accepted">Accepted</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredQuotes.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No quotes found</p>
                {searchTerm && <p className="text-sm mt-2">Try adjusting your search</p>}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Quote ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredQuotes.map((quote: any) => (
                      <TableRow key={quote.id} data-testid={`row-quote-${quote.quoteId}`}>
                        <TableCell className="font-mono text-sm" data-testid={`text-quote-id-${quote.quoteId}`}>
                          {quote.quoteId}
                        </TableCell>
                        <TableCell className="font-medium">{quote.customerName}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {quote.customerEmail}
                        </TableCell>
                        <TableCell className="font-semibold">
                          ${quote.totalAmount?.toFixed(2) || '0.00'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(quote.status)} data-testid={`badge-status-${quote.quoteId}`}>
                            {quote.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {quote.dateCreated ? format(new Date(quote.dateCreated), 'MMM d, yyyy') : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              data-testid={`button-history-${quote.quoteId}`}
                              onClick={() => setVersionHistoryQuoteId(quote.quoteId)}
                            >
                              <History className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              data-testid={`button-view-${quote.quoteId}`}
                              onClick={() => {
                                // TODO: Navigate to quote detail view
                                console.log("View quote:", quote.quoteId);
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {quote.status === "Quote Draft" && (
                              <Button
                                size="sm"
                                variant="outline"
                                data-testid={`button-send-${quote.quoteId}`}
                                onClick={() => {
                                  // TODO: Resend quote
                                  console.log("Resend quote:", quote.quoteId);
                                }}
                              >
                                <Send className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="text-sm text-muted-foreground">
              Showing {filteredQuotes.length} of {quotes.length} quotes
            </div>
          </CardContent>
        </Card>
      </main>

      <VersionHistoryDialog
        quoteId={versionHistoryQuoteId || ""}
        open={!!versionHistoryQuoteId}
        onOpenChange={(open) => !open && setVersionHistoryQuoteId(null)}
      />
    </div>
  );
}
