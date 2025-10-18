import type { Express } from "express";
import { createServer, type Server } from "http";
import { 
  getProjects, 
  getProject, 
  updateProjectStatus,
  getPhotosForProject,
  getCompanyConfig,
  getOrCreateQuote,
  saveQuote,
  getQuoteByQuoteId,
  updateQuoteStatus,
  getAllQuotes,
  getQuoteVersions,
} from "./airtable";
import { generateQuote } from "./quote-logic";
import { QuoteForm, CustomerDecision } from "@shared/schema";
import { randomUUID } from "crypto";

// In-memory storage for shareable links (in production, use database)
const quoteLinks = new Map<string, string>(); // Maps quote ID to shareable token

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all projects
  app.get("/api/projects", async (req, res) => {
    try {
      const projects = await getProjects();
      res.json({ success: true, data: projects });
    } catch (error: any) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Get single project
  app.get("/api/projects/:projectId", async (req, res) => {
    try {
      const { projectId } = req.params;
      const project = await getProject(projectId);
      res.json({ success: true, data: project });
    } catch (error: any) {
      console.error("Error fetching project:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Update project status
  app.patch("/api/projects/:projectId/status", async (req, res) => {
    try {
      const { projectId } = req.params;
      const { status } = req.body;
      
      const updatedProject = await updateProjectStatus(projectId, status);
      res.json({ success: true, data: updatedProject });
    } catch (error: any) {
      console.error("Error updating project status:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Get photos for a project
  app.get("/api/photos/:projectId", async (req, res) => {
    try {
      const { projectId } = req.params;
      const photos = await getPhotosForProject(projectId);
      res.json({ success: true, data: photos });
    } catch (error: any) {
      console.error("Error fetching photos:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Get company config
  app.get("/api/company-config", async (req, res) => {
    try {
      const config = await getCompanyConfig();
      res.json({ success: true, data: config });
    } catch (error: any) {
      console.error("Error fetching company config:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Get all quotes with optional status filter
  app.get("/api/quotes", async (req, res) => {
    try {
      const { status } = req.query as { status?: string };
      const quotes = await getAllQuotes(status);
      res.json({ success: true, data: quotes });
    } catch (error: any) {
      console.error("Error fetching quotes:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Get all versions of a quote
  app.get("/api/quotes/:quoteId/versions", async (req, res) => {
    try {
      const { quoteId } = req.params;
      const versions = await getQuoteVersions(quoteId);
      res.json({ success: true, data: versions });
    } catch (error: any) {
      console.error("Error fetching quote versions:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Get or create quote ID for a project
  app.get("/api/get-or-create-quote", async (req, res) => {
    try {
      const { projectId } = req.query as { projectId: string };
      const result = await getOrCreateQuote(projectId);
      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error("Error getting/creating quote:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Generate quote
  app.post("/api/generate-quote", async (req, res) => {
    try {
      const formData: QuoteForm = req.body;
      
      // Ensure project has a Quote ID
      const { quoteId } = await getOrCreateQuote(formData.projectId);
      
      // Generate the quote
      const quote = await generateQuote(formData);
      quote.quoteId = quoteId; // Ensure we use the same Quote ID
      
      // Save quote to Airtable
      await saveQuote(quote);
      
      // Update project status to "Quote Draft"
      await updateProjectStatus(formData.projectId, "Quote Draft");
      
      res.json({ success: true, data: quote });
    } catch (error: any) {
      console.error("Error generating quote:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Send quote to customer (generate shareable link)
  app.post("/api/send-quote", async (req, res) => {
    try {
      const { quoteId, projectId } = req.body;
      
      // Generate a unique shareable token
      const shareableToken = randomUUID();
      quoteLinks.set(quoteId, shareableToken);
      
      // Build the shareable link
      const baseUrl = process.env.REPL_SLUG 
        ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
        : `http://localhost:${process.env.PORT || 5000}`;
      
      const shareableLink = `${baseUrl}/quote/${shareableToken}`;
      
      // Update project status to "Quote Sent"
      await updateProjectStatus(projectId, "Quote Sent");
      
      // Update quote status in Airtable
      await updateQuoteStatus(quoteId, "Sent");
      
      res.json({ success: true, data: { shareableLink, token: shareableToken } });
    } catch (error: any) {
      console.error("Error sending quote:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Get quote by shareable token (for customer view)
  app.get("/api/quote/:token", async (req, res) => {
    try {
      const { token } = req.params;
      
      // Find the quote ID for this token
      let quoteId: string | null = null;
      for (const [qId, qToken] of quoteLinks.entries()) {
        if (qToken === token) {
          quoteId = qId;
          break;
        }
      }
      
      if (!quoteId) {
        return res.status(404).json({ success: false, error: "Quote not found" });
      }
      
      // Get the quote data
      const quoteData = await getQuoteByQuoteId(quoteId);
      
      if (!quoteData) {
        return res.status(404).json({ success: false, error: "Quote not found" });
      }
      
      // Add the shareable link to the quote data
      const baseUrl = process.env.REPL_SLUG 
        ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
        : `http://localhost:${process.env.PORT || 5000}`;
      
      quoteData.shareableLink = `${baseUrl}/quote/${token}`;
      
      // Update project status to "Quote Viewed" if not already accepted/rejected
      const project = await getProject(quoteData.projectId);
      const currentStatus = project.fields["Project Status"];
      
      if (currentStatus === "Quote Sent") {
        await updateProjectStatus(quoteData.projectId, "Quote Viewed");
        await updateQuoteStatus(quoteId, "Viewed");
      }
      
      res.json({ success: true, data: quoteData });
    } catch (error: any) {
      console.error("Error fetching quote:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Customer decision (accept/reject)
  app.post("/api/customer-decision", async (req, res) => {
    try {
      const decision: CustomerDecision = req.body;
      
      // Update project status based on decision
      const newStatus = decision.decision === "accept" ? "Accepted" : "Rejected";
      await updateProjectStatus(decision.projectId, newStatus);
      
      // Update quote status in Airtable
      await updateQuoteStatus(decision.quoteId, decision.decision === "accept" ? "Accepted" : "Rejected");
      
      // In a real application, you would send an email notification to the contractor here
      console.log(`Customer ${decision.decision} quote ${decision.quoteId}`);
      if (decision.reason) {
        console.log(`Reason: ${decision.reason}`);
      }
      
      res.json({ success: true, data: { status: newStatus } });
    } catch (error: any) {
      console.error("Error processing customer decision:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
