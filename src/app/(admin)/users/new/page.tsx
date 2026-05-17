"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import InputField from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import Button from "@/components/ui/button/Button";

const roles = [
  { value: "admin", label: "Admin" },
  { value: "factory-manager", label: "Factory Manager" },
  { value: "depot-manager", label: "Depot Manager" },
  { value: "driver", label: "Driver" },
];

export default function NewUserPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [factoryId, setFactoryId] = useState("");
  const [depotId, setDepotId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [factories, setFactories] = useState<{ value: string; label: string }[]>([]);
  const [depots, setDepots] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    fetch("/api/factories")
      .then((r) => r.json())
      .then((data: { _id: string; name: string }[]) =>
        setFactories(data.map((f) => ({ value: f._id, label: f.name })))
      );
    fetch("/api/depots")
      .then((r) => r.json())
      .then((data: { _id: string; name: string }[]) =>
        setDepots(data.map((d) => ({ value: d._id, label: d.name })))
      );
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const body: Record<string, any> = { name, email, password, role };
    if (role === "factory-manager") body.factoryId = factoryId;
    if (role === "depot-manager") body.depotId = depotId;

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to create user");
      setSubmitting(false);
      return;
    }

    router.push("/users");
  };

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">Add User</h1>
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 max-w-lg space-y-4">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-lg p-3">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
          <InputField id="name" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
          <InputField id="email" type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
          <InputField id="password" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
          <Select options={roles} placeholder="Select role" onChange={(val) => { setRole(val); setFactoryId(""); setDepotId(""); }} />
        </div>

        {role === "factory-manager" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assigned Factory</label>
            <Select options={factories} placeholder="Select factory" value={factoryId} onChange={setFactoryId} />
          </div>
        )}

        {role === "depot-manager" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assigned Depot</label>
            <Select options={depots} placeholder="Select depot" value={depotId} onChange={setDepotId} />
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? "Creating..." : "Create User"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/users")}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
