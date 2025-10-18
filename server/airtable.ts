// Airtable API integration module
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || "appAzWKnR9zyGX5dC";

if (!AIRTABLE_API_KEY) {
  console.error("❌ AIRTABLE_API_KEY is not set in environment variables!");
  console.error("Please add your Airtable Personal Access Token to Replit Secrets");
}

if (!AIRTABLE_BASE_ID) {
  console.error("❌ AIRTABLE_BASE_ID is not set in environment variables!");
  console.error("Please add your Airtable Base ID to Replit Secrets or .env file");
}

// Table names - can be customized via environment variables
const PROJECTS_TABLE = process.env.PROJECTS_TABLE || "PROJECTS";
const PHOTOS_TABLE = process.env.PHOTOS_TABLE || "PHOTOS";
const QUOTES_TABLE = process.env.QUOTES_TABLE || "QUOTES";
const COMPANY_CONFIG_TABLE = process.env.COMPANY_CONFIG_TABLE || "COMPANY_CONFIG";
const EV_SPECS_TABLE = process.env.EV_SPECS_TABLE || "EV_CHARGING_SPECS";

console.log("✓ Airtable Configuration:");
console.log(`  Base ID: ${AIRTABLE_BASE_ID}`);
console.log(`  API Key: ${AIRTABLE_API_KEY ? '***' + AIRTABLE_API_KEY.slice(-4) : 'NOT SET'}`);
console.log(`  Tables: ${PROJECTS_TABLE}, ${PHOTOS_TABLE}, ${QUOTES_TABLE}`);

interface AirtableRecord<T = any> {
  id: string;
  fields: T;
  createdTime?: string;
}

interface AirtableListResponse<T = any> {
  records: AirtableRecord<T>[];
  offset?: string;
}

// Base Airtable API request function
async function airtableRequest<T = any>(
  endpoint: string,
  method: "GET" | "POST" | "PATCH" | "DELETE" = "GET",
  body?: any
): Promise<T> {
  if (!AIRTABLE_API_KEY) {
    throw new Error("Airtable is not configured. Please add AIRTABLE_API_KEY to your environment variables.");
  }

  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${endpoint}`;
  
  const headers: Record<string, string> = {
    "Authorization": `Bearer ${AIRTABLE_API_KEY}`,
    "Content-Type": "application/json",
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body && (method === "POST" || method === "PATCH")) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    
    // Provide helpful error messages
    if (response.status === 403 || response.status === 401) {
      throw new Error(`Airtable authentication failed. Please check:\n1. Your API key is valid\n2. The API key has access to base ${AIRTABLE_BASE_ID}\n3. The table names are correct (${PROJECTS_TABLE}, ${PHOTOS_TABLE}, etc.)\n\nError: ${errorText}`);
    }
    
    throw new Error(`Airtable API error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

// Get all projects
export async function getProjects(): Promise<AirtableRecord[]> {
  const response = await airtableRequest<AirtableListResponse>(`${PROJECTS_TABLE}?view=Grid%20view`);
  return response.records;
}

// Get a single project by ID
export async function getProject(projectId: string): Promise<AirtableRecord> {
  return await airtableRequest(`${PROJECTS_TABLE}/${projectId}`);
}

// Update project status
export async function updateProjectStatus(projectId: string, status: string): Promise<AirtableRecord> {
  return await airtableRequest(`${PROJECTS_TABLE}/${projectId}`, "PATCH", {
    fields: {
      "Project Status": status,
    },
  });
}

// Get photos for a project
export async function getPhotosForProject(projectId: string): Promise<AirtableRecord[]> {
  const filterFormula = `FIND('${projectId}', ARRAYJOIN({Project}))`;
  const response = await airtableRequest<AirtableListResponse>(
    `${PHOTOS_TABLE}?filterByFormula=${encodeURIComponent(filterFormula)}`
  );
  return response.records;
}

// Get company config (assumes single row in COMPANY_CONFIG table)
export async function getCompanyConfig(): Promise<any> {
  const response = await airtableRequest<AirtableListResponse>(`${COMPANY_CONFIG_TABLE}?maxRecords=1`);
  if (response.records.length === 0) {
    // Return default config if none exists
    return {
      companyName: "EV Charge Pro",
      includedFootage: 20,
      laborRate: 95,
      defaultMarkup: 20,
      optionalAddons: [],
      rebates: [],
      financingPlans: [],
      stateTaxRates: { GA: 4 },
    };
  }
  
  const fields = response.records[0].fields;
  
  // Parse JSON fields if they're stored as strings
  const parseJsonField = (field: any) => {
    if (typeof field === 'string') {
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
    stateTaxRates: parseJsonField(fields["State Tax Rates"]),
  };
}

// Get EV charging specs (assumes EV_CHARGING_SPECS table)
export async function getEVSpecs(): Promise<Record<string, any>> {
  try {
    const response = await airtableRequest<AirtableListResponse>(EV_SPECS_TABLE);
    const specs: Record<string, any> = {};
    
    response.records.forEach((record) => {
      const fields = record.fields;
      const vehicle = fields["Vehicle"] || "";
      if (vehicle) {
        specs[vehicle] = {
          recommendedCharger: fields["Recommended Charger"] || "Level 2, 240V",
          maxChargingPower: fields["Max Charging Power"] || "N/A",
          chargingSpeed: fields["Charging Speed"] || "N/A",
        };
      }
    });
    
    return specs;
  } catch (error) {
    console.error("Error fetching EV specs:", error);
    return {};
  }
}

// Create or get existing quote ID for a project
export async function getOrCreateQuote(projectId: string): Promise<{ quoteId: string; created: boolean }> {
  const project = await getProject(projectId);
  
  // If project already has a Quote ID, return it
  if (project.fields["Quote ID"]) {
    return { quoteId: project.fields["Quote ID"], created: false };
  }
  
  // Generate a new Quote ID
  const quoteId = `EV-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  
  // Update the project with the new Quote ID
  await airtableRequest(`PROJECTS/${projectId}`, "PATCH", {
    fields: {
      "Quote ID": quoteId,
    },
  });
  
  return { quoteId, created: true };
}

// Save quote to QUOTES table with versioning support
export async function saveQuote(quoteData: any, isRevision: boolean = false): Promise<AirtableRecord> {
  // Get latest version for this quote ID
  let version = 1;
  if (isRevision) {
    const existingVersions = await getQuoteVersions(quoteData.quoteId);
    if (existingVersions.length > 0) {
      const maxVersion = Math.max(...existingVersions.map((v: any) => v.version || 1));
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
      "Date Created": new Date().toISOString(),
      "Version": version,
      "Modified By": "System",
    },
  });
}

// Update quote status in Airtable
export async function updateQuoteStatus(quoteId: string, status: string): Promise<void> {
  // Find the quote record by Quote ID
  const filterFormula = `{Quote ID} = '${quoteId}'`;
  const response = await airtableRequest<AirtableListResponse>(
    `${QUOTES_TABLE}?filterByFormula=${encodeURIComponent(filterFormula)}&maxRecords=1`
  );
  
  if (response.records.length > 0) {
    const recordId = response.records[0].id;
    await airtableRequest(`${QUOTES_TABLE}/${recordId}`, "PATCH", {
      fields: {
        Status: status,
      },
    });
  }
}

// Get quote by Quote ID
export async function getQuoteByQuoteId(quoteId: string): Promise<any | null> {
  const filterFormula = `{Quote ID} = '${quoteId}'`;
  const response = await airtableRequest<AirtableListResponse>(
    `${QUOTES_TABLE}?filterByFormula=${encodeURIComponent(filterFormula)}&maxRecords=1`
  );
  
  if (response.records.length === 0) {
    return null;
  }
  
  const quoteRecord = response.records[0];
  const quoteDataStr = quoteRecord.fields["Quote Data"];
  
  if (typeof quoteDataStr === 'string') {
    try {
      return JSON.parse(quoteDataStr);
    } catch (error) {
      console.error("Error parsing quote data:", error);
      return null;
    }
  }
  
  return quoteDataStr || null;
}

// Get all versions of a quote by Quote ID
export async function getQuoteVersions(quoteId: string): Promise<any[]> {
  const filterFormula = `{Quote ID} = '${quoteId}'`;
  const endpoint = `${QUOTES_TABLE}?filterByFormula=${encodeURIComponent(filterFormula)}&sort%5B0%5D%5Bfield%5D=Version&sort%5B0%5D%5Bdirection%5D=desc`;
  
  const response = await airtableRequest<AirtableListResponse>(endpoint);
  
  return response.records.map(record => {
    const fields = record.fields;
    
    let quoteData = null;
    if (typeof fields["Quote Data"] === 'string') {
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
      modifiedBy: fields["Modified By"] || "Unknown",
    };
  });
}

// Get all quotes with optional status filter (only returns latest version of each quote)
export async function getAllQuotes(statusFilter?: string): Promise<any[]> {
  let endpoint = `${QUOTES_TABLE}?sort%5B0%5D%5Bfield%5D=Date%20Created&sort%5B0%5D%5Bdirection%5D=desc`;
  
  if (statusFilter && statusFilter !== 'All') {
    const filterFormula = `{Status} = '${statusFilter}'`;
    endpoint += `&filterByFormula=${encodeURIComponent(filterFormula)}`;
  }
  
  const response = await airtableRequest<AirtableListResponse>(endpoint);
  
  const allQuotes = response.records.map(record => {
    const fields = record.fields;
    
    let quoteData = null;
    if (typeof fields["Quote Data"] === 'string') {
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
      modifiedBy: fields["Modified By"] || "Unknown",
    };
  });
  
  // Group by Quote ID and only keep the latest version
  const latestQuotes = new Map<string, any>();
  allQuotes.forEach(quote => {
    const existing = latestQuotes.get(quote.quoteId);
    if (!existing || quote.version > existing.version) {
      latestQuotes.set(quote.quoteId, quote);
    }
  });
  
  return Array.from(latestQuotes.values());
}
