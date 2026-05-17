"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/button/Button";

export default function ImportProductsPage() {
  const router = useRouter();
  const [csv, setCsv] = useState("");
  const [result, setResult] = useState<{
    success: number;
    errors: string[];
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);

    const lines = csv.trim().split("\n").filter(Boolean);
    const products = lines.map((line) => {
      const [name, unit = "bag", category = "sachet", description = ""] = line
        .split(",")
        .map((s) => s.trim());
      return { name, unit, category, description };
    });

    const res = await fetch("/api/import/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ products }),
    });
    const data = await res.json();
    setResult(data);
    if (res.ok) setCsv("");
    setSubmitting(false);
  };

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
        Import Products
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        Paste CSV: name,unit,category,description (one per line)
      </p>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
        <textarea
          className="w-full h-48 rounded-lg border border-gray-300 p-4 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          placeholder="Pure Water,sachet,sachet,50cl pure water&#10;Bottled Water,bottle,bottle,75cl bottle"
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
        />
        <div className="flex gap-3">
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? "Importing..." : "Import"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/products")}
          >
            Back
          </Button>
        </div>
        {result && (
          <div
            className={`p-4 rounded-lg text-sm ${
              result.success > 0
                ? "bg-success-50 text-success-700"
                : "bg-error-50 text-error-700"
            }`}
          >
            {result.success > 0
              ? `Imported ${result.success} products`
              : "No products imported"}
            {result.errors.length > 0 && (
              <ul className="mt-2 list-disc list-inside">
                {result.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
