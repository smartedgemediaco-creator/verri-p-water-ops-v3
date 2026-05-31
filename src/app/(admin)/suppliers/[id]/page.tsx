"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import AutoAmount from "@/components/ui/AutoAmount";
import Badge from "@/components/ui/badge/Badge";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import Button from "@/components/ui/button/Button";
import InputField from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import Select from "@/components/form/Select";
import { formatDate } from "@/lib/dateFormat";
import { showSuccess, showError } from "@/lib/toast";
import LocationPicker from "@/components/location/LocationPicker";
import { BoxIcon, PencilIcon, PlusIcon, DollarLineIcon, BoltIcon, ListIcon } from "@/icons";
import { LightbulbIcon, AlertTriangleIcon, CheckCircleIcon, TrendingUpIcon } from "lucide-react";

interface Supplier {
  _id: string; name: string; phone: string; email: string; address: string;
  coordinates: { lat: number; lng: number }; placeId: string;
  supplyType: string; materialProvided: string; isActive: boolean; notes: string; createdAt: string;
}

interface POPopulated {
  _id: string; supplierId: { _id: string; name: string; supplyType: string } | null;
  orderNumber: string;
  items: Array<{ rawMaterialId: { _id: string; name: string } | string; quantity: number; unitPrice: number }>;
  status: string; orderDate: string; expectedDate?: string; totalAmount: number; notes: string;
}

interface GRNItemView {
  rawMaterialId: { _id: string; name: string; unit: string } | string;
  quantityReceived: number; quantityOrdered: number; condition: string;
}

interface GRNPopulated {
  _id: string;
  purchaseOrderId: { _id: string; orderNumber: string; supplierId: { _id: string; name: string } | string } | null;
  receivedDate: string; items: GRNItemView[]; receivedBy: string; notes: string;
}

interface RawMaterialOption {
  _id: string; name: string; unit: string; category: string;
  currentStock: number; minimumStock: number; unitCost: number; notes: string;
}

interface MaterialInsight {
  _id: string; name: string; category: string;
  currentStock: number; minimumStock: number; unit: string; unitCost: number; needsReorder: boolean;
}

interface StatusBreakdownItem {
  status: string; count: number;
}

interface POMini {
  _id: string; orderNumber: string; totalAmount: number;
  status: string; orderDate: string; itemCount: number;
}

interface GRNMini {
  _id: string; orderNumber: string; receivedDate: string; receivedBy: string; itemCount: number;
}

interface ContractData {
  contractStart?: string; contractEnd?: string;
  paymentTerms: string; leadTimeDays: number; isActive: boolean;
}

interface SupplierInsight {
  totalOrders: number; totalSpent: number; averageOrderValue: number;
  statusBreakdown: StatusBreakdownItem[];
  materials: MaterialInsight[];
  materialsNeedingReorder: number;
  contract: ContractData | null;
  recentOrders: POMini[];
  recentGRNs: GRNMini[];
  createdDate: string;
}

interface POItemForm {
  rawMaterialId: string; quantity: number; unitPrice: number;
}

interface GRNItemForm {
  rawMaterialId: string; quantityReceived: number; quantityOrdered: number; condition: string;
}

const SUPPLY_TYPE_COLORS: Record<string, string> = {
  material: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  equipment: "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
  transport: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  service: "bg-teal-100 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-500/10 dark:text-gray-400",
  sent: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  confirmed: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  received: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
};

const PAYMENT_TERMS = [
  { value: "net-15", label: "Net 15" },
  { value: "net-30", label: "Net 30" },
  { value: "net-45", label: "Net 45" },
  { value: "net-60", label: "Net 60" },
];

export default function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [insights, setInsights] = useState<SupplierInsight | null>(null);
  const [purchaseOrders, setPurchaseOrders] = useState<POPopulated[]>([]);
  const [grns, setGrns] = useState<GRNPopulated[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterialOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showPOModal, setShowPOModal] = useState(false);
  const [showGRNModal, setShowGRNModal] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [today] = useState(() => Date.now());

  const [editForm, setEditForm] = useState({
    name: "", phone: "", email: "", address: "", coordinates: { lat: 0, lng: 0 }, placeId: "",
    supplyType: "material", materialProvided: "", isActive: true, notes: "",
  });

  const [poForm, setPoForm] = useState({
    expectedDate: "", notes: "",
    items: [{ rawMaterialId: "", quantity: 1, unitPrice: 0 }] as POItemForm[],
  });

  const [grnForm, setGrnForm] = useState({
    purchaseOrderId: "", receivedBy: "", notes: "",
    items: [] as GRNItemForm[],
  });

  const [contractForm, setContractForm] = useState({
    contractStart: "", contractEnd: "", paymentTerms: "net-30", leadTimeDays: 7,
  });

  const fetchAll = () => {
    Promise.all([
      fetch(`/api/suppliers/${id}`).then(r => r.json()),
      fetch(`/api/suppliers/${id}/insights`).then(r => r.json()),
      fetch(`/api/purchase-orders?supplierId=${encodeURIComponent(id)}`).then(r => r.json()),
      fetch(`/api/goods-received-notes`).then(r => r.json()),
      fetch(`/api/raw-materials`).then(r => r.json()),
    ]).then(([sup, ins, pos, grnData, mats]) => {
      setSupplier(sup);
      setInsights(ins);
      const poList = Array.isArray(pos) ? pos : [];
      setPurchaseOrders(poList);
      const allGrns = Array.isArray(grnData) ? grnData : [];
      const filteredGrns = allGrns.filter((g: GRNPopulated) => {
        const poSupplierId = (g.purchaseOrderId as Record<string, unknown>)?.supplierId;
        if (!poSupplierId) return false;
        const sid = typeof poSupplierId === "string" ? poSupplierId : (poSupplierId as Record<string, string>)._id ?? "";
        return sid === id;
      });
      setGrns(filteredGrns);
      setRawMaterials(Array.isArray(mats) ? mats : []);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchAll(); }, [id]);

  const openEdit = () => {
    if (!supplier) return;
    setEditForm({
      name: supplier.name, phone: supplier.phone ?? "", email: supplier.email ?? "",
      address: supplier.address ?? "", coordinates: supplier.coordinates ?? { lat: 0, lng: 0 }, placeId: supplier.placeId ?? "",
      supplyType: supplier.supplyType, materialProvided: supplier.materialProvided ?? "",
      isActive: supplier.isActive, notes: supplier.notes ?? "",
    });
    setShowEditModal(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/suppliers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) { showError("Failed to update supplier"); return; }
      showSuccess("Supplier updated");
      setShowEditModal(false);
      fetchAll();
    } catch {
      showError("Network error");
    } finally { setSubmitting(false); }
  };

  const handleAddPOItem = () => {
    setPoForm(prev => ({
      ...prev,
      items: [...prev.items, { rawMaterialId: "", quantity: 1, unitPrice: 0 }],
    }));
  };

  const handleRemovePOItem = (index: number) => {
    setPoForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handlePOItemChange = (index: number, field: keyof POItemForm, value: string | number) => {
    setPoForm(prev => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      if (field === "rawMaterialId") {
        const mat = rawMaterials.find(m => m._id === value);
        if (mat) items[index].unitPrice = mat.unitCost;
      }
      return { ...prev, items };
    });
  };

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const validItems = poForm.items.filter(i => i.rawMaterialId && i.quantity > 0);
      if (validItems.length === 0) { showError("Add at least one item"); return; }
      const res = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: id,
          items: validItems,
          expectedDate: poForm.expectedDate || undefined,
          notes: poForm.notes,
        }),
      });
      if (!res.ok) { showError("Failed to create purchase order"); return; }
      showSuccess("Purchase order created");
      setShowPOModal(false);
      setPoForm({ expectedDate: "", notes: "", items: [{ rawMaterialId: "", quantity: 1, unitPrice: 0 }] });
      fetchAll();
    } catch {
      showError("Network error");
    } finally { setSubmitting(false); }
  };

  const handleUpdatePOStatus = async (poId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/purchase-orders/${poId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) { showError("Failed to update status"); return; }
      showSuccess(`Order status updated to ${newStatus}`);
      fetchAll();
    } catch {
      showError("Network error");
    }
  };

  const handleSelectPOForGRN = (poId: string) => {
    const po = purchaseOrders.find(p => p._id === poId);
    if (!po) return;
    const items: GRNItemForm[] = po.items.map(item => {
      const matId = typeof item.rawMaterialId === "string" ? item.rawMaterialId : item.rawMaterialId._id;
      return {
        rawMaterialId: matId,
        quantityReceived: item.quantity,
        quantityOrdered: item.quantity,
        condition: "good",
      };
    });
    setGrnForm(prev => ({ ...prev, purchaseOrderId: poId, items }));
  };

  const handleGRNItemChange = (index: number, field: keyof GRNItemForm, value: string | number) => {
    setGrnForm(prev => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  };

  const handleCreateGRN = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (!grnForm.purchaseOrderId) { showError("Select a purchase order"); return; }
      const res = await fetch("/api/goods-received-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchaseOrderId: grnForm.purchaseOrderId,
          items: grnForm.items,
          receivedBy: grnForm.receivedBy,
          notes: grnForm.notes,
        }),
      });
      if (!res.ok) { showError("Failed to record GRN"); return; }
      showSuccess("Goods received note recorded");
      setShowGRNModal(false);
      setGrnForm({ purchaseOrderId: "", receivedBy: "", notes: "", items: [] });
      fetchAll();
    } catch {
      showError("Network error");
    } finally { setSubmitting(false); }
  };

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/supplier-contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: id,
          contractStart: contractForm.contractStart || undefined,
          contractEnd: contractForm.contractEnd || undefined,
          paymentTerms: contractForm.paymentTerms,
          leadTimeDays: contractForm.leadTimeDays,
        }),
      });
      if (!res.ok) { showError("Failed to create contract"); return; }
      showSuccess("Contract created");
      setShowContractModal(false);
      setContractForm({ contractStart: "", contractEnd: "", paymentTerms: "net-30", leadTimeDays: 7 });
      fetchAll();
    } catch {
      showError("Network error");
    } finally { setSubmitting(false); }
  };

  if (loading || !supplier) return (
    <div>
      <PageBreadcrumb pageTitle="Supplier" />
      <div className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm">Loading supplier details...</div>
    </div>
  );

  const linkedMaterials: MaterialInsight[] = Array.isArray(insights?.materials) ? insights.materials : [];
  const needsReorderCount = insights?.materialsNeedingReorder ?? 0;
  const poCount = insights?.totalOrders ?? 0;
  const totalSpent = insights?.totalSpent ?? 0;
  const avgOrderValue = insights?.averageOrderValue ?? 0;
  const statusBreakdown = Array.isArray(insights?.statusBreakdown) ? insights.statusBreakdown : [];

  const confirmPOs = purchaseOrders.filter(p => p.status === "confirmed");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageBreadcrumb pageTitle={`Supplier: ${supplier.name}`} />
        <div className="flex gap-2">
          <Button size="sm" startIcon={<PencilIcon />} onClick={openEdit}>Edit Supplier</Button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm mb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-teal-100 dark:bg-teal-500/10">
            <BoxIcon className="w-7 h-7 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">{supplier.name}</h2>
              <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full ${supplier.isActive ? "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400" : "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400"}`}>
                {supplier.isActive ? "Active" : "Inactive"}
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full capitalize ${SUPPLY_TYPE_COLORS[supplier.supplyType] ?? "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"}`}>{supplier.supplyType}</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{supplier.materialProvided || "—"}</p>
            <div className="flex gap-4 mt-2 text-xs text-gray-400 flex-wrap">
              <span>Phone: <strong>{supplier.phone || "—"}</strong></span>
              <span>Email: <strong>{supplier.email || "—"}</strong></span>
              <span>Address: <strong>{supplier.address || "—"}</strong></span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm">
          <div className="flex items-center justify-center w-9 h-9 bg-blue-100 rounded-lg dark:bg-blue-500/10 mb-2">
            <ListIcon className="text-blue-600 size-4" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Total Orders</p>
          <p className="text-sm font-bold text-gray-800 dark:text-white">{poCount}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm">
          <div className="flex items-center justify-center w-9 h-9 bg-emerald-100 rounded-lg dark:bg-emerald-500/10 mb-2">
            <DollarLineIcon className="text-emerald-600 size-4" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Total Spent</p>
          <AutoAmount value={`₦${totalSpent.toLocaleString()}`} className="text-gray-800 dark:text-white !text-xs" />
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm">
          <div className="flex items-center justify-center w-9 h-9 bg-amber-100 rounded-lg dark:bg-amber-500/10 mb-2">
            <TrendingUpIcon className="text-amber-600 size-4" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Avg Order Value</p>
          <AutoAmount value={`₦${avgOrderValue.toLocaleString()}`} className="text-gray-800 dark:text-white !text-xs" />
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm">
          <div className="flex items-center justify-center w-9 h-9 bg-purple-100 rounded-lg dark:bg-purple-500/10 mb-2">
            <BoxIcon className="text-purple-600 size-4" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Materials Supplied</p>
          <p className="text-sm font-bold text-gray-800 dark:text-white">{linkedMaterials.length}</p>
        </div>
      </div>

      {insights && (() => {
        const advice: { type: "positive" | "warning" | "insight"; icon: React.ReactNode; title: string; message: string; href: string }[] = [];

        if (poCount === 0) {
          advice.push({ type: "warning", icon: <AlertTriangleIcon className="w-5 h-5 text-orange-500" />, title: "No Orders Yet", href: "/purchase-orders", message: "No purchase orders have been placed with this supplier. Consider creating a purchase order to start the relationship." });
        } else if (poCount > 5) {
          advice.push({ type: "positive", icon: <CheckCircleIcon className="w-5 h-5 text-emerald-500" />, title: "Reliable Partner", href: "/purchase-orders", message: `${poCount} orders placed totaling ₦${totalSpent.toLocaleString()}. This supplier is a trusted partner.` });
        } else {
          advice.push({ type: "insight", icon: <LightbulbIcon className="w-5 h-5 text-blue-500" />, title: "Moderate Engagement", href: "/purchase-orders", message: `${poCount} order(s) placed totaling ₦${totalSpent.toLocaleString()}. Increase engagement for better terms.` });
        }

        const contract = insights?.contract;
        if (!contract) {
          advice.push({ type: "warning", icon: <AlertTriangleIcon className="w-5 h-5 text-orange-500" />, title: "No Contract", href: "/suppliers", message: "No contract exists for this supplier. Consider creating one to formalize terms and pricing." });
        } else if (contract.contractEnd) {
          const daysUntilEnd = Math.ceil((new Date(contract.contractEnd).getTime() - today) / 86400000);
          if (daysUntilEnd > 0 && daysUntilEnd <= 30) {
            advice.push({ type: "warning", icon: <AlertTriangleIcon className="w-5 h-5 text-red-500" />, title: "Contract Expiring", href: "/suppliers", message: `Contract expires in ${daysUntilEnd} day(s) on ${formatDate(contract.contractEnd)}. Renew soon to avoid disruption.` });
          } else if (daysUntilEnd <= 0) {
            advice.push({ type: "warning", icon: <AlertTriangleIcon className="w-5 h-5 text-red-500" />, title: "Contract Expired", href: "/suppliers", message: "Contract has expired. Renew or renegotiate terms as soon as possible." });
          }
        }

        if (needsReorderCount > 0) {
          advice.push({ type: "warning", icon: <AlertTriangleIcon className="w-5 h-5 text-orange-500" />, title: "Reorder Alert", href: "/raw-materials", message: `${needsReorderCount} material(s) from this supplier need reordering (below minimum stock levels).` });
        }

        if (avgOrderValue > 0) {
          advice.push({ type: "insight", icon: <TrendingUpIcon className="w-5 h-5 text-emerald-500" />, title: "Order Value", href: "/purchase-orders", message: `Average order value is ₦${avgOrderValue.toLocaleString()} across ${poCount} order(s).` });
        }

        const cancelledDraftCount = statusBreakdown
          .filter(s => s.status === "draft" || s.status === "cancelled")
          .reduce((sum, s) => sum + s.count, 0);
        if (cancelledDraftCount > 0) {
          advice.push({ type: "insight", icon: <LightbulbIcon className="w-5 h-5 text-amber-500" />, title: "Pending Orders", href: "/purchase-orders", message: `${cancelledDraftCount} order(s) are still in draft or cancelled status. Review and take action.` });
        }

        return (
          <>
            {advice.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <LightbulbIcon className="w-5 h-5 text-amber-500" />
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Supplier Advisory</h3>
                </div>
                <div className="space-y-3">
                  {advice.map((a, i) => (
                    <Link key={i} href={a.href} className={`flex gap-3 p-3 rounded-lg hover:shadow-theme-sm transition-shadow ${a.type === "warning" ? "bg-red-50 dark:bg-red-500/5 border border-red-100 dark:border-red-500/10" : a.type === "positive" ? "bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10" : "bg-blue-50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/10"}`}>
                      <div className="flex-shrink-0 mt-0.5">{a.icon}</div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800 dark:text-white">{a.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{a.message}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm mb-6">
              <div className="flex items-center gap-2 mb-4">
                <BoltIcon className="w-5 h-5 text-emerald-500" />
                <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Supplier Stats</h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                <Link href="/purchase-orders" className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 hover:shadow-theme-sm transition-shadow block">
                  <p className="text-xs text-gray-400 mb-0.5">Total Orders</p>
                  <p className="text-sm font-bold text-gray-800 dark:text-white">{poCount}</p>
                </Link>
                <Link href="/costs" className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 hover:shadow-theme-sm transition-shadow block">
                  <p className="text-xs text-gray-400 mb-0.5">Total Spent</p>
                  <p className="text-xs font-bold text-gray-800 dark:text-white">₦{totalSpent.toLocaleString()}</p>
                </Link>
                <Link href="/purchase-orders" className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 hover:shadow-theme-sm transition-shadow block">
                  <p className="text-xs text-gray-400 mb-0.5">Avg Order Value</p>
                  <p className="text-xs font-bold text-gray-800 dark:text-white">₦{avgOrderValue.toLocaleString()}</p>
                </Link>
                <Link href="/raw-materials" className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 hover:shadow-theme-sm transition-shadow block">
                  <p className="text-xs text-gray-400 mb-0.5">Materials</p>
                  <p className="text-sm font-bold text-gray-800 dark:text-white">{linkedMaterials.length}</p>
                </Link>
              </div>

              {statusBreakdown.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Order Status Breakdown</h4>
                  <div className="space-y-2">
                    {statusBreakdown.map((s) => {
                      const pct = poCount > 0 ? ((s.count / poCount) * 100).toFixed(1) : "0";
                      const barColor = s.status === "received" ? "bg-emerald-500" : s.status === "confirmed" ? "bg-amber-500" : s.status === "sent" ? "bg-blue-500" : s.status === "cancelled" ? "bg-red-500" : "bg-gray-400";
                      return (
                        <div key={s.status} className="flex items-center gap-3">
                          <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full capitalize ${STATUS_COLORS[s.status] ?? "bg-gray-100 text-gray-700"}`}>{s.status}</span>
                          <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs font-medium text-gray-800 dark:text-white/90 w-12 text-right">{s.count}</span>
                          <span className="text-xs text-gray-400 w-12 text-right">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </>
        );
      })()}

      <div className="flex flex-wrap gap-2 mb-6">
        <Button size="sm" startIcon={<PlusIcon />} onClick={() => setShowPOModal(true)}>Create Purchase Order</Button>
        <Button size="sm" startIcon={<BoxIcon />} onClick={() => setShowGRNModal(true)} disabled={confirmPOs.length === 0}>Record Delivery / GRN</Button>
      </div>

      {insights?.contract ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Contract</h3>
            <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${insights.contract.isActive ? "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400" : "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400"}`}>
              {insights.contract.isActive ? "Active" : "Inactive"}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Start Date</span>
              <p className="font-medium text-gray-800 dark:text-white/90">{insights.contract.contractStart ? formatDate(insights.contract.contractStart) : "—"}</p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">End Date</span>
              <p className="font-medium text-gray-800 dark:text-white/90">{insights.contract.contractEnd ? formatDate(insights.contract.contractEnd) : "—"}</p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Payment Terms</span>
              <p className="font-medium text-gray-800 dark:text-white/90 capitalize">{insights.contract.paymentTerms}</p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Lead Time</span>
              <p className="font-medium text-gray-800 dark:text-white/90">{insights.contract.leadTimeDays} day(s)</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Contract</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">No contract yet. Create one to formalize supply terms.</p>
            </div>
            <Button size="sm" startIcon={<PlusIcon />} onClick={() => setShowContractModal(true)}>Create Contract</Button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm mb-6">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90 mb-3">Supplier Information</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div><span className="text-gray-500 dark:text-gray-400">Name</span><p className="font-medium text-gray-800 dark:text-white/90">{supplier.name}</p></div>
          <div><span className="text-gray-500 dark:text-gray-400">Phone</span><p className="font-medium text-gray-800 dark:text-white/90">{supplier.phone || "—"}</p></div>
          <div><span className="text-gray-500 dark:text-gray-400">Email</span><p className="font-medium text-gray-800 dark:text-white/90">{supplier.email || "—"}</p></div>
          <div><span className="text-gray-500 dark:text-gray-400">Address</span><p className="font-medium text-gray-800 dark:text-white/90">{supplier.address || "—"}</p></div>
          <div><span className="text-gray-500 dark:text-gray-400">Supply Type</span><p className="font-medium text-gray-800 dark:text-white/90 capitalize">{supplier.supplyType}</p></div>
          <div><span className="text-gray-500 dark:text-gray-400">Material Provided</span><p className="font-medium text-gray-800 dark:text-white/90">{supplier.materialProvided || "—"}</p></div>
          <div><span className="text-gray-500 dark:text-gray-400">Status</span><p className="font-medium"><span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${supplier.isActive ? "bg-success-50 text-success-700" : "bg-error-50 text-error-700"}`}>{supplier.isActive ? "Active" : "Inactive"}</span></p></div>
          <div className="col-span-2"><span className="text-gray-500 dark:text-gray-400">Notes</span><p className="font-medium text-gray-800 dark:text-white/90">{supplier.notes || "—"}</p></div>
          <div><span className="text-gray-500 dark:text-gray-400">Created</span><p className="font-medium text-gray-800 dark:text-white/90">{supplier.createdAt ? formatDate(supplier.createdAt) : "—"}</p></div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm mb-6 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Purchase Orders — {purchaseOrders.length} entries</h3>
        </div>
        {purchaseOrders.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell isHeader className="text-theme-xs">Order #</TableCell>
                <TableCell isHeader className="text-theme-xs">Date</TableCell>
                <TableCell isHeader className="text-theme-xs">Items</TableCell>
                <TableCell isHeader className="text-theme-xs">Total</TableCell>
                <TableCell isHeader className="text-theme-xs">Status</TableCell>
                <TableCell isHeader className="text-theme-xs">Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchaseOrders.map((po) => {
                const itemCount = Array.isArray(po.items) ? po.items.length : 0;
                return (
                  <TableRow key={po._id}>
                    <TableCell className="text-sm font-medium text-gray-800 dark:text-white/90">{po.orderNumber}</TableCell>
                    <TableCell className="text-sm text-gray-500">{formatDate(po.orderDate)}</TableCell>
                    <TableCell className="text-sm text-gray-500">{itemCount}</TableCell>
                    <TableCell className="text-sm font-semibold text-gray-800 dark:text-white/90">₦{(po.totalAmount ?? 0).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="light" color={po.status === "received" ? "success" : po.status === "confirmed" ? "warning" : po.status === "sent" ? "info" : po.status === "cancelled" ? "error" : "light"}>{po.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {po.status === "draft" && (
                          <Button size="sm" variant="outline" onClick={() => handleUpdatePOStatus(po._id, "sent")}>Send</Button>
                        )}
                        {po.status === "sent" && (
                          <Button size="sm" variant="outline" onClick={() => handleUpdatePOStatus(po._id, "confirmed")}>Confirm</Button>
                        )}
                        {po.status === "confirmed" && (
                          <Button size="sm" variant="outline" onClick={() => handleUpdatePOStatus(po._id, "received")}>Mark Received</Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-6 text-sm text-gray-500 dark:text-gray-400">No purchase orders yet.</div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm mb-6 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Goods Received Notes — {grns.length} entries</h3>
        </div>
        {grns.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell isHeader className="text-theme-xs">Order #</TableCell>
                <TableCell isHeader className="text-theme-xs">Date</TableCell>
                <TableCell isHeader className="text-theme-xs">Received By</TableCell>
                <TableCell isHeader className="text-theme-xs">Items</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grns.map((grn) => {
                const orderNumber = grn.purchaseOrderId && typeof grn.purchaseOrderId === "object"
                  ? (grn.purchaseOrderId as Record<string, string>).orderNumber ?? "—"
                  : "—";
                return (
                  <TableRow key={grn._id}>
                    <TableCell className="text-sm font-medium text-gray-800 dark:text-white/90">{orderNumber}</TableCell>
                    <TableCell className="text-sm text-gray-500">{grn.receivedDate ? formatDate(grn.receivedDate) : "—"}</TableCell>
                    <TableCell className="text-sm text-gray-500">{grn.receivedBy || "—"}</TableCell>
                    <TableCell className="text-sm text-gray-500">{Array.isArray(grn.items) ? grn.items.length : 0}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-6 text-sm text-gray-500 dark:text-gray-400">No goods received notes yet.</div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm mb-6 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Supplied Materials — {linkedMaterials.length} items</h3>
        </div>
        {linkedMaterials.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell isHeader className="text-theme-xs">Material</TableCell>
                <TableCell isHeader className="text-theme-xs">Category</TableCell>
                <TableCell isHeader className="text-theme-xs">Current Stock</TableCell>
                <TableCell isHeader className="text-theme-xs">Unit Cost</TableCell>
                <TableCell isHeader className="text-theme-xs">Status</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linkedMaterials.map((m) => (
                <TableRow key={m._id}>
                  <TableCell className="text-sm font-medium text-gray-800 dark:text-white/90">{m.name}</TableCell>
                  <TableCell className="text-sm capitalize text-gray-500">{m.category}</TableCell>
                  <TableCell className="text-sm text-gray-800 dark:text-white/90">{(m.currentStock ?? 0).toLocaleString()} {m.unit || ""}</TableCell>
                  <TableCell className="text-sm text-gray-800 dark:text-white/90">₦{(m.unitCost ?? 0).toLocaleString()}</TableCell>
                  <TableCell>
                    <span className={`inline-block px-2.5 py-0.5 text-xs font-medium rounded-full ${m.needsReorder ? "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400" : "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400"}`}>
                      {m.needsReorder ? "Needs Reorder" : "In Stock"}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-6 text-sm text-gray-500 dark:text-gray-400">No raw materials linked to this supplier via purchase orders.</div>
        )}
      </div>

      <div className="mt-6 text-center text-xs text-gray-400">
        <button onClick={fetchAll} className="text-blue-500 hover:text-blue-600 underline mr-4">Refresh</button>
        Supplier ID: {id.slice(-8)}
      </div>

      {showEditModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40" onClick={() => { if (!submitting) setShowEditModal(false); }}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-lg w-full mx-4 shadow-theme-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4">Edit Supplier</h3>
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                  <InputField type="text" placeholder="Name" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} required /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                  <InputField type="text" placeholder="Phone" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                  <InputField type="email" placeholder="Email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Supply Type</label>
                  <Select options={[{ value: "material", label: "Material" }, { value: "equipment", label: "Equipment" }, { value: "transport", label: "Transport" }, { value: "service", label: "Service" }, { value: "other", label: "Other" }]} value={editForm.supplyType} onChange={v => setEditForm({ ...editForm, supplyType: v })} /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                <LocationPicker value={editForm.address} latValue={editForm.coordinates.lat} lngValue={editForm.coordinates.lng} onChange={(loc) => setEditForm({ ...editForm, address: loc.address, coordinates: { lat: loc.lat, lng: loc.lng }, placeId: loc.placeId })} /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Material / Service Provided</label>
                <InputField type="text" placeholder="e.g. PET preforms" value={editForm.materialProvided} onChange={e => setEditForm({ ...editForm, materialProvided: e.target.value })} /></div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="edit-supplier-active" checked={editForm.isActive} onChange={e => setEditForm({ ...editForm, isActive: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                <label htmlFor="edit-supplier-active" className="text-sm text-gray-700 dark:text-gray-300">Active</label>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <TextArea placeholder="Notes" value={editForm.notes} onChange={v => setEditForm({ ...editForm, notes: v })} rows={3} /></div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={submitting || !editForm.name}>{submitting ? "Saving..." : "Update Supplier"}</Button>
                <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPOModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40" onClick={() => { if (!submitting) setShowPOModal(false); }}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-lg w-full mx-4 shadow-theme-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4">Create Purchase Order — {supplier.name}</h3>
            <form onSubmit={handleCreatePO} className="space-y-4">
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Items</label>
                {poForm.items.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-start bg-gray-50 dark:bg-gray-800/30 p-3 rounded-lg">
                    <div className="flex-1 space-y-2">
                      <Select
                        options={rawMaterials.map(m => ({ value: m._id, label: `${m.name} (₦${(m.unitCost ?? 0).toLocaleString()})` }))}
                        placeholder="Select material"
                        value={item.rawMaterialId}
                        onChange={v => handlePOItemChange(idx, "rawMaterialId", v)}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <InputField type="number" placeholder="Qty" value={item.quantity} onChange={e => handlePOItemChange(idx, "quantity", Number(e.target.value))} />
                        <InputField type="number" placeholder="Unit Price" value={item.unitPrice} onChange={e => handlePOItemChange(idx, "unitPrice", Number(e.target.value))} />
                      </div>
                    </div>
                    {poForm.items.length > 1 && (
                      <button type="button" onClick={() => handleRemovePOItem(idx)} className="text-red-500 hover:text-red-700 mt-2 text-sm">✕</button>
                    )}
                  </div>
                ))}
                <Button type="button" size="sm" variant="outline" startIcon={<PlusIcon />} onClick={handleAddPOItem}>Add Item</Button>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expected Date</label>
                <InputField type="date" value={poForm.expectedDate} onChange={e => setPoForm({ ...poForm, expectedDate: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <TextArea placeholder="Order notes" value={poForm.notes} onChange={v => setPoForm({ ...poForm, notes: v })} rows={2} /></div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={submitting || poForm.items.every(i => !i.rawMaterialId)}>{submitting ? "Saving..." : "Create Purchase Order"}</Button>
                <Button type="button" variant="outline" onClick={() => setShowPOModal(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showGRNModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40" onClick={() => { if (!submitting) setShowGRNModal(false); }}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-lg w-full mx-4 shadow-theme-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4">Record Delivery / GRN — {supplier.name}</h3>
            <form onSubmit={handleCreateGRN} className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Purchase Order</label>
                <Select
                  options={confirmPOs.map(p => ({ value: p._id, label: `${p.orderNumber} — ₦${(p.totalAmount ?? 0).toLocaleString()}` }))}
                  placeholder="Select confirmed PO"
                  value={grnForm.purchaseOrderId}
                  onChange={v => handleSelectPOForGRN(v)}
                />
              </div>
              {grnForm.items.length > 0 && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Items Received</label>
                  {grnForm.items.map((item, idx) => {
                    const matName = rawMaterials.find(m => m._id === item.rawMaterialId)?.name ?? "Unknown";
                    return (
                      <div key={idx} className="bg-gray-50 dark:bg-gray-800/30 p-3 rounded-lg space-y-2">
                        <p className="text-sm font-medium text-gray-800 dark:text-white/90">{matName}</p>
                        <div className="grid grid-cols-3 gap-2">
                          <div><label className="block text-xs text-gray-500 mb-0.5">Ordered</label>
                            <InputField type="number" value={item.quantityOrdered} disabled /></div>
                          <div><label className="block text-xs text-gray-500 mb-0.5">Received</label>
                            <InputField type="number" value={item.quantityReceived} onChange={e => handleGRNItemChange(idx, "quantityReceived", Number(e.target.value))} /></div>
                          <div><label className="block text-xs text-gray-500 mb-0.5">Condition</label>
                            <Select options={[{ value: "good", label: "Good" }, { value: "damaged", label: "Damaged" }, { value: "partial", label: "Partial" }]} value={item.condition} onChange={v => handleGRNItemChange(idx, "condition", v)} /></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Received By</label>
                <InputField type="text" placeholder="Name of receiver" value={grnForm.receivedBy} onChange={e => setGrnForm({ ...grnForm, receivedBy: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <TextArea placeholder="Receiving notes" value={grnForm.notes} onChange={v => setGrnForm({ ...grnForm, notes: v })} rows={2} /></div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={submitting || !grnForm.purchaseOrderId}>{submitting ? "Saving..." : "Record GRN"}</Button>
                <Button type="button" variant="outline" onClick={() => setShowGRNModal(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showContractModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40" onClick={() => { if (!submitting) setShowContractModal(false); }}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-md w-full mx-4 shadow-theme-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4">Create Contract — {supplier.name}</h3>
            <form onSubmit={handleCreateContract} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                  <InputField type="date" value={contractForm.contractStart} onChange={e => setContractForm({ ...contractForm, contractStart: e.target.value })} /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                  <InputField type="date" value={contractForm.contractEnd} onChange={e => setContractForm({ ...contractForm, contractEnd: e.target.value })} /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Terms</label>
                <Select options={PAYMENT_TERMS} value={contractForm.paymentTerms} onChange={v => setContractForm({ ...contractForm, paymentTerms: v })} /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Lead Time (Days)</label>
                <InputField type="number" placeholder="7" value={contractForm.leadTimeDays} onChange={e => setContractForm({ ...contractForm, leadTimeDays: Number(e.target.value) })} /></div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : "Create Contract"}</Button>
                <Button type="button" variant="outline" onClick={() => setShowContractModal(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
