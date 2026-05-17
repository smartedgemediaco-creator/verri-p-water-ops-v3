import React from "react";

export default function SidebarWidget() {
  return (
    <div className="mx-auto mb-10 w-full max-w-60 rounded-2xl bg-brand-50 px-4 py-5 text-center dark:bg-brand-500/[0.12]">
      <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">
        Verri P Water Inc
      </h3>
      <p className="mb-4 text-gray-500 text-theme-sm dark:text-gray-400">
        Sachet &amp; Bottle Water Ops
      </p>
      <div className="text-theme-xs text-gray-400 dark:text-gray-500">
        Factory, Depot &amp; Distribution Mgmt
      </div>
    </div>
  );
}
