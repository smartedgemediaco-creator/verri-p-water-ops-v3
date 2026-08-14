import { Types } from "mongoose";
import { RawMaterialBatch, RawMaterial, type ICustomFieldDef } from "@/lib/models";

/**
 * Option A invariant: batches are the source of truth; RawMaterial.currentStock
 * is a recomputed cache. Recomputed only when batches exist, so legacy materials
 * with stock but no batches keep their stored value until their first batch.
 */
export async function recomputeMaterialStock(materialId: Types.ObjectId | string): Promise<number> {
  const [batches, material] = await Promise.all([
    RawMaterialBatch.find({ rawMaterialId: materialId }, { availableQuantity: 1 }),
    RawMaterial.findById(materialId).select("currentStock"),
  ]);
  if (!material) return 0;
  if (batches.length > 0) {
    const total = batches.reduce((sum, b) => sum + (b.availableQuantity || 0), 0);
    if (material.currentStock !== total) {
      material.currentStock = total;
      await material.save();
    }
  }
  return material.currentStock;
}

export interface BatchConversionLike {
  receivedQuantity?: number;
  itemCount?: number;
}

/** Convert a secondary-unit quantity (e.g. rolls) into the batch's primary unit (e.g. kg). */
export function itemToPrimaryQty(batch: BatchConversionLike, itemQty: number): number {
  const received = Number(batch.receivedQuantity) || 0;
  const count = Number(batch.itemCount) || 0;
  if (!received || !count) return 0;
  return (itemQty * received) / count;
}

/** Convert a primary-unit quantity (e.g. kg) into the batch's secondary unit (e.g. rolls). */
export function primaryToItemQty(batch: BatchConversionLike, primaryQty: number): number {
  const received = Number(batch.receivedQuantity) || 0;
  const count = Number(batch.itemCount) || 0;
  if (!received || !count) return 0;
  return (primaryQty * count) / received;
}

const CUSTOM_FIELD_FORMATS = ["number", "currency", "percentage", "text"] as const;

export function sanitizeCustomFields(
  fields: unknown,
  maxFields = 20
): ICustomFieldDef[] {
  if (!Array.isArray(fields)) return [];
  const seen = new Set<string>();
  const clean: ICustomFieldDef[] = [];
  for (const raw of fields) {
    if (clean.length >= maxFields) break;
    if (!raw || typeof raw !== "object") continue;
    const f = raw as Record<string, unknown>;
    const label = typeof f.label === "string" ? f.label.trim() : "";
    const formula = typeof f.formula === "string" ? f.formula.trim() : "";
    if (!label || !formula) continue;
    const key = (typeof f.key === "string" && f.key.trim() ? f.key.trim() : label).replace(/\s+/g, "_");
    if (seen.has(key)) continue;
    seen.add(key);
    const format = CUSTOM_FIELD_FORMATS.includes(f.format as (typeof CUSTOM_FIELD_FORMATS)[number])
      ? (f.format as ICustomFieldDef["format"])
      : "number";
    clean.push({ key, label, formula, format });
  }
  return clean;
}
