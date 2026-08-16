"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import Button from "@/components/ui/button/Button";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { PlusIcon, TrashBinIcon, PencilIcon, BoxIcon, DollarLineIcon } from "@/icons";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { BottleIcon } from "@/components/icons/EntityIcons";
import { usePdfDownload } from "@/hooks/usePdfDownload";

interface Product {
  _id: string;
  name: string;
  unit: string;
  category: string;
  unitPrice?: number;
  chilledPrice?: number;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const { ref, loading: pdfLoading, download } = usePdfDownload("products-list", { title: "Products Report" });

  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => setProducts(data))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = (id: string) => setDeleteTarget(id);

  const doDelete = async () => {
    if (!deleteTarget) return;
    const res = await fetch(`/api/products/${deleteTarget}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete");
    setProducts((prev) => prev.filter((p) => p._id !== deleteTarget));
  };

  const categories = [...new Set(products.map((p) => p.category))];
  const avgPrice = products.length ? products.reduce((s, p) => s + (p.unitPrice || 0), 0) / products.length : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageBreadcrumb pageTitle="Products" />
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={download} disabled={pdfLoading}>
            {pdfLoading ? "Generating PDF..." : "Download PDF"}
          </Button>
          <Link href="/products/import">
            <Button variant="outline" size="sm">
              Import
            </Button>
          </Link>
          <Link href="/products/new">
            <Button variant="primary" size="sm" startIcon={<PlusIcon />}>
              Add Product
            </Button>
          </Link>
        </div>
      </div>

      <div ref={ref} className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-6 mb-6">
        <Link href="/products" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm hover:shadow-theme-md transition-shadow">
          <div className="flex items-center justify-center w-10 h-10 bg-teal-100 rounded-lg dark:bg-teal-500/10 mb-3">
            <BottleIcon className="text-teal-600 size-5 dark:text-teal-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Products</p>
          <h4 className="mt-1 font-bold text-blue-600 text-title-sm dark:text-blue-400">{products.length}</h4>
        </Link>
        <Link href="/products" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm hover:shadow-theme-md transition-shadow">
          <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-lg dark:bg-purple-500/10 mb-3">
            <BottleIcon className="text-purple-600 size-5 dark:text-purple-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Categories</p>
          <h4 className="mt-1 font-bold text-blue-600 text-title-sm dark:text-blue-400">{categories.length}</h4>
        </Link>
        <Link href="/products" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm hover:shadow-theme-md transition-shadow">
          <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-lg dark:bg-purple-500/10 mb-3">
            <BoxIcon className="text-purple-600 size-5 dark:text-purple-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Units</p>
          <h4 className="mt-1 font-bold text-blue-600 text-title-sm dark:text-blue-400">{[...new Set(products.map((p) => p.unit))].length}</h4>
        </Link>
        <Link href="/products" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm hover:shadow-theme-md transition-shadow">
          <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg dark:bg-green-500/10 mb-3">
            <DollarLineIcon className="text-green-600 size-5 dark:text-green-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Avg Unit Price</p>
          <h4 className="mt-1 font-bold text-blue-600 text-title-sm dark:text-blue-400">₦{Math.round(avgPrice).toLocaleString()}</h4>
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Name</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Unit</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Category</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Unit Price</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Chilled Price</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Actions</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={6}>Loading...</TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={6}>No products found. Click &quot;Add Product&quot; to create one.</TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product._id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  <TableCell className="py-3 text-theme-sm font-medium text-gray-800 dark:text-white/90"><Link href={`/products/${product._id}`} className="text-theme-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">{product.name}</Link></TableCell>
                  <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{product.unit}</TableCell>
                  <TableCell className="py-3 text-theme-sm capitalize text-gray-500 dark:text-gray-400">
                    <span className="capitalize">{product.category}</span>
                  </TableCell>
                  <TableCell className="py-3 text-theme-sm text-gray-800 dark:text-white/90">₦{(product.unitPrice ?? 0).toLocaleString()}</TableCell>
                  <TableCell className="py-3 text-theme-sm text-gray-800 dark:text-white/90">{product.chilledPrice ? `₦${product.chilledPrice.toLocaleString()}` : "—"}</TableCell>
                  <TableCell className="py-3">
                    <div className="flex gap-2">
                      <Link href={`/products/${product._id}/edit`}>
                        <Button variant="outline" size="sm" startIcon={<PencilIcon />}>
                          Edit
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        startIcon={<TrashBinIcon />}
                        onClick={() => handleDelete(product._id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={doDelete}
        title="Delete Product"
        message="This will permanently delete this product and all associated data. This action cannot be undone."
        confirmLabel="Delete Product"
        variant="danger"
      />
    </div>
  );
}
