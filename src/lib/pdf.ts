import { RefObject } from "react";

export interface PdfOptions {
  title?: string;
  subtitle?: string;
  /** When true, skips the branded header/footer (for pages that render their own). */
  skipHeaderFooter?: boolean;
}

const BRAND = {
  primary: [70, 95, 255] as [number, number, number],     // #465FFF
  primaryDark: [54, 65, 245] as [number, number, number],  // #3641F5
  textDark: [16, 24, 40] as [number, number, number],      // #101828
  textMuted: [102, 112, 133] as [number, number, number],  // #667085
  textLight: [152, 162, 179] as [number, number, number],  // #98A3B3
  border: [228, 231, 236] as [number, number, number],     // #E4E7EC
  white: [255, 255, 255] as [number, number, number],
};

const HEADER_HEIGHT = 18; // mm — space reserved for header
const FOOTER_HEIGHT = 12; // mm — space reserved for footer

function removeOklabRules(doc: Document) {
  for (let si = 0; si < doc.styleSheets.length; si++) {
    const sheet = doc.styleSheets[si];
    try {
      const walk = (rules: CSSRuleList, owner: CSSGroupingRule | CSSStyleSheet) => {
        for (let i = rules.length - 1; i >= 0; i--) {
          const rule = rules[i];
          const isBad = /oklab|oklch|lab\(|lch\(/i.test(rule.cssText);
          if (isBad && (rule instanceof CSSStyleRule || rule instanceof CSSPropertyRule)) {
            owner.deleteRule(i);
          } else if (rule instanceof CSSGroupingRule) {
            walk(rule.cssRules, rule);
          }
        }
      };
      if (sheet.cssRules) walk(sheet.cssRules, sheet);
    } catch {
      /* cross-origin sheet */
    }
  }
}

function drawBrandedHeader(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdf: any,
  title: string,
  subtitle: string
) {
  const pageW = pdf.internal.pageSize.getWidth();

  // Blue accent bar at top
  pdf.setFillColor(...BRAND.primary);
  pdf.rect(0, 0, pageW, 3.5, "F");

  // Company name
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.setTextColor(...BRAND.textDark);
  pdf.text("Verri P Water Inc", 15, 9);

  // Report title
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(...BRAND.textMuted);
  pdf.text(title, 15, 13.5);

  // Date on the right
  pdf.setFontSize(7);
  pdf.setTextColor(...BRAND.textLight);
  const dateStr = new Date().toLocaleDateString("en-NG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  pdf.text(dateStr, pageW - 15, 9, { align: "right" });

  // Subtitle on the right (if provided)
  if (subtitle) {
    pdf.text(subtitle, pageW - 15, 13.5, { align: "right" });
  }

  // Separator line
  pdf.setDrawColor(...BRAND.border);
  pdf.setLineWidth(0.3);
  pdf.line(15, HEADER_HEIGHT - 1, pageW - 15, HEADER_HEIGHT - 1);
}

function drawBrandedFooter(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdf: any,
  pageNum: number,
  totalPages: number
) {
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  // Separator line
  pdf.setDrawColor(...BRAND.border);
  pdf.setLineWidth(0.3);
  pdf.line(15, pageH - FOOTER_HEIGHT + 3, pageW - 15, pageH - FOOTER_HEIGHT + 3);

  // Page number
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.setTextColor(...BRAND.textLight);
  pdf.text(`Page ${pageNum} of ${totalPages}`, 15, pageH - 4);

  // Company + tagline
  pdf.text("Verri P Water Inc — Operations Management System", pageW - 15, pageH - 4, {
    align: "right",
  });

  // Blue accent bar at bottom
  pdf.setFillColor(...BRAND.primary);
  pdf.rect(0, pageH - 2.5, pageW, 2.5, "F");
}

export async function downloadTablePdf(
  ref: RefObject<HTMLElement | null>,
  filename: string,
  setLoading?: (v: boolean) => void,
  options?: PdfOptions
) {
  if (!ref.current) return;
  setLoading?.(true);

  try {
    const html2canvas = (await import("html2canvas")).default;
    const { jsPDF } = await import("jspdf");

    const canvas = await html2canvas(ref.current, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      imageTimeout: 0,
      onclone: (clonedDoc: Document) => {
        removeOklabRules(clonedDoc);
      },
    });

    const pdf = new jsPDF("p", "mm", "a4");
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 15;

    // Content area dimensions (accounting for header/footer)
    const contentTop = options?.skipHeaderFooter ? margin : HEADER_HEIGHT + 2;
    const contentBottom = options?.skipHeaderFooter ? margin : FOOTER_HEIGHT + 2;
    const contentW = pageW - margin * 2;
    const contentH = pageH - contentTop - contentBottom;

    // Image dimensions scaled to fit content width
    const imgW = contentW;
    const imgH = (canvas.height * imgW) / canvas.width;

    // Calculate total pages needed
    const totalPages = Math.max(1, Math.ceil(imgH / contentH));

    // Place image across pages
    let srcY = 0;
    for (let page = 0; page < totalPages; page++) {
      if (page > 0) pdf.addPage();

      // Draw branded header/footer (unless skipped)
      if (!options?.skipHeaderFooter) {
        drawBrandedHeader(pdf, options?.title || "Data Report", options?.subtitle || "");
        drawBrandedFooter(pdf, page + 1, totalPages);
      }

      // Calculate how much of the image fits on this page
      const remainingH = imgH - srcY;
      const sliceH = Math.min(contentH, remainingH);

      // Create a canvas slice for this page
      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = canvas.width;
      const sliceHeightPx = (sliceH / imgH) * canvas.height;
      sliceCanvas.height = sliceHeightPx;

      const ctx = sliceCanvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(
          canvas,
          0,
          srcY,
          canvas.width,
          sliceHeightPx,
          0,
          0,
          canvas.width,
          sliceHeightPx
        );
      }

      const sliceData = sliceCanvas.toDataURL("image/png");
      pdf.addImage(sliceData, "PNG", margin, contentTop, imgW, sliceH);

      srcY += contentH;
    }

    pdf.save(filename);
  } catch (err) {
    console.error("PDF generation failed", err);
  } finally {
    setLoading?.(false);
  }
}

/**
 * Generate a single-page receipt PDF from an element.
 * Wraps the element content with a branded header/footer overlay.
 */
export async function downloadReceiptPdf(
  ref: RefObject<HTMLElement | null>,
  filename: string,
  setLoading?: (v: boolean) => void
) {
  if (!ref.current) return;
  setLoading?.(true);

  try {
    const html2canvas = (await import("html2canvas")).default;
    const { jsPDF } = await import("jspdf");

    const canvas = await html2canvas(ref.current, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      imageTimeout: 0,
      onclone: (clonedDoc: Document) => {
        removeOklabRules(clonedDoc);
      },
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    const pdf = new jsPDF("p", "mm", "a4");
    const pageW = pdf.internal.pageSize.getWidth();
    const imgW = pageW - 20;
    const imgH = (canvas.height * imgW) / canvas.width;
    pdf.addImage(imgData, "JPEG", 10, 10, imgW, imgH);

    pdf.save(filename);
  } catch (err) {
    console.error("Receipt PDF failed", err);
  } finally {
    setLoading?.(false);
  }
}
