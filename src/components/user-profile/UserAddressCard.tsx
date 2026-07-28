"use client";
import React from "react";
import { useAuth } from "@/context/AuthContext";

export default function UserAddressCard() {
  const { user } = useAuth();

  const locationType = user?.factoryId ? "Factory" : user?.depotId ? "Depot" : user?.truckId ? "Truck" : "—";
  const locationName = user?.factoryName || user?.depotName || user?.truckName || "—";

  return (
    <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-6">
            Assigned Location
          </h4>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                Location Type
              </p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                {locationType}
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                Location Name
              </p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                {locationName}
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                Role
              </p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90 capitalize">
                {user?.role ? user.role.replace("-", " ") : "—"}
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                User ID
              </p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90 font-mono">
                {user?._id ? user._id.slice(-8) : "—"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
