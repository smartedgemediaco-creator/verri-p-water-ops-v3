"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { showAiToast } from "@/lib/toast";
import { useActivity } from "@/context/ActivityContext";
import { useAuth } from "@/context/AuthContext";

interface Nudge {
  id: string;
  title: string;
  message: string;
  href?: string;
  priority: number;
}

/**
 * The Verri Assistant — a lightweight, non-intrusive nudge engine.
 *
 * - Detects features the user has never touched (e.g. no costs recorded yet)
 *   and gently reminds them, pointing to the right page.
 * - Offers short contextual tips relevant to the page currently on screen.
 * - Fires at most once per trigger (initial route load + every 15 minutes),
 *   only when the tab is visible, and never re-nudges something the user has
 *   already dismissed or that was shown recently. One toast at a time.
 *
 * It is deliberately subtle: soft wording, informative never accusatory, and
 * always actionable via a deep-link to the page. No impact on page performance —
 * it reads a cached usage snapshot from ActivityContext (refreshed in background
 * every 15 min), so there's no per-visit API chatter.
 */

const FIFTEEN_MIN = 15 * 60 * 1000;

export default function AiAssistant() {
  const pathname = usePathname();
  const { usage } = useActivity();
  const { user } = useAuth();

  const shownRef = useRef<Record<string, number>>({});
  const lastPathRef = useRef<string | null>(null);

  function currentPageTip(): Nudge | null {
    const p = (pathname || "").split("?")[0];
    switch (p) {
      case "/factories":
      case "/depots":
      case "/trucks":
        if (usage.hasStock) {
          return {
            id: "loc-stock",
            title: "Stock on the move",
            priority: 4,
            message:
              "This page manages your locations. Remember to transfer stock between factories, depots and vehicles so your inventory stays accurate.",
            href: "/transfers",
          };
        }
        return null;
      case "/stock":
        return usage.hasStock
          ? {
              id: "stock-levels",
              title: "Keep an eye on stock",
              priority: 4,
              message:
                "Review your stock levels here. Products sitting too long may spoil — flag leakages so production stays efficient.",
              href: "/wastage",
            }
          : {
              id: "stock-empty",
              title: "No stock recorded yet",
              priority: 8,
              message:
                "Stock builds up automatically from Production, Transfers and Sales. Once you record a Production run, your levels will appear here.",
              href: "/production/new",
            };
      case "/sales":
        return usage.hasSales
          ? {
              id: "sales-tip",
              title: "Sales tip",
              priority: 4,
              message:
                "You can record sales by cash, POS, transfer or credit. Credit sales can be settled later from the same page.",
              href: "/sales",
            }
          : {
              id: "sales-cta",
              title: "Start recording sales",
              priority: 6,
              message:
                "Sales are the heart of the system — they reduce stock and build your revenue picture. Add your first sale to get going.",
              href: "/sales",
            };
      case "/costs":
        return !usage.hasCosts
          ? {
              id: "costs-cta",
              title: "Costs power your analysis",
              priority: 7,
              message:
                "You haven't recorded any costs yet. Costs (fuel, salaries, materials) are what turn your sales into true profit figures in Business Analysis.",
              href: "/costs",
            }
          : null;
      case "/transfers":
        return !usage.hasTransfers && usage.hasStock
          ? {
              id: "transfer-cta",
              title: "Move stock between locations",
              priority: 6,
              message:
                "Transfers let you move stock from a factory to a depot or vehicle. Try a transfer to keep inventory where it's needed most.",
              href: "/transfers",
            }
          : null;
      case "/analysis":
        return !usage.hasCosts || !usage.hasSales
          ? {
              id: "analysis-gap",
              title: "Analysis needs data",
              priority: 6,
              message:
                "Business Analysis combines sales and costs. Record both to see real profit and margin insights here.",
              href: !usage.hasSales ? "/sales" : "/costs",
            }
          : null;
      case "/reports":
        return {
          id: "reports-tip",
          title: "Shareable reports",
          priority: 4,
          message:
            "Generate a PDF report for any period or entity. Great for sharing factory and depot performance with your team.",
          href: "/reports",
        };
      case "/onboarding":
        return null; // They're already in onboarding.
      default:
        return null;
    }
  }

  function unusedFeatureNudge(): Nudge | null {
    const candidates: Nudge[] = [];

    if (!usage.hasCosts) {
      candidates.push({
        id: "unused-costs",
        title: "One thing you can try",
        priority: 5,
        message:
          "You haven't recorded any costs yet. Adding them shows the true profit behind your sales.",
        href: "/costs",
      });
    }

    if (!usage.hasSales) {
      candidates.push({
        id: "unused-sales",
        title: "One thing you can try",
        priority: 5,
        message:
          "Sales haven't been recorded yet. Logging sales is the quickest way to see revenue build up on your dashboard.",
        href: "/sales",
      });
    }

    if (!usage.hasProduction) {
      candidates.push({
        id: "unused-production",
        title: "One thing you can try",
        priority: 4,
        message:
          "Recording a production run is how stock first appears — try adding one for your factory.",
        href: "/production/new",
      });
    }

    if (!usage.hasTransfers && usage.hasStock) {
      candidates.push({
        id: "unused-transfer",
        title: "One thing you can try",
        priority: 3,
        message:
          "Stock is sitting somewhere. Transfers move it to where customers buy it — give it a try.",
        href: "/transfers",
      });
    }

    if (!usage.hasCustomers) {
      candidates.push({
        id: "unused-customers",
        title: "One thing you can try",
        priority: 3,
        message:
          "Adding your customers helps track who buys from you and supports credit sales.",
        href: "/customers",
      });
    }

    if (!usage.hasSuppliers) {
      candidates.push({
        id: "unused-suppliers",
        title: "One thing you can try",
        priority: 2,
        message:
          "List your suppliers to manage raw material sourcing and purchase orders in one place.",
        href: "/suppliers",
      });
    }

    if (!usage.hasWastage) {
      candidates.push({
        id: "unused-wastage",
        title: "One thing you can try",
        priority: 2,
        message:
          "Track leakages or damaged stock so they show as losses instead of disappearing from your numbers.",
        href: "/wastage",
      });
    }

    if (!usage.hasStaff) {
      candidates.push({
        id: "unused-staff",
        title: "One thing you can try",
        priority: 2,
        message:
          "Add your team to track attendance, daily pay and who manages each location.",
        href: "/staff",
      });
    }

    return candidates[0] ?? null;
  }

  useEffect(() => {
    if (!user) return;

    const now = Date.now();
    const canShow = (id: string) => {
      const last = shownRef.current[id];
      // Don't re-nudge the same item within the session (heavily throttled).
      if (last && now - last < FIFTEEN_MIN) return false;
      return true;
    };
    const markShown = (id: string) => {
      shownRef.current[id] = now;
    };

    const fire = () => {
      if (document.visibilityState !== "visible") return;

      const tip = currentPageTip();
      const unused = unusedFeatureNudge();

      // Highest-priority, non-recently-shown nudge wins. One toast at a time.
      const pool = [tip, unused]
        .filter((n): n is Nudge => n !== null)
        .filter((n) => canShow(n.id))
        .sort((a, b) => b.priority - a.priority);

      const nudge = pool[0];
      if (!nudge) return;

      markShown(nudge.id);
      showAiToast(nudge.message, {
        title: nudge.title,
        href: nudge.href,
        duration: 9000,
      });
    };

    // Route changed — nudge once on arrival (throttled per item).
    const isNewPath = lastPathRef.current !== pathname;
    lastPathRef.current = pathname;
    if (isNewPath) fire();

    // Recurring gentle nudge every 15 minutes, even if the user stays put.
    const id = setInterval(fire, FIFTEEN_MIN);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, user?._id]);
  // Intentionally NOT dependent on `usage` so a background refresh never
  // triggers a toast mid-session.

  return null;
}
