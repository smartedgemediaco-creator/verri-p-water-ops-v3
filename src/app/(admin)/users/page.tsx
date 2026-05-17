"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { PlusIcon, UserIcon, GroupIcon } from "@/icons";

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  factoryId?: { _id: string; name: string } | string;
  depotId?: { _id: string; name: string } | string;
  isActive: boolean;
  createdAt: string;
}

const roleBadge = (role: string) => {
  const map: Record<string, "primary" | "success" | "warning" | "info" | "light"> = {
    admin: "primary",
    "factory-manager": "warning",
    "depot-manager": "info",
    driver: "light",
  };
  return <Badge variant="light" color={map[role] ?? "light"}>{role}</Badge>;
};

const roleLabel = (role: string) => {
  const map: Record<string, string> = {
    admin: "Admin",
    "factory-manager": "Factory Manager",
    "depot-manager": "Depot Manager",
    driver: "Driver",
  };
  return map[role] || role;
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    fetch("/api/users")
      .then((res) => res.json())
      .then(setUsers)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const toggleActive = async (id: string, current: boolean) => {
    await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !current }),
    });
    fetchUsers();
  };

  const totalActive = users.filter((u) => u.isActive).length;

  const assignedTo = (user: User): string => {
    if (user.factoryId && typeof user.factoryId === "object") return user.factoryId.name;
    if (user.depotId && typeof user.depotId === "object") return user.depotId.name;
    return "";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageBreadcrumb pageTitle="Users" />
        <Link href="/users/new">
          <Button variant="primary" size="sm" startIcon={<PlusIcon />}>
            Add User
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-6 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg dark:bg-blue-500/10 mb-3">
            <UserIcon className="text-blue-600 size-5 dark:text-blue-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Users</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{users.length}</h4>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg dark:bg-green-500/10 mb-3">
            <GroupIcon className="text-green-600 size-5 dark:text-green-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{totalActive}</h4>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-lg dark:bg-purple-500/10 mb-3">
            <UserIcon className="text-purple-600 size-5 dark:text-purple-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Roles</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{new Set(users.map((u) => u.role)).size}</h4>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <Table>
          <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
            <TableRow>
              <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Name</TableCell>
              <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Email</TableCell>
              <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Role</TableCell>
              <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Assigned To</TableCell>
              <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Status</TableCell>
              <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Joined</TableCell>
              <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Action</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <TableRow>
                <TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={7}>Loading...</TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={7}>No users found. Click "Add User" to create one.</TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user._id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  <TableCell className="py-3 text-theme-sm font-medium text-gray-800 dark:text-white/90">{user.name}</TableCell>
                  <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{user.email}</TableCell>
                  <TableCell className="py-3">{roleBadge(user.role)}</TableCell>
                  <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{assignedTo(user) || roleLabel(user.role)}</TableCell>
                  <TableCell className="py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.isActive ? "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400" : "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400"
                    }`}>
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="py-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleActive(user._id, user.isActive)}
                    >
                      {user.isActive ? "Revoke" : "Activate"}
                    </Button>
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
