import { QuoteForm, Quote } from "@shared/schema";
import { getProject, getCompanyConfig, getEVSpecs } from "./airtable";

// Business logic for quote generation

export async function generateQuote(formData: QuoteForm): Promise<Quote> {
  // Fetch project and config data
  const [project, config, evSpecs] = await Promise.all([
    getProject(formData.projectId),
    getCompanyConfig(),
    getEVSpecs(),
  ]);

  const fields = project.fields;
  
  // Get or create Quote ID
  const quoteId = fields["Quote ID"] || `EV-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  
  // Build customer info
  const customer = {
    name: fields["Customer Name"] || "N/A",
    email: fields["Customer Email"] || "N/A",
    phone: fields["Customer Phone"] || "N/A",
    address: fields["Customer Address"] || "N/A",
  };

  // Build vehicle info
  const evMake = fields["EV Make"] || "";
  const evModel = fields["EV Model"] || "";
  const fullVehicleName = `${evMake} ${evModel}`.trim();
  const vehicleSpecs = evSpecs[fullVehicleName];
  
  const vehicle = fullVehicleName ? {
    make: evMake,
    model: evModel,
    chargingRequirements: vehicleSpecs?.recommendedCharger || "Level 2, 240V",
  } : undefined;

  // Installation details
  const installation = {
    location: mapInstallLocationLabel(formData.installLocation),
    distance: formData.distance,
    conduitType: mapConduitTypeLabel(formData.conduitType),
    chargerType: formData.chargerType === "hardwired" ? "Hardwired Charger" : "NEMA Outlet (14-50)",
  };

  // Calculate pricing
  const pricing = calculatePricing(formData, config, fields);

  // Build rebates
  const rebates = config.rebates || [];

  // Calculate financing options
  const financingOptions = (config.financingPlans || []).map((plan: any) => {
    const monthlyPayment = calculateMonthlyPayment(
      pricing.total,
      plan.apr || 0,
      parseInt(plan.term) || 12
    );
    return {
      term: plan.term,
      monthlyPayment,
      apr: plan.apr || 0,
    };
  });

  // Generate dates
  const date = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  const validUntilDate = new Date();
  validUntilDate.setDate(validUntilDate.getDate() + 30);
  const validUntil = validUntilDate.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
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
    status: "draft",
  };
}

function calculatePricing(formData: QuoteForm, config: any, projectFields: any) {
  // Base costs
  const materials = 650; // Base charger + materials
  
  // Labor calculations
  let laborHours = 6; // Base installation time
  
  if (formData.conduitType === "underground") {
    laborHours += 4;
  } else if (formData.conduitType === "concealed") {
    laborHours += 2;
  }
  
  // Distance-based conduit costs
  const includedFootage = config.includedFootage || 20;
  const baseCost = 250; // Base cost for included footage
  let conduitMultiplier = 1.0;
  
  if (formData.conduitType === "concealed") {
    conduitMultiplier = 1.3;
  } else if (formData.conduitType === "underground") {
    conduitMultiplier = 1.5;
  }
  
  let conduit = baseCost * conduitMultiplier;
  
  // Additional services
  const additionalServices: Array<{ name: string; cost: number }> = [];
  
  // Extra conduit beyond included footage
  if (formData.distance > includedFootage) {
    const extraFeet = formData.distance - includedFootage;
    const costPerFoot = 12 * conduitMultiplier;
    const extraDistanceCost = extraFeet * costPerFoot;
    conduit += extraDistanceCost;
    additionalServices.push({
      name: `Extra Wiring (${extraFeet}ft beyond included ${includedFootage}ft)`,
      cost: extraDistanceCost,
    });
  }

  // Panel upgrade detection
  let panelUpgradeCost = 0;
  if (formData.availableSlots === 0) {
    panelUpgradeCost = 1800;
    laborHours += 8;
    additionalServices.push({
      name: "Electrical Panel Upgrade (No available slots)",
      cost: panelUpgradeCost,
    });
  } else if (formData.panelAge === "old" && formData.panelCapacity < 200) {
    panelUpgradeCost = 1200;
    laborHours += 8;
    additionalServices.push({
      name: "Electrical Panel Upgrade (Panel age/capacity)",
      cost: panelUpgradeCost,
    });
  }
  
  // NEMA outlet additional cost
  if (formData.chargerType === "nema") {
    const nemaOutletCost = 150;
    additionalServices.push({
      name: "NEMA Outlet Installation",
      cost: nemaOutletCost,
    });
  }

  const labor = laborHours * formData.laborRate;
  
  // Permit cost
  const permit = projectFields["Permit Required"] ? 235 : 0;
  
  // Selected add-ons
  const selectedAddons = (config.optionalAddons || [])
    .filter((addon: any) => formData.selectedAddons.includes(addon.name))
    .map((addon: any) => ({
      name: addon.name,
      price: addon.price,
    }));
  
  const addonsCost = selectedAddons.reduce((sum: number, addon: any) => sum + addon.price, 0);
  const additionalServicesCost = additionalServices.reduce((sum, service) => sum + service.cost, 0);
  
  // Calculate subtotal (base costs only, not additional services)
  const subtotal = materials + conduit + labor;
  const markupAmount = subtotal * (formData.markup / 100);
  
  // Calculate tax (on materials, services, and add-ons, not labor for some states)
  const stateTaxRates = config.stateTaxRates || {};
  const salesTaxRate = stateTaxRates[formData.state] || 0;
  
  // For commercial properties, tax might be exempt
  const taxableAmount = formData.propertyType === "commercial" 
    ? materials + additionalServicesCost + addonsCost // No tax on labor for commercial
    : subtotal + markupAmount + permit + addonsCost + additionalServicesCost;
  
  const salesTax = taxableAmount * (salesTaxRate / 100);
  
  // Calculate total
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
    total,
  };
}

function calculateMonthlyPayment(principal: number, annualRate: number, months: number): number {
  if (annualRate === 0) {
    return principal / months;
  }
  
  const monthlyRate = annualRate / 100 / 12;
  const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) / 
                  (Math.pow(1 + monthlyRate, months) - 1);
  return Math.round(payment * 100) / 100;
}

function mapInstallLocationLabel(location: string): string {
  const map: Record<string, string> = {
    "garage-attached": "Attached Garage",
    "garage-detached": "Detached Garage",
    "driveway": "Driveway",
    "carport": "Carport",
    "exterior-wall": "Exterior Wall",
  };
  return map[location] || location;
}

function mapConduitTypeLabel(type: string): string {
  const map: Record<string, string> = {
    "surface": "Surface Mount",
    "concealed": "Concealed/In-Wall",
    "underground": "Underground",
  };
  return map[type] || type;
}
