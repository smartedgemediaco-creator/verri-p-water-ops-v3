import { RefObject } from "react";

export async function downloadTablePdf(
  ref: RefObject<HTMLElement | null>,
  filename: string,
  setLoading?: (v: boolean) => void
) {
  if (!ref.current) return;
  setLoading?.(true);
  try {
    const html2canvas = (await import("html2canvas")).default;
    const jsPDF = (await import("jspdf")).default;
    const canvas = await html2canvas(ref.current, {
      scale: 2,
      useCORS: true,
      logging: false,
      onclone: (clonedDoc: Document) => {
        for (let si = 0; si < clonedDoc.styleSheets.length; si++) {
          const sheet = clonedDoc.styleSheets[si];
          try {
            const removeOklabRules = (rules: CSSRuleList, parent: CSSGroupingRule | CSSStyleSheet) => {
              for (let i = rules.length - 1; i >= 0; i--) {
                const rule = rules[i];
                if (rule instanceof CSSGroupingRule && rule.cssRules.length) {
                  removeOklabRules(rule.cssRules, rule);
                }
                if (rule.cssText?.includes("color-mix(in oklab")) {
                  parent.deleteRule(i);
                }
              }
            };
            removeOklabRules(sheet.cssRules, sheet);
          } catch {
            /* cross-origin sheet */
          }
        }
      },
    });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const margin = 10;
    const pageWidth = pdf.internal.pageSize.getWidth() - margin * 2;
    const pageHeight = pdf.internal.pageSize.getHeight() - margin * 2;
    const imgWidth = pageWidth;

    const pxPerMm = canvas.width / pageWidth;
    const pageCanvasPx = Math.floor(pageHeight * pxPerMm);

    let srcY = 0;
    let pageNum = 0;
    while (srcY < canvas.height) {
      const sliceH = Math.min(pageCanvasPx, canvas.height - srcY);
      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceH;
      const ctx = pageCanvas.getContext("2d");
      if (ctx) ctx.drawImage(canvas, 0, srcY, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
      if (pageNum > 0) pdf.addPage();
      pdf.addImage(pageCanvas.toDataURL("image/png"), "PNG", margin, margin, imgWidth, (sliceH * imgWidth) / canvas.width);
      srcY += sliceH;
      pageNum++;
    }
    pdf.save(`${filename}-${new Date().toISOString().slice(0, 10)}.pdf`);
  } catch (err) {
    console.error("PDF generation failed", err);
  } finally {
    setLoading?.(false);
  }
}
