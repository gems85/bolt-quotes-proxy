// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/airtable.ts
var AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
var AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || "appAzWKnR9zyGX5dC";
if (!AIRTABLE_API_KEY) {
  console.error("\u274C AIRTABLE_API_KEY is not set in environment variables!");
  console.error("Please add your Airtable Personal Access Token to Replit Secrets");
}
if (!AIRTABLE_BASE_ID) {
  console.error("\u274C AIRTABLE_BASE_ID is not set in environment variables!");
  console.error("Please add your Airtable Base ID to Replit Secrets or .env file");
}
var PROJECTS_TABLE = process.env.PROJECTS_TABLE || "PROJECTS";
var PHOTOS_TABLE = process.env.PHOTOS_TABLE || "PHOTOS";
var QUOTES_TABLE = process.env.QUOTES_TABLE || "QUOTES";
var COMPANY_CONFIG_TABLE = process.env.COMPANY_CONFIG_TABLE || "COMPANY_CONFIG";
var EV_SPECS_TABLE = process.env.EV_SPECS_TABLE || "EV_CHARGING_SPECS";
console.log("\u2713 Airtable Configuration:");
console.log(`  Base ID: ${AIRTABLE_BASE_ID}`);
console.log(`  API Key: ${AIRTABLE_API_KEY ? "***" + AIRTABLE_API_KEY.slice(-4) : "NOT SET"}`);
console.log(`  Tables: ${PROJECTS_TABLE}, ${PHOTOS_TABLE}, ${QUOTES_TABLE}`);
async function airtableRequest(endpoint, method = "GET", body) {
  if (!AIRTABLE_API_KEY) {
    throw new Error("Airtable is not configured. Please add AIRTABLE_API_KEY to your environment variables.");
  }
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${endpoint}`;
  const headers = {
    "Authorization": `Bearer ${AIRTABLE_API_KEY}`,
    "Content-Type": "application/json"
  };
  const options = {
    method,
    headers
  };
  if (body && (method === "POST" || method === "PATCH")) {
    options.body = JSON.stringify(body);
  }
  const response = await fetch(url, options);
  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === 403 || response.status === 401) {
      throw new Error(`Airtable authentication failed. Please check:
1. Your API key is valid
2. The API key has access to base ${AIRTABLE_BASE_ID}
3. The table names are correct (${PROJECTS_TABLE}, ${PHOTOS_TABLE}, etc.)

Error: ${errorText}`);
    }
    throw new Error(`Airtable API error: ${response.status} - ${errorText}`);
  }
  return await response.json();
}
async function getProjects() {
  const response = await airtableRequest(`${PROJECTS_TABLE}?view=Grid%20view`);
  return response.records;
}
async function getProject(projectId) {
  return await airtableRequest(`${PROJECTS_TABLE}/${projectId}`);
}
async function updateProjectStatus(projectId, status) {
  return await airtableRequest(`${PROJECTS_TABLE}/${projectId}`, "PATCH", {
    fields: {
      "Project Status": status
    }
  });
}
async function getPhotosForProject(projectId) {
  const filterFormula = `FIND('${projectId}', ARRAYJOIN({Project}))`;
  const response = await airtableRequest(
    `${PHOTOS_TABLE}?filterByFormula=${encodeURIComponent(filterFormula)}`
  );
  return response.records;
}
async function getCompanyConfig() {
  const response = await airtableRequest(`${COMPANY_CONFIG_TABLE}?maxRecords=1`);
  if (response.records.length === 0) {
    return {
      companyName: "EV Charge Pro",
      includedFootage: 20,
      laborRate: 95,
      defaultMarkup: 20,
      optionalAddons: [],
      rebates: [],
      financingPlans: [],
      stateTaxRates: { GA: 4 }
    };
  }
  const fields = response.records[0].fields;
  const parseJsonField = (field) => {
    if (typeof field === "string") {
      try {
        return JSON.parse(field);
      } catch {
        return [];
      }
    }
    return field || [];
  };
  return {
    companyName: fields["Company Name"] || "EV Charge Pro",
    includedFootage: fields["Included Footage"] || 20,
    laborRate: fields["Labor Rate"] || 95,
    defaultMarkup: fields["Default Markup"] || 20,
    optionalAddons: parseJsonField(fields["Optional Addons"]),
    rebates: parseJsonField(fields["Rebates"]),
    financingPlans: parseJsonField(fields["Financing Plans"]),
    stateTaxRates: parseJsonField(fields["State Tax Rates"])
  };
}
async function getEVSpecs() {
  try {
    const response = await airtableRequest(EV_SPECS_TABLE);
    const specs = {};
    response.records.forEach((record) => {
      const fields = record.fields;
      const vehicle = fields["Vehicle"] || "";
      if (vehicle) {
        specs[vehicle] = {
          recommendedCharger: fields["Recommended Charger"] || "Level 2, 240V",
          maxChargingPower: fields["Max Charging Power"] || "N/A",
          chargingSpeed: fields["Charging Speed"] || "N/A"
        };
      }
    });
    return specs;
  } catch (error) {
    console.error("Error fetching EV specs:", error);
    return {};
  }
}
async function getOrCreateQuote(projectId) {
  const project = await getProject(projectId);
  if (project.fields["Quote ID"]) {
    return { quoteId: project.fields["Quote ID"], created: false };
  }
  const quoteId = `EV-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  await airtableRequest(`PROJECTS/${projectId}`, "PATCH", {
    fields: {
      "Quote ID": quoteId
    }
  });
  return { quoteId, created: true };
}
async function saveQuote(quoteData, isRevision = false) {
  let version = 1;
  if (isRevision) {
    const existingVersions = await getQuoteVersions(quoteData.quoteId);
    if (existingVersions.length > 0) {
      const maxVersion = Math.max(...existingVersions.map((v) => v.version || 1));
      version = maxVersion + 1;
    }
  }
  return await airtableRequest(QUOTES_TABLE, "POST", {
    fields: {
      "Quote ID": quoteData.quoteId,
      "Project ID": quoteData.projectId,
      "Customer Name": quoteData.customer.name,
      "Customer Email": quoteData.customer.email,
      "Total Amount": quoteData.pricing.total,
      "Quote Data": JSON.stringify(quoteData),
      "Status": quoteData.status,
      "Date Created": (/* @__PURE__ */ new Date()).toISOString(),
      "Version": version,
      "Modified By": "System"
    }
  });
}
async function updateQuoteStatus(quoteId, status) {
  const filterFormula = `{Quote ID} = '${quoteId}'`;
  const response = await airtableRequest(
    `${QUOTES_TABLE}?filterByFormula=${encodeURIComponent(filterFormula)}&maxRecords=1`
  );
  if (response.records.length > 0) {
    const recordId = response.records[0].id;
    await airtableRequest(`${QUOTES_TABLE}/${recordId}`, "PATCH", {
      fields: {
        Status: status
      }
    });
  }
}
async function getQuoteByQuoteId(quoteId) {
  const filterFormula = `{Quote ID} = '${quoteId}'`;
  const response = await airtableRequest(
    `${QUOTES_TABLE}?filterByFormula=${encodeURIComponent(filterFormula)}&maxRecords=1`
  );
  if (response.records.length === 0) {
    return null;
  }
  const quoteRecord = response.records[0];
  const quoteDataStr = quoteRecord.fields["Quote Data"];
  if (typeof quoteDataStr === "string") {
    try {
      return JSON.parse(quoteDataStr);
    } catch (error) {
      console.error("Error parsing quote data:", error);
      return null;
    }
  }
  return quoteDataStr || null;
}
async function getQuoteVersions(quoteId) {
  const filterFormula = `{Quote ID} = '${quoteId}'`;
  const endpoint = `${QUOTES_TABLE}?filterByFormula=${encodeURIComponent(filterFormula)}&sort%5B0%5D%5Bfield%5D=Version&sort%5B0%5D%5Bdirection%5D=desc`;
  const response = await airtableRequest(endpoint);
  return response.records.map((record) => {
    const fields = record.fields;
    let quoteData = null;
    if (typeof fields["Quote Data"] === "string") {
      try {
        quoteData = JSON.parse(fields["Quote Data"]);
      } catch (error) {
        console.error("Error parsing quote data:", error);
      }
    }
    return {
      id: record.id,
      quoteId: fields["Quote ID"],
      projectId: fields["Project ID"],
      customerName: fields["Customer Name"],
      customerEmail: fields["Customer Email"],
      totalAmount: fields["Total Amount"],
      quoteData,
      status: fields["Status"],
      dateCreated: fields["Date Created"],
      version: fields["Version"] || 1,
      modifiedBy: fields["Modified By"] || "Unknown"
    };
  });
}
async function getAllQuotes(statusFilter) {
  let endpoint = `${QUOTES_TABLE}?sort%5B0%5D%5Bfield%5D=Date%20Created&sort%5B0%5D%5Bdirection%5D=desc`;
  if (statusFilter && statusFilter !== "All") {
    const filterFormula = `{Status} = '${statusFilter}'`;
    endpoint += `&filterByFormula=${encodeURIComponent(filterFormula)}`;
  }
  const response = await airtableRequest(endpoint);
  const allQuotes = response.records.map((record) => {
    const fields = record.fields;
    let quoteData = null;
    if (typeof fields["Quote Data"] === "string") {
      try {
        quoteData = JSON.parse(fields["Quote Data"]);
      } catch (error) {
        console.error("Error parsing quote data:", error);
      }
    }
    return {
      id: record.id,
      quoteId: fields["Quote ID"],
      projectId: fields["Project ID"],
      customerName: fields["Customer Name"],
      customerEmail: fields["Customer Email"],
      totalAmount: fields["Total Amount"],
      quoteData,
      status: fields["Status"],
      dateCreated: fields["Date Created"],
      version: fields["Version"] || 1,
      modifiedBy: fields["Modified By"] || "Unknown"
    };
  });
  const latestQuotes = /* @__PURE__ */ new Map();
  allQuotes.forEach((quote) => {
    const existing = latestQuotes.get(quote.quoteId);
    if (!existing || quote.version > existing.version) {
      latestQuotes.set(quote.quoteId, quote);
    }
  });
  return Array.from(latestQuotes.values());
}

// server/quote-logic.ts
async function generateQuote(formData) {
  const [project, config, evSpecs] = await Promise.all([
    getProject(formData.projectId),
    getCompanyConfig(),
    getEVSpecs()
  ]);
  const fields = project.fields;
  const quoteId = fields["Quote ID"] || `EV-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  const customer = {
    name: fields["Customer Name"] || "N/A",
    email: fields["Customer Email"] || "N/A",
    phone: fields["Customer Phone"] || "N/A",
    address: fields["Customer Address"] || "N/A"
  };
  const evMake = fields["EV Make"] || "";
  const evModel = fields["EV Model"] || "";
  const fullVehicleName = `${evMake} ${evModel}`.trim();
  const vehicleSpecs = evSpecs[fullVehicleName];
  const vehicle = fullVehicleName ? {
    make: evMake,
    model: evModel,
    chargingRequirements: vehicleSpecs?.recommendedCharger || "Level 2, 240V"
  } : void 0;
  const installation = {
    location: mapInstallLocationLabel(formData.installLocation),
    distance: formData.distance,
    conduitType: mapConduitTypeLabel(formData.conduitType),
    chargerType: formData.chargerType === "hardwired" ? "Hardwired Charger" : "NEMA Outlet (14-50)"
  };
  const pricing = calculatePricing(formData, config, fields);
  const rebates = config.rebates || [];
  const financingOptions = (config.financingPlans || []).map((plan) => {
    const monthlyPayment = calculateMonthlyPayment(
      pricing.total,
      plan.apr || 0,
      parseInt(plan.term) || 12
    );
    return {
      term: plan.term,
      monthlyPayment,
      apr: plan.apr || 0
    };
  });
  const date = (/* @__PURE__ */ new Date()).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
  const validUntilDate = /* @__PURE__ */ new Date();
  validUntilDate.setDate(validUntilDate.getDate() + 30);
  const validUntil = validUntilDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
  return {
    quoteId,
    projectId: formData.projectId,
    date,
    validUntil,
    customer,
    vehicle,
    installation,
    pricing,
    rebates,
    financingOptions,
    status: "draft"
  };
}
function calculatePricing(formData, config, projectFields) {
  const materials = 650;
  let laborHours = 6;
  if (formData.conduitType === "underground") {
    laborHours += 4;
  } else if (formData.conduitType === "concealed") {
    laborHours += 2;
  }
  const includedFootage = config.includedFootage || 20;
  const baseCost = 250;
  let conduitMultiplier = 1;
  if (formData.conduitType === "concealed") {
    conduitMultiplier = 1.3;
  } else if (formData.conduitType === "underground") {
    conduitMultiplier = 1.5;
  }
  let conduit = baseCost * conduitMultiplier;
  const additionalServices = [];
  if (formData.distance > includedFootage) {
    const extraFeet = formData.distance - includedFootage;
    const costPerFoot = 12 * conduitMultiplier;
    const extraDistanceCost = extraFeet * costPerFoot;
    conduit += extraDistanceCost;
    additionalServices.push({
      name: `Extra Wiring (${extraFeet}ft beyond included ${includedFootage}ft)`,
      cost: extraDistanceCost
    });
  }
  let panelUpgradeCost = 0;
  if (formData.availableSlots === 0) {
    panelUpgradeCost = 1800;
    laborHours += 8;
    additionalServices.push({
      name: "Electrical Panel Upgrade (No available slots)",
      cost: panelUpgradeCost
    });
  } else if (formData.panelAge === "old" && formData.panelCapacity < 200) {
    panelUpgradeCost = 1200;
    laborHours += 8;
    additionalServices.push({
      name: "Electrical Panel Upgrade (Panel age/capacity)",
      cost: panelUpgradeCost
    });
  }
  if (formData.chargerType === "nema") {
    const nemaOutletCost = 150;
    additionalServices.push({
      name: "NEMA Outlet Installation",
      cost: nemaOutletCost
    });
  }
  const labor = laborHours * formData.laborRate;
  const permit = projectFields["Permit Required"] ? 235 : 0;
  const selectedAddons = (config.optionalAddons || []).filter((addon) => formData.selectedAddons.includes(addon.name)).map((addon) => ({
    name: addon.name,
    price: addon.price
  }));
  const addonsCost = selectedAddons.reduce((sum, addon) => sum + addon.price, 0);
  const additionalServicesCost = additionalServices.reduce((sum, service) => sum + service.cost, 0);
  const subtotal = materials + conduit + labor;
  const markupAmount = subtotal * (formData.markup / 100);
  const stateTaxRates = config.stateTaxRates || {};
  const salesTaxRate = stateTaxRates[formData.state] || 0;
  const taxableAmount = formData.propertyType === "commercial" ? materials + additionalServicesCost + addonsCost : subtotal + markupAmount + permit + addonsCost + additionalServicesCost;
  const salesTax = taxableAmount * (salesTaxRate / 100);
  const total = subtotal + markupAmount + permit + addonsCost + additionalServicesCost + salesTax;
  return {
    materials,
    labor,
    laborHours,
    conduit,
    permit,
    additionalServices,
    selectedAddons,
    subtotal,
    markup: formData.markup,
    markupAmount,
    salesTax,
    salesTaxRate,
    total
  };
}
function calculateMonthlyPayment(principal, annualRate, months) {
  if (annualRate === 0) {
    return principal / months;
  }
  const monthlyRate = annualRate / 100 / 12;
  const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
  return Math.round(payment * 100) / 100;
}
function mapInstallLocationLabel(location) {
  const map = {
    "garage-attached": "Attached Garage",
    "garage-detached": "Detached Garage",
    "driveway": "Driveway",
    "carport": "Carport",
    "exterior-wall": "Exterior Wall"
  };
  return map[location] || location;
}
function mapConduitTypeLabel(type) {
  const map = {
    "surface": "Surface Mount",
    "concealed": "Concealed/In-Wall",
    "underground": "Underground"
  };
  return map[type] || type;
}

// server/routes.ts
import { randomUUID } from "crypto";
var quoteLinks = /* @__PURE__ */ new Map();
async function registerRoutes(app2) {
  app2.get("/api/projects", async (req, res) => {
    try {
      const projects = await getProjects();
      res.json({ success: true, data: projects });
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  app2.get("/api/projects/:projectId", async (req, res) => {
    try {
      const { projectId } = req.params;
      const project = await getProject(projectId);
      res.json({ success: true, data: project });
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  app2.patch("/api/projects/:projectId/status", async (req, res) => {
    try {
      const { projectId } = req.params;
      const { status } = req.body;
      const updatedProject = await updateProjectStatus(projectId, status);
      res.json({ success: true, data: updatedProject });
    } catch (error) {
      console.error("Error updating project status:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  app2.get("/api/photos/:projectId", async (req, res) => {
    try {
      const { projectId } = req.params;
      const photos = await getPhotosForProject(projectId);
      res.json({ success: true, data: photos });
    } catch (error) {
      console.error("Error fetching photos:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  app2.get("/api/company-config", async (req, res) => {
    try {
      const config = await getCompanyConfig();
      res.json({ success: true, data: config });
    } catch (error) {
      console.error("Error fetching company config:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  app2.get("/api/quotes", async (req, res) => {
    try {
      const { status } = req.query;
      const quotes = await getAllQuotes(status);
      res.json({ success: true, data: quotes });
    } catch (error) {
      console.error("Error fetching quotes:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  app2.get("/api/quotes/:quoteId/versions", async (req, res) => {
    try {
      const { quoteId } = req.params;
      const versions = await getQuoteVersions(quoteId);
      res.json({ success: true, data: versions });
    } catch (error) {
      console.error("Error fetching quote versions:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  app2.get("/api/get-or-create-quote", async (req, res) => {
    try {
      const { projectId } = req.query;
      const result = await getOrCreateQuote(projectId);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error("Error getting/creating quote:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  app2.post("/api/generate-quote", async (req, res) => {
    try {
      const formData = req.body;
      const { quoteId } = await getOrCreateQuote(formData.projectId);
      const quote = await generateQuote(formData);
      quote.quoteId = quoteId;
      await saveQuote(quote);
      await updateProjectStatus(formData.projectId, "Quote Draft");
      res.json({ success: true, data: quote });
    } catch (error) {
      console.error("Error generating quote:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  app2.post("/api/send-quote", async (req, res) => {
    try {
      const { quoteId, projectId } = req.body;
      const shareableToken = randomUUID();
      quoteLinks.set(quoteId, shareableToken);
      const baseUrl = process.env.REPL_SLUG ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` : `http://localhost:${process.env.PORT || 5e3}`;
      const shareableLink = `${baseUrl}/quote/${shareableToken}`;
      await updateProjectStatus(projectId, "Quote Sent");
      await updateQuoteStatus(quoteId, "Sent");
      res.json({ success: true, data: { shareableLink, token: shareableToken } });
    } catch (error) {
      console.error("Error sending quote:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  app2.get("/api/quote/:token", async (req, res) => {
    try {
      const { token } = req.params;
      let quoteId = null;
      for (const [qId, qToken] of quoteLinks.entries()) {
        if (qToken === token) {
          quoteId = qId;
          break;
        }
      }
      if (!quoteId) {
        return res.status(404).json({ success: false, error: "Quote not found" });
      }
      const quoteData = await getQuoteByQuoteId(quoteId);
      if (!quoteData) {
        return res.status(404).json({ success: false, error: "Quote not found" });
      }
      const baseUrl = process.env.REPL_SLUG ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` : `http://localhost:${process.env.PORT || 5e3}`;
      quoteData.shareableLink = `${baseUrl}/quote/${token}`;
      const project = await getProject(quoteData.projectId);
      const currentStatus = project.fields["Project Status"];
      if (currentStatus === "Quote Sent") {
        await updateProjectStatus(quoteData.projectId, "Quote Viewed");
        await updateQuoteStatus(quoteId, "Viewed");
      }
      res.json({ success: true, data: quoteData });
    } catch (error) {
      console.error("Error fetching quote:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  app2.post("/api/customer-decision", async (req, res) => {
    try {
      const decision = req.body;
      const newStatus = decision.decision === "accept" ? "Accepted" : "Rejected";
      await updateProjectStatus(decision.projectId, newStatus);
      await updateQuoteStatus(decision.quoteId, decision.decision === "accept" ? "Accepted" : "Rejected");
      console.log(`Customer ${decision.decision} quote ${decision.quoteId}`);
      if (decision.reason) {
        console.log(`Reason: ${decision.reason}`);
      }
      res.json({ success: true, data: { status: newStatus } });
    } catch (error) {
      console.error("Error processing customer decision:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      ),
      await import("@replit/vite-plugin-dev-banner").then(
        (m) => m.devBanner()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
