# Plan: Redesign Sales Recording — Factory vs Depot Separation

## Context

The current sales system treats factory and depot sales identically: same form, same price locking, same stock deduction. This is wrong because:
- **Factory sales** are informal — staff sell at any price, give family/friends discounts, don't need strict product pricing
- **Factory sales don't deduct inventory** — stock at factories is managed via Production + Transfers + Daily Stock
- **Depot sales** are more structured but also need price flexibility (not always catalog price)
- Users are laymen and the current form is confusing when the context is different
- The stock badge in the form has bugs (loading state broken, no client-side validation)

## Changes Overview

### 1. Sidebar Menu — Split Sales into Two Items

**File:** `src/layout/AppSidebar.tsx`

Replace the single "Sales" entry with two:

```diff
- { icon: <DollarLineIcon />, name: "Sales", path: "/sales", color: "text-emerald-500" },
+ { icon: <DollarLineIcon />, name: "Factory Sales", path: "/sales?type=factory", color: "text-blue-500" },
+ { icon: <DollarLineIcon />, name: "Depot Sales", path: "/sales?type=depot", color: "text-emerald-500" },
```

This follows the exact same pattern as "Daily Stock (Factories)" / "Daily Stock (Depots)".

---

### 2. Sales List Page — Read `?type` Param, Filter Accordingly

**File:** `src/app/(admin)/sales/page.tsx`

**Changes:**
- Read `?type=factory` or `?type=depot` from `useSearchParams()`
- Auto-set `locationType` filter on the API call based on `type` param
- Update page title: "Factory Sales" or "Depot Sales"
- Update "Record Sale" button href: `/sales/new?type=factory` or `/sales/new?type=depot`
- **Factory Sales view:** Hide stock-related info, show simpler stats (total revenue, units sold, by payment method)
- **Depot Sales view:** Keep current stats cards
- Both views share the same table structure but factory sales don't show stock badges

---

### 3. New Sale Form — Context-Aware (Factory vs Depot)

**File:** `src/app/(admin)/sales/new/page.tsx`

**Read `?type=factory` or `?type=depot` from URL** to determine mode.

#### Factory Mode:
- Location is auto-set to the user's factory (or factory-manager picks if admin)
- `locationType` locked to `"factory"` — no dropdown to choose depot/truck
- **UnitPrice is EDITABLE** — user can type any price (discounts, family/friends pricing)
- **No stock badge shown** — factory sales don't deduct stock
- **No stock validation** — quantity can be anything
- **Chilled toggle stays** — but price is editable regardless
- **Total is auto-calculated** from qty × price, but user can override totalAmount directly
- Form is simpler: Product, Quantity, Unit Price (editable), Total Amount (editable), Customer Name, Payment Method, Date, Notes

#### Depot Mode:
- Location is auto-set for depot-manager, or admin picks
- `locationType` is `"depot"` (or admin can choose depot/truck)
- **UnitPrice is EDITABLE** — depot managers can set custom prices too
- **Stock badge shown** — with fixed loading state
- **Client-side validation** — warn (don't hard-block) if quantity > available stock
- Total auto-calculated but editable
- Same fields as current form minus the price lock

#### Both Modes:
- UnitPrice input is **always enabled** (remove `disabled` attribute)
- Remove server-side price catalog enforcement for all users
- Keep the product catalog price as a **suggested default** (auto-fill when product is selected, but user can change it)
- Total amount auto-calculates but is also editable (for cases where they just type the total)

#### Bug Fixes in this file:
1. **`stockLoading` never set to `true`** — add `setStockLoading(true)` before the fetch
2. **Stock fetch sums multiple records** — use `.findOne()` pattern instead (or keep sum but it should be fine with unique index)
3. **Add client-side stock warning** — for depot sales, show a warning toast/banner if quantity > available, but still allow submission (server will reject anyway)

---

### 4. API POST — Skip Stock for Factory Sales, Remove Price Lock

**File:** `src/app/api/sales/route.ts`

**Changes to POST handler:**

```typescript
// After getting body and normalizing location:

// SKIP stock check + deduction for factory sales
if (body.locationType !== "factory") {
  // Stock check (existing code)
  const inventoryFilter = { locationType: body.locationType, locationId: body.locationId, productId: body.productId };
  const currentStock = await Stock.findOne(inventoryFilter);
  const available = currentStock?.quantity ?? 0;
  if (available < body.quantity) {
    return NextResponse.json(
      { error: `Insufficient stock: ${available} available, ${body.quantity} required` },
      { status: 400 }
    );
  }
}

// ... create sale ...

// SKIP stock deduction for factory sales
if (body.locationType !== "factory") {
  await Stock.findOneAndUpdate(
    inventoryFilter,
    { $inc: { quantity: -body.quantity } },
    { upsert: true }
  );
}
```

**Remove price enforcement** (lines 132-143):
- Delete the block that checks `user.role !== "admin" && body.productId` and compares prices
- Both factory and depot users can set any unit price
- The catalog price is just a default suggestion, not enforced

**Keep `totalAmount` trusted from client** — since users can set arbitrary prices, the client-calculated total is the source of truth.

---

### 5. API DELETE (Cancel Sale) — Skip Stock Restore for Factory Sales

**File:** `src/app/api/sales/[id]/route.ts`

When cancelling a sale, only restore stock if `sale.locationType !== "factory"`:

```typescript
if (sale.locationType !== "factory") {
  await Stock.findOneAndUpdate(
    { locationType: sale.locationType, locationId: sale.locationId, productId: sale.productId },
    { $inc: { quantity: sale.quantity } },
    { upsert: true }
  );
}
```

---

### 6. API PATCH (Edit Sale) — Fix Stock Adjustment Bug

**File:** `src/app/api/sales/[id]/route.ts`

When an admin edits a sale's quantity or product, the stock must be adjusted:
- If quantity changed: restore old quantity, deduct new quantity
- If product changed: restore old product stock, deduct new product stock
- **Skip all stock adjustments** if `sale.locationType === "factory"`

```typescript
// After saving the edited sale:
if (sale.locationType !== "factory") {
  // Restore old stock
  await Stock.findOneAndUpdate(
    { locationType: sale.locationType, locationId: sale.locationId, productId: oldProductId },
    { $inc: { quantity: oldQuantity } }
  );
  // Deduct new stock
  await Stock.findOneAndUpdate(
    { locationType: sale.locationType, locationId: sale.locationId, productId: sale.productId },
    { $inc: { quantity: -sale.quantity } },
    { upsert: true }
  );
}
```

---

## Files to Modify (in order)

| # | File | Change |
|---|------|--------|
| 1 | `src/layout/AppSidebar.tsx` | Split "Sales" into "Factory Sales" + "Depot Sales" menu items |
| 2 | `src/app/api/sales/route.ts` | Skip stock for factory sales, remove price lock, keep totalAmount from client |
| 3 | `src/app/api/sales/[id]/route.ts` | Fix stock adjustment on edit, skip stock restore on cancel for factory |
| 4 | `src/app/(admin)/sales/page.tsx` | Read `?type` param, filter by locationType, update titles/buttons, split views |
| 5 | `src/app/(admin)/sales/new/page.tsx` | Read `?type` param, make unitPrice editable, hide stock for factory, fix stockLoading bug, add stock warning for depot |

## Model Changes

**None.** The existing `Sale` model already has `locationType: "factory" | "depot" | "truck"` which is sufficient. No schema changes needed.

---

## Verification

After implementation:
1. Run `npm run lint` — no new errors
2. Run `npm run build` — compiles successfully
3. Manual test: Create a factory sale → verify NO stock deduction
4. Manual test: Create a depot sale → verify stock IS deducted
5. Manual test: Edit unit price on both types → verify price is saved as entered
6. Manual test: Cancel a factory sale → verify NO stock restoration
7. Manual test: Cancel a depot sale → verify stock IS restored
8. Manual test: Edit a depot sale quantity → verify stock adjusts correctly
9. Verify sidebar shows "Factory Sales" and "Depot Sales" as separate items
10. Verify `/sales?type=factory` shows only factory sales, `/sales?type=depot` shows only depot sales
