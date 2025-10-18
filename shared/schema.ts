import { z } from "zod";

// Project from Airtable
export const projectSchema = z.object({
  id: z.string(),
  fields: z.object({
    "Quote ID": z.string().optional(),
    "Customer Name": z.string().optional(),
    "Customer Email": z.string().email().optional(),
    "Customer Phone": z.string().optional(),
    "Customer Address": z.string().optional(),
    "Project Status": z.string().optional(),
    "EV Make": z.string().optional(),
    "EV Model": z.string().optional(),
    "Install Location": z.string().optional(),
    "Permit Required": z.boolean().optional(),
    "Panel Type": z.string().optional(),
    "Panel Capacity": z.number().optional(),
    "Available Slots": z.number().optional(),
    "Panel Age": z.string().optional(),
  }),
});

export type Project = z.infer<typeof projectSchema>;

// Photo from Airtable
export const photoSchema = z.object({
  id: z.string(),
  fields: z.object({
    "Photo Type": z.string().optional(),
    "File": z.array(z.object({
      id: z.string(),
      url: z.string(),
      filename: z.string(),
      thumbnails: z.object({
        large: z.object({
          url: z.string(),
        }).optional(),
      }).optional(),
    })).optional(),
  }),
});

export type Photo = z.infer<typeof photoSchema>;

// Company Config
export const companyConfigSchema = z.object({
  companyName: z.string(),
  includedFootage: z.number(),
  laborRate: z.number(),
  defaultMarkup: z.number(),
  optionalAddons: z.array(z.object({
    name: z.string(),
    price: z.number(),
    description: z.string().optional(),
  })),
  rebates: z.array(z.object({
    name: z.string(),
    amount: z.number(),
    description: z.string().optional(),
  })),
  financingPlans: z.array(z.object({
    term: z.string(),
    apr: z.number(),
  })),
  stateTaxRates: z.record(z.number()),
});

export type CompanyConfig = z.infer<typeof companyConfigSchema>;

// EV Charging Specs
export const evSpecSchema = z.object({
  vehicle: z.string(),
  recommendedCharger: z.string(),
  maxChargingPower: z.string(),
  chargingSpeed: z.string(),
});

export type EVSpec = z.infer<typeof evSpecSchema>;

// Quote Data for Generation
export const quoteFormSchema = z.object({
  projectId: z.string(),
  distance: z.number().min(0),
  conduitType: z.enum(["surface", "concealed", "underground"]),
  chargerType: z.enum(["hardwired", "nema"]),
  panelType: z.string(),
  panelCapacity: z.number(),
  availableSlots: z.number(),
  panelAge: z.enum(["new", "old"]),
  state: z.string(),
  installLocation: z.string(),
  laborRate: z.number(),
  markup: z.number(),
  propertyType: z.string(),
  selectedAddons: z.array(z.string()),
});

export type QuoteForm = z.infer<typeof quoteFormSchema>;

// Generated Quote
export const quoteSchema = z.object({
  quoteId: z.string(),
  projectId: z.string(),
  date: z.string(),
  validUntil: z.string(),
  customer: z.object({
    name: z.string(),
    email: z.string(),
    phone: z.string(),
    address: z.string(),
  }),
  vehicle: z.object({
    make: z.string(),
    model: z.string(),
    chargingRequirements: z.string(),
  }).optional(),
  installation: z.object({
    location: z.string(),
    distance: z.number(),
    conduitType: z.string(),
    chargerType: z.string(),
  }),
  pricing: z.object({
    materials: z.number(),
    labor: z.number(),
    laborHours: z.number(),
    conduit: z.number(),
    permit: z.number(),
    additionalServices: z.array(z.object({
      name: z.string(),
      cost: z.number(),
    })),
    selectedAddons: z.array(z.object({
      name: z.string(),
      price: z.number(),
    })),
    subtotal: z.number(),
    markup: z.number(),
    markupAmount: z.number(),
    salesTax: z.number(),
    salesTaxRate: z.number(),
    total: z.number(),
  }),
  rebates: z.array(z.object({
    name: z.string(),
    amount: z.number(),
    description: z.string().optional(),
  })).optional(),
  financingOptions: z.array(z.object({
    term: z.string(),
    monthlyPayment: z.number(),
    apr: z.number(),
  })).optional(),
  status: z.string(),
  shareableLink: z.string().optional(),
});

export type Quote = z.infer<typeof quoteSchema>;

// Customer Decision
export const customerDecisionSchema = z.object({
  quoteId: z.string(),
  projectId: z.string(),
  decision: z.enum(["accept", "reject"]),
  reason: z.string().optional(),
});

export type CustomerDecision = z.infer<typeof customerDecisionSchema>;

// API Response Types
export const apiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
});

export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
};
