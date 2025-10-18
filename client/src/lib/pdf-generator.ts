import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import type { Quote } from "@shared/schema";

export async function generateQuotePDF(quote: Quote): Promise<Blob> {
  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = margin;

  // Header with gradient effect (simulated with rectangles)
  pdf.setFillColor(41, 128, 185);
  pdf.rect(0, 0, pageWidth, 30, "F");
  
  // Company name/logo
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(22);
  pdf.setFont("helvetica", "bold");
  pdf.text("⚡ EV Charger Installation Quote", pageWidth / 2, 15, {
    align: "center",
  });
  
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text("Professional Installation Services", pageWidth / 2, 22, {
    align: "center",
  });

  yPos = 40;

  // Quote ID and Date
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.text(`Quote ID: ${quote.quoteId}`, margin, yPos);
  pdf.text(
    `Date: ${new Date().toLocaleDateString()}`,
    pageWidth - margin,
    yPos,
    { align: "right" }
  );
  yPos += 10;

  // Customer Information
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.text("Customer Information", margin, yPos);
  yPos += 7;

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Name: ${quote.customer.name}`, margin, yPos);
  yPos += 5;
  pdf.text(`Email: ${quote.customer.email}`, margin, yPos);
  yPos += 5;
  pdf.text(`Phone: ${quote.customer.phone}`, margin, yPos);
  yPos += 5;
  pdf.text(`Address: ${quote.customer.address}`, margin, yPos);
  yPos += 10;

  // Charger Details
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.text("Charger Specifications", margin, yPos);
  yPos += 7;

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Type: ${quote.charger.type}`, margin, yPos);
  yPos += 5;
  pdf.text(`Amperage: ${quote.charger.amperage}A`, margin, yPos);
  yPos += 5;
  pdf.text(`Voltage: ${quote.charger.voltage}V`, margin, yPos);
  yPos += 5;
  if (quote.evSpecs) {
    pdf.setFont("helvetica", "italic");
    pdf.text(`EV Model: ${quote.evSpecs.vehicle}`, margin, yPos);
    yPos += 5;
  }
  yPos += 5;

  // Installation Details
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.text("Installation Details", margin, yPos);
  yPos += 7;

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Location: ${quote.installation.location}`, margin, yPos);
  yPos += 5;
  pdf.text(
    `Distance from Panel: ${quote.installation.distanceFromPanel} ft`,
    margin,
    yPos
  );
  yPos += 5;
  pdf.text(`Conduit Type: ${quote.installation.conduitType}`, margin, yPos);
  yPos += 5;
  pdf.text(
    `Permit Required: ${quote.installation.permitRequired ? "Yes" : "No"}`,
    margin,
    yPos
  );
  yPos += 10;

  // Pricing Breakdown
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.text("Pricing Breakdown", margin, yPos);
  yPos += 7;

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");

  const lineItems = [
    { label: "Charger & Materials", value: quote.pricing.materials },
    { label: "Conduit Installation", value: quote.pricing.conduit },
    { label: "Labor", value: quote.pricing.labor },
  ];

  // Add optional services
  if (quote.services.panelUpgradeRequired) {
    lineItems.push({
      label: "Panel Upgrade",
      value: quote.pricing.panelUpgrade || 0,
    });
  }
  if (quote.services.nemaOutletInstallation) {
    lineItems.push({
      label: "NEMA Outlet Installation",
      value: quote.pricing.nemaOutlet || 0,
    });
  }
  if (quote.installation.permitRequired) {
    lineItems.push({
      label: "Permit Fees",
      value: quote.pricing.permit || 0,
    });
  }

  // Add selected optional addons
  if (quote.optionalAddons && quote.optionalAddons.length > 0) {
    quote.optionalAddons.forEach((addon) => {
      lineItems.push({
        label: addon.name,
        value: addon.price,
      });
    });
  }

  // Render line items
  lineItems.forEach((item) => {
    pdf.text(item.label, margin, yPos);
    pdf.text(`$${item.value.toFixed(2)}`, pageWidth - margin, yPos, {
      align: "right",
    });
    yPos += 5;
  });

  yPos += 3;
  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 5;

  // Subtotal and tax
  pdf.text("Subtotal", margin, yPos);
  pdf.text(`$${quote.pricing.subtotal.toFixed(2)}`, pageWidth - margin, yPos, {
    align: "right",
  });
  yPos += 5;

  if (quote.pricing.markup > 0) {
    pdf.text(
      `Markup (${quote.pricing.markupPercent}%)`,
      margin,
      yPos
    );
    pdf.text(`$${quote.pricing.markup.toFixed(2)}`, pageWidth - margin, yPos, {
      align: "right",
    });
    yPos += 5;
  }

  pdf.text(
    `Sales Tax (${quote.pricing.taxRate}%)`,
    margin,
    yPos
  );
  pdf.text(`$${quote.pricing.salesTax.toFixed(2)}`, pageWidth - margin, yPos, {
    align: "right",
  });
  yPos += 5;

  yPos += 3;
  pdf.setLineWidth(0.5);
  pdf.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 7;

  // Total
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.text("Total", margin, yPos);
  pdf.text(`$${quote.pricing.total.toFixed(2)}`, pageWidth - margin, yPos, {
    align: "right",
  });

  yPos += 12;

  // Financing and Rebates (if available)
  if (quote.financing && quote.financing.length > 0) {
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text("Financing Options", margin, yPos);
    yPos += 6;

    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    quote.financing.forEach((plan) => {
      pdf.text(`• ${plan.term} at ${plan.apr}% APR`, margin + 5, yPos);
      yPos += 4;
    });
    yPos += 5;
  }

  if (quote.rebates && quote.rebates.length > 0) {
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text("Available Rebates", margin, yPos);
    yPos += 6;

    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    quote.rebates.forEach((rebate) => {
      pdf.text(`• ${rebate.name}: $${rebate.amount}`, margin + 5, yPos);
      yPos += 4;
    });
  }

  // Footer
  const footerY = pageHeight - 15;
  pdf.setFontSize(8);
  pdf.setTextColor(128, 128, 128);
  pdf.text(
    "This quote is valid for 30 days from the date of issue.",
    pageWidth / 2,
    footerY,
    { align: "center" }
  );

  return pdf.output("blob");
}

export function downloadPDF(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
