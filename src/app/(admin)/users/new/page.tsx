"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { showSuccess, showError } from "@/lib/toast";
import InputField from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import Button from "@/components/ui/button/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

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
  const [role, setRole] = useState("");
  const [staffId, setStaffId] = useState("");
  const [factoryId, setFactoryId] = useState("");
  const [depotId, setDepotId] = useState("");
  const [truckId, setTruckId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [navigateOnClose, setNavigateOnClose] = useState(false);
  const [error, setError] = useState("");

  const [staffList, setStaffList] = useState<{ value: string; label: string }[]>([]);
  const [staffInfoMap, setStaffInfoMap] = useState<Record<string, { name: string; email: string }>>({});
  const [factories, setFactories] = useState<{ value: string; label: string }[]>([]);
  const [depots, setDepots] = useState<{ value: string; label: string }[]>([]);
  const [trucks, setTrucks] = useState<{ value: string; label: string }[]>([]);

  // inline staff creation
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [staffName, setStaffName] = useState("");
  const [staffPhone, setStaffPhone] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffRole, setStaffRole] = useState("operator");
  const [staffDepartment, setStaffDepartment] = useState("production");
  const [staffLocationType, setStaffLocationType] = useState("");
  const [staffLocationId, setStaffLocationId] = useState("");
  const [staffCreating, setStaffCreating] = useState(false);

  const fetchStaff = () => {
    fetch("/api/staff")
      .then(r => { if (!r.ok) throw new Error(`staff ${r.status}`); return r.json(); })
      .then((data: unknown) => {
        if (Array.isArray(data)) {
          const items = data as { _id: string; name: string; email: string }[];
          setStaffList(items.map((s) => ({ value: s._id, label: s.name })));
          const map: Record<string, { name: string; email: string }> = {};
          items.forEach((s) => { map[s._id] = { name: s.name, email: s.email }; });
          setStaffInfoMap(map);
        }
      })
      .catch((e) => console.error("Failed to load staff:", e));
  };

  useEffect(() => {
    fetchStaff();
    fetch("/api/factories")
      .then((r) => { if (!r.ok) throw new Error(`factories ${r.status}`); return r.json(); })
      .then((data: unknown) => { if (Array.isArray(data)) setFactories((data as { _id: string; name: string }[]).map((f) => ({ value: f._id, label: f.name }))); })
      .catch((e) => console.error("Failed to load factories:", e));
    fetch("/api/depots")
      .then((r) => { if (!r.ok) throw new Error(`depots ${r.status}`); return r.json(); })
      .then((data: unknown) => { if (Array.isArray(data)) setDepots((data as { _id: string; name: string }[]).map((d) => ({ value: d._id, label: d.name }))); })
      .catch((e) => console.error("Failed to load depots:", e));
    fetch("/api/trucks")
      .then((r) => { if (!r.ok) throw new Error(`trucks ${r.status}`); return r.json(); })
      .then((data: unknown) => { if (Array.isArray(data)) setTrucks((data as { _id: string; plateNumber: string }[]).map((t) => ({ value: t._id, label: t.plateNumber }))); })
      .catch((e) => console.error("Failed to load trucks:", e));
  }, []);

  const handleCreateStaff = async () => {
    if (!staffName) { showError("Staff name is required"); return; }
    setStaffCreating(true);
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: staffName,
          phone: staffPhone || undefined,
          email: staffEmail || undefined,
          role: staffRole,
          department: staffDepartment,
          locationType: staffLocationType || undefined,
          locationId: staffLocationId || undefined,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed"); }
      const created = await res.json();
      showSuccess(`Staff "${staffName}" created`);
      setShowStaffForm(false);
      setStaffName(""); setStaffPhone(""); setStaffEmail("");
      setStaffRole("operator"); setStaffDepartment("production");
      setStaffLocationType(""); setStaffLocationId("");
      fetchStaff();
      setStaffId(created._id);
      setName(created.name);
      setEmail(created.email || "");
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "Failed to create staff");
    } finally { setStaffCreating(false); }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name || !name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!email || !email.trim()) {
      setError("Email is required.");
      return;
    }
    if (!role) {
      setError("Select a system role.");
      return;
    }
    if (!staffId) {
      setError("Select a staff member to link this user to.");
      return;
    }
    setNavigateOnClose(false);
    setConfirmOpen(true);
  };

  const doSubmit = async () => {
    setSubmitting(true);
    setError("");

    const body: Record<string, unknown> = { name, email, password: "temporary", role, staffId };
    if (role === "factory-manager") body.factoryId = factoryId;
    if (role === "depot-manager") body.depotId = depotId;
    if (role === "driver") body.truckId = truckId;

    try {
      const res = await fetch("/api/auth/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitting(false);
        throw new Error(data.error || "Failed to create user");
      }

      showSuccess("User created successfully");
      setNavigateOnClose(true);
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "Network error");
      setSubmitting(false);
      throw e;
    }
  };

  const locationOpts = staffLocationType === "factory"
    ? factories : staffLocationType === "depot" ? depots : staffLocationType === "truck" ? trucks : [];

  const fetchLocationData = (type: string) => {
    if (type === "factory" && factories.length === 0) {
      fetch("/api/factories").then(r => { if (!r.ok) throw new Error(`factories ${r.status}`); return r.json(); }).then((data: unknown) => { if (Array.isArray(data)) setFactories((data as { _id: string; name: string }[]).map((f) => ({ value: f._id, label: f.name }))); }).catch((e) => console.error("Failed to load factories:", e));
    }
    if (type === "depot" && depots.length === 0) {
      fetch("/api/depots").then(r => { if (!r.ok) throw new Error(`depots ${r.status}`); return r.json(); }).then((data: unknown) => { if (Array.isArray(data)) setDepots((data as { _id: string; name: string }[]).map((d) => ({ value: d._id, label: d.name }))); }).catch((e) => console.error("Failed to load depots:", e));
    }
    if (type === "truck" && trucks.length === 0) {
      fetch("/api/trucks").then(r => { if (!r.ok) throw new Error(`trucks ${r.status}`); return r.json(); }).then((data: unknown) => { if (Array.isArray(data)) setTrucks((data as { _id: string; plateNumber: string }[]).map((t) => ({ value: t._id, label: t.plateNumber }))); }).catch((e) => console.error("Failed to load trucks:", e));
    }
  };

  const loadLocationOptions = (selectedRole: string) => {
    fetchLocationData(
      selectedRole === "factory-manager" ? "factory" :
      selectedRole === "depot-manager" ? "depot" :
      selectedRole === "driver" ? "truck" : ""
    );
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
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Linked Staff Member <span className="text-red-500">*</span>
          </label>
          <Select options={staffList} placeholder="Select staff member" value={staffId} onChange={(id) => { setStaffId(id); const info = staffInfoMap[id]; if (info) { setName(info.name); setEmail(info.email || ""); } }} />
          <p className="text-xs text-gray-400 mt-1">
            Every user must be linked to an existing staff record.&nbsp;
            <button type="button" onClick={() => setShowStaffForm(true)} className="text-brand-600 hover:underline">
              + Create new staff
            </button>
          </p>
        </div>

        {showStaffForm && (
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700 space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">New Staff Member</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Name *</label>
                <InputField placeholder="Full name" value={staffName} onChange={e => setStaffName(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Phone</label>
                <InputField placeholder="Phone" value={staffPhone} onChange={e => setStaffPhone(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Role</label>
                <Select
                  options={[
                    { value: "manager", label: "Manager" }, { value: "supervisor", label: "Supervisor" },
                    { value: "operator", label: "Operator" }, { value: "driver", label: "Driver" },
                    { value: "loader", label: "Loader" }, { value: "other", label: "Other" },
                  ]}
                  value={staffRole} onChange={setStaffRole}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Department</label>
                <Select
                  options={[
                    { value: "production", label: "Production" }, { value: "logistics", label: "Logistics" },
                    { value: "sales", label: "Sales" }, { value: "administration", label: "Administration" },
                  ]}
                  value={staffDepartment} onChange={setStaffDepartment}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Location Type</label>
                <Select
                  options={[{ value: "factory", label: "Factory" }, { value: "depot", label: "Depot" }, { value: "truck", label: "Truck" }]}
                  placeholder="Select" value={staffLocationType} onChange={v => { setStaffLocationType(v); setStaffLocationId(""); fetchLocationData(v); }}
                />
              </div>
              {staffLocationType && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 capitalize">{staffLocationType}</label>
                  <Select options={locationOpts} placeholder={`Select ${staffLocationType}`} value={staffLocationId} onChange={setStaffLocationId} />
                </div>
              )}
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={handleCreateStaff} disabled={staffCreating}>
                {staffCreating ? "Creating..." : "Save Staff"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowStaffForm(false)}>Cancel</Button>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
          <InputField id="name" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
          <p className="text-xs text-gray-400 mt-1">Auto-filled from staff selection, editable</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
          <InputField id="email" type="email" placeholder="Email address (invite will be sent here)" value={email} onChange={(e) => setEmail(e.target.value)} />
          <p className="text-xs text-gray-400 mt-1">Auto-filled from staff selection, editable</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
          <Select options={roles} placeholder="Select role" value={role} onChange={(val) => { setRole(val); setFactoryId(""); setDepotId(""); setTruckId(""); loadLocationOptions(val); }} />
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

        {role === "driver" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assigned Truck</label>
            <Select options={trucks} placeholder="Select truck" value={truckId} onChange={setTruckId} />
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
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => { setConfirmOpen(false); if (navigateOnClose) router.push("/users"); }}
        onConfirm={doSubmit}
        title="Create User"
        message={
          <>
            You are about to create a new user with access to the system:
            <ul className="mt-2 space-y-1 text-gray-700 dark:text-gray-300">
              <li><strong>Name:</strong> {name}</li>
              <li><strong>Email:</strong> {email}</li>
              <li><strong>Role:</strong> {role ? role.replace("-", " ") : "—"}</li>
              <li><strong>Linked Staff:</strong> {staffId ? staffList.find((s) => s.value === staffId)?.label ?? "—" : "—"}</li>
            </ul>
            <p className="mt-2 text-orange-600 dark:text-orange-400">An invitation email will be sent with a link to set their password.</p>
          </>
        }
        confirmLabel="Create User"
        variant="warning"
        loading={submitting}
      />
    </div>
  );
}
