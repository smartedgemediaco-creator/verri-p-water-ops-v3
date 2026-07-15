"use client";

import { useRef, useState, useCallback } from "react";
import { downloadTablePdf } from "@/lib/pdf";

export function usePdfDownload(filename: string) {
  const ref = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);

  const download = useCallback(() => {
    return downloadTablePdf(ref, filename, setLoading);
  }, [filename]);

  return { ref, loading, download };
}
