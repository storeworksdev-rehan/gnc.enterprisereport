"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  Search,
  RefreshCw,
  Loader2,
  Save,
  X,
  KeyRound,
  Eye,
  EyeOff,
  ShieldCheck,
  MapPin,
  ChevronDown,
} from "lucide-react";
import { API_BASE_API as API_BASE } from "@/lib/config";

// ── Types ────────────────────────────────────────────────────────────────────
interface Role {
  RoleId: number;
  RoleName: string;
}

interface Region {
  Id: number;
  Name: string;
}

interface User {
  UserId: number;
  Username: string;
  RoleId: number;
  RoleName: string;
  Password: string;
  SessionToken: string;
  PagePermissions: string;
  Features: string;
  RegionIds: string;
}

type FormUser = Omit<User, "UserId"> & { UserId?: number };
type Panel = "edit" | "password" | null;

const emptyForm = (): FormUser => ({
  Username: "",
  RoleId: 0,
  RoleName: "",
  Password: "",
  SessionToken: "",
  PagePermissions: "",
  Features: "",
  RegionIds: "",
});

// ── Main Page ────────────────────────────────────────────────────────────────
export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [regionsDropdownOpen, setRegionsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [confirmUser, setConfirmUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [panel, setPanel] = useState<Panel>(null);
  const [selected, setSelected] = useState<User | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState<FormUser>(emptyForm());

  // password change state
  const [newPassword, setNewPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, rolesRes, regionsRes] = await Promise.all([
        axios.get<User[]>(`${API_BASE}/api/auth/get-users`),
        axios.get<Role[]>(`${API_BASE}/api/auth/get-roles`),
        axios.get<Region[]>(`${API_BASE}/api/ITCentralServer/get-regions`),
      ]);
      setUsers(usersRes.data);
      setRoles(rolesRes.data);
      setRegions(regionsRes.data);
    } catch {
      setError("Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleNew() {
    setSelected(null);
    setIsNew(true);
    setForm(emptyForm());
    setPanel("edit");
  }

  function handleEdit(user: User) {
    setSelected(user);
    setIsNew(false);
    setForm({ ...user });
    setPanel("edit");
  }

  function handlePasswordPanel(user: User) {
    setSelected(user);
    setNewPassword("");
    setShowPw(false);
    setPanel("password");
  }

  function handleCancel() {
    setSelected(null);
    setIsNew(false);
    setForm(emptyForm());
    setPanel(null);
    setError(null);
    setRegionsDropdownOpen(false);
  }

  function handleRoleChange(roleId: number) {
    const role = roles.find((r) => r.RoleId === roleId);
    setForm((f) => ({
      ...f,
      RoleId: roleId,
      RoleName: role?.RoleName ?? "",
    }));
  }

  async function handleSave() {
    if (!form.Username.trim() || !form.RoleId) return;
    setSaving(true);
    setError(null);
    try {
      if (isNew) {
        await axios.post(`${API_BASE}/api/auth/create-user`, form);
      } else {
        await axios.post(`${API_BASE}/api/auth/update-user`, form);
      }
      await fetchData();
      handleCancel();
    } catch {
      setError("Failed to save user.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(userId: number) {
    setDeleting(userId);
    try {
      await axios.delete(`${API_BASE}/api/auth/delete-user/${userId}`);
      if (selected?.UserId === userId) handleCancel();
      await fetchData();
    } catch {
      setError("Failed to delete user.");
    } finally {
      setDeleting(null);
    }
  }

  async function handleChangePassword() {
    if (!newPassword.trim() || !selected) return;
    setChangingPw(true);
    setError(null);
    try {
      await axios.post(`${API_BASE}/api/auth/change-password`, {
        UserId: selected.UserId,
        PasswordHash: newPassword,
      });
      handleCancel();
    } catch {
      setError("Failed to change password.");
    } finally {
      setChangingPw(false);
    }
  }

  // ── Filtered ──────────────────────────────────────────────────────────────
  const filtered = users.filter(
    (u) =>
      u.Username.toLowerCase().includes(search.toLowerCase()) ||
      u.RoleName.toLowerCase().includes(search.toLowerCase()),
  );

  const roleColor = (roleName: string) => {
    const map: Record<string, string> = {
      Admin: "bg-red-100 text-red-700",
      Manager: "bg-blue-100 text-blue-700",
      Staff: "bg-green-100 text-green-700",
    };
    return map[roleName] ?? "bg-slate-100 text-slate-600";
  };

  return (
    <>
      <div className="flex h-full gap-6">
        {/* ── Left panel: Users list ───────────────────────────────────────── */}
        <div className="flex w-[2/3] shrink-0 flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-[#e31837]" />
              <h2 className="text-sm font-semibold text-slate-800">Users</h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                {users.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchData}
                className="btn-icon btn-icon-refresh"
                title="Refresh"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handleNew}
                className="btn btn-primary"
                style={{ fontSize: "0.75rem", padding: "0.375rem 0.75rem" }}
              >
                <Plus className="h-3.5 w-3.5" />
                New User
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="border-b border-slate-100 px-4 py-2">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5">
              <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users or roles…"
                className="flex-1 bg-transparent text-xs text-slate-700 placeholder-slate-400 outline-none"
              />
            </div>
          </div>

          {/* Error */}
          {error && !panel && (
            <p className="border-b border-red-100 bg-red-50 px-4 py-2 text-xs font-medium text-red-600">
              {error}
            </p>
          )}

          {/* Table */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="py-12 text-center text-sm text-slate-400">
                No users found.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left">
                    <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                      User
                    </th>
                    <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                      Role
                    </th>
                    <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((user) => {
                    const active = selected?.UserId === user.UserId;
                    return (
                      <tr
                        key={user.UserId}
                        className={`transition-colors hover:bg-slate-50 ${active ? "bg-red-50" : ""}`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${active ? "btn-primary" : "bg-slate-100 text-slate-500"}`}
                            >
                              {user.Username.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p
                                className={`font-medium leading-none ${active ? "text-[#e31837]" : "text-slate-700"}`}
                              >
                                {user.Username}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${roleColor(user.RoleName)}`}
                          >
                            {user.RoleName}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handlePasswordPanel(user)}
                              title="Change Password"
                              className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"
                            >
                              <KeyRound className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleEdit(user)}
                              title="Edit"
                              className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setConfirmUser(user)}
                              title="Delete"
                              className="flex h-7 w-7 items-center justify-center rounded-md bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                            >
                              {deleting === user.UserId ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ── Right panel ──────────────────────────────────────────────────── */}
        {panel === "edit" && (
          <div className="flex flex-1 flex-col rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">
                  {isNew ? "New User" : `Edit — ${selected?.Username}`}
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  {isNew
                    ? "Create a new user and assign a role."
                    : "Update user details and role assignment."}
                </p>
              </div>
              <button
                onClick={handleCancel}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Username */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Username
                </label>
                <input
                  value={form.Username}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, Username: e.target.value }))
                  }
                  placeholder="e.g. john.doe"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#e31837] focus:ring-2 focus:ring-[#e31837]/10 transition"
                />
              </div>

              {/* Password (create only) */}
              {isNew && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPw ? "text" : "password"}
                      value={form.Password}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, Password: e.target.value }))
                      }
                      placeholder="Set initial password"
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 pr-10 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#e31837] focus:ring-2 focus:ring-[#e31837]/10 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPw ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Role */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Role
                </label>
                <div className="relative">
                  <ShieldCheck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <select
                    value={form.RoleId}
                    onChange={(e) => handleRoleChange(Number(e.target.value))}
                    className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm text-slate-800 outline-none focus:border-[#e31837] focus:ring-2 focus:ring-[#e31837]/10 transition"
                  >
                    <option value={0} disabled>
                      Select a role…
                    </option>
                    {roles.map((r) => (
                      <option key={r.RoleId} value={r.RoleId}>
                        {r.RoleName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Regions */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Regions
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setRegionsDropdownOpen((v) => !v)}
                    className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-[#e31837] focus:ring-2 focus:ring-[#e31837]/10 transition"
                  >
                    <div className="flex min-w-0 items-center gap-1.5">
                      <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="truncate text-slate-700">
                        {form.RegionIds
                          ? regions
                              .filter((r) =>
                                form.RegionIds.split(",")
                                  .map(Number)
                                  .includes(r.Id),
                              )
                              .map((r) => r.Name)
                              .join(", ") || "Select regions…"
                          : "Select regions…"}
                      </span>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${regionsDropdownOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {regionsDropdownOpen && (
                    <div className="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg">
                      <ul className="max-h-48 overflow-y-auto py-1">
                        {regions.map((r) => {
                          const selected = form.RegionIds
                            ? form.RegionIds.split(",")
                                .map(Number)
                                .includes(r.Id)
                            : false;
                          return (
                            <li key={r.Id}>
                              <label className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  onChange={() => {
                                    const current = form.RegionIds
                                      ? form.RegionIds.split(",")
                                          .map(Number)
                                          .filter(Boolean)
                                      : [];
                                    const next = selected
                                      ? current.filter((id) => id !== r.Id)
                                      : [...current, r.Id];
                                    setForm((f) => ({
                                      ...f,
                                      RegionIds: next.join(","),
                                    }));
                                  }}
                                  className="h-3.5 w-3.5 rounded border-slate-300 accent-[#e31837]"
                                />
                                {r.Name}
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4">
              {error ? (
                <p className="text-xs font-medium text-red-600">{error}</p>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-3">
                <button onClick={handleCancel} className="btn btn-secondary">
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!saving && form.Username.trim() && form.RoleId)
                      handleSave();
                  }}
                  className={`btn btn-primary ${saving || !form.Username.trim() || !form.RoleId ? "disabled" : ""}`}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {isNew ? "Create User" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Password panel ───────────────────────────────────────────────── */}
        {panel === "password" && (
          <div className="flex flex-1 flex-col rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">
                  Change Password
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  Set a new password for{" "}
                  <span className="font-medium text-slate-600">
                    {selected?.Username}
                  </span>
                </p>
              </div>
              <button
                onClick={handleCancel}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 px-6 py-5">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 pr-10 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#e31837] focus:ring-2 focus:ring-[#e31837]/10 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPw ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4">
              {error ? (
                <p className="text-xs font-medium text-red-600">{error}</p>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-3">
                <button onClick={handleCancel} className="btn btn-secondary">
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!changingPw && newPassword.trim())
                      handleChangePassword();
                  }}
                  className={`btn btn-warning ${changingPw || !newPassword.trim() ? "disabled" : ""}`}
                >
                  {changingPw ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <KeyRound className="h-4 w-4" />
                  )}
                  Update Password
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Delete confirm modal ──────────────────────────────────────────── */}
      {confirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start gap-4 p-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-800">
                  Delete User
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Are you sure you want to delete{" "}
                  <span className="font-semibold text-slate-700">
                    {confirmUser.Username}
                  </span>
                  ? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4 rounded-b-xl">
              <button
                onClick={() => setConfirmUser(null)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleDelete(confirmUser.UserId);
                  setConfirmUser(null);
                }}
                className="btn btn-primary"
                style={{ backgroundColor: "#ef4444" }}
              >
                {deleting === confirmUser.UserId ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
