"use client";

import { useRef, useState, useCallback } from "react";
import { downloadTablePdf, PdfOptions } from "@/lib/pdf";

export function usePdfDownload(filename: string, options?: PdfOptions) {
  const ref = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);

  const download = useCallback(() => {
    return downloadTablePdf(ref, filename, setLoading, options);
  }, [filename, options]);

  return { ref, loading, download };
}
