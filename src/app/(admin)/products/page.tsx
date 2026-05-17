"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import Button from "@/components/ui/button/Button";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { PlusIcon, TrashBinIcon, PencilIcon, BoxIcon } from "@/icons";
import { BottleIcon } from "@/components/icons/EntityIcons";

interface Product {
  _id: string;
  name: string;
  unit: string;
  category: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => setProducts(data))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    setProducts((prev) => prev.filter((p) => p._id !== id));
  };

  const categories = [...new Set(products.map((p) => p.category))];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageBreadcrumb pageTitle="Products" />
        <div className="flex gap-3">
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-6 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <div className="flex items-center justify-center w-10 h-10 bg-teal-100 rounded-lg dark:bg-teal-500/10 mb-3">
            <BottleIcon className="text-teal-600 size-5 dark:text-teal-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Products</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{products.length}</h4>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-lg dark:bg-purple-500/10 mb-3">
            <BottleIcon className="text-purple-600 size-5 dark:text-purple-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Categories</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{categories.length}</h4>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-lg dark:bg-purple-500/10 mb-3">
            <BoxIcon className="text-purple-600 size-5 dark:text-purple-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Units</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{[...new Set(products.map((p) => p.unit))].length}</h4>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <Table>
          <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
            <TableRow>
              <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Name</TableCell>
              <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Unit</TableCell>
              <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Category</TableCell>
              <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Actions</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <TableRow>
                <TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={4}>Loading...</TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={4}>No products found. Click "Add Product" to create one.</TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product._id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  <TableCell className="py-3 text-theme-sm font-medium text-gray-800 dark:text-white/90">{product.name}</TableCell>
                  <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{product.unit}</TableCell>
                  <TableCell className="py-3 text-theme-sm capitalize text-gray-500 dark:text-gray-400">
                    <span className="capitalize">{product.category}</span>
                  </TableCell>
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
    </div>
  );
}
