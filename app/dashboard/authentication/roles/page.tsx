"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Plus,
  Pencil,
  Shield,
  Loader2,
  Save,
  X,
  RefreshCw,
  Search,
} from "lucide-react";
import { API_BASE_API as API_BASE } from "@/lib/config";

// ── Types ────────────────────────────────────────────────────────────────────
interface PageItem {
  Id: number;
  Text: string;
  Permission: string;
  IsSelected: boolean;
}

interface FeatureProperty {
  Id: number;
  Text: string;
  IsSelected: boolean;
}

interface Feature {
  Name: string;
  Properties: FeatureProperty[];
}

interface Role {
  RoleId: number;
  RoleName: string;
  Pages: PageItem[];
  Features: Feature[];
}

type FormRole = Omit<Role, "RoleId"> & { RoleId?: number };

function pageLabel(permission: string): string {
  const last = permission.split(".").pop() ?? permission;
  return last.charAt(0).toUpperCase() + last.slice(1);
}

const emptyForm = (): FormRole => ({
  RoleName: "",
  Pages: [],
  Features: [],
});

// ── Sub-components ───────────────────────────────────────────────────────────

// ── Main Page ────────────────────────────────────────────────────────────────
// ── Master list helpers ───────────────────────────────────────────────────────
function buildMasterPages(roles: Role[]): PageItem[] {
  const seen = new Set<number>();
  const pages: PageItem[] = [];
  for (const role of roles) {
    for (const page of role.Pages) {
      if (!seen.has(page.Id)) {
        seen.add(page.Id);
        pages.push({ ...page, IsSelected: false });
      }
    }
  }
  return pages;
}

function buildMasterFeatures(roles: Role[]): Feature[] {
  const seen = new Map<string, Feature>();
  for (const role of roles) {
    for (const feature of role.Features) {
      if (!seen.has(feature.Name)) {
        seen.set(feature.Name, {
          Name: feature.Name,
          Properties: feature.Properties.map((p) => ({
            ...p,
            IsSelected: false,
          })),
        });
      } else {
        // union any properties not yet seen
        const master = seen.get(feature.Name)!;
        const knownIds = new Set(master.Properties.map((p) => p.Id));
        feature.Properties.forEach((p) => {
          if (!knownIds.has(p.Id))
            master.Properties.push({ ...p, IsSelected: false });
        });
      }
    }
  }
  return [...seen.values()];
}

function applyRoleToMasterPages(master: PageItem[], role: Role): PageItem[] {
  const selected = new Map(role.Pages.map((p) => [p.Id, p.IsSelected]));
  return master.map((p) => ({ ...p, IsSelected: selected.get(p.Id) ?? false }));
}

function applyRoleToMasterFeatures(master: Feature[], role: Role): Feature[] {
  const roleMap = new Map(role.Features.map((f) => [f.Name, f]));
  return master.map((f) => {
    const rf = roleMap.get(f.Name);
    if (!rf)
      return {
        ...f,
        Properties: f.Properties.map((p) => ({ ...p, IsSelected: false })),
      };
    const propMap = new Map(rf.Properties.map((p) => [p.Id, p.IsSelected]));
    return {
      ...f,
      Properties: f.Properties.map((p) => ({
        ...p,
        IsSelected: propMap.get(p.Id) ?? false,
      })),
    };
  });
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [masterPages, setMasterPages] = useState<PageItem[]>([]);
  const [masterFeatures, setMasterFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState<FormRole>(emptyForm());
  const [openFeatures, setOpenFeatures] = useState<Record<string, boolean>>({});

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchRoles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get<Role[]>(
        `${API_BASE}/api/auth/get-roles`,
      );
      setRoles(data);
      setMasterPages(buildMasterPages(data));
      setMasterFeatures(buildMasterFeatures(data));
    } catch {
      setError("Failed to load roles.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  // ── Select role to edit ───────────────────────────────────────────────────
  function handleSelectRole(role: Role) {
    setSelectedRole(role);
    setIsNew(false);
    setForm({
      ...role,
      Pages: applyRoleToMasterPages(masterPages, role),
      Features: applyRoleToMasterFeatures(masterFeatures, role),
    });
    setOpenFeatures({});
  }

  // ── New role ──────────────────────────────────────────────────────────────
  function handleNew() {
    setSelectedRole(null);
    setIsNew(true);
    setForm({
      RoleId: undefined,
      RoleName: "",
      Pages: masterPages.map((p) => ({ ...p, IsSelected: false })),
      Features: masterFeatures.map((f) => ({
        ...f,
        Properties: f.Properties.map((p) => ({ ...p, IsSelected: false })),
      })),
    });
    setOpenFeatures({});
  }

  function handleCancel() {
    setSelectedRole(null);
    setIsNew(false);
    setForm(emptyForm());
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!form.RoleName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      if (isNew) {
        await axios.post(`${API_BASE}/api/auth/create-role`, form);
      } else {
        await axios.post(`${API_BASE}/api/auth/update-role`, form);
      }
      await fetchRoles();
      handleCancel();
    } catch {
      setError("Failed to save role.");
    } finally {
      setSaving(false);
    }
  }

  // ── Form helpers ──────────────────────────────────────────────────────────
  function togglePage(idx: number) {
    setForm((f) => ({
      ...f,
      Pages: f.Pages.map((p, i) =>
        i === idx ? { ...p, IsSelected: !p.IsSelected } : p,
      ),
    }));
  }

  function updateFeature(idx: number, updated: Feature) {
    setForm((f) => ({
      ...f,
      Features: f.Features.map((ft, i) => (i === idx ? updated : ft)),
    }));
  }

  // ── Filtered roles ────────────────────────────────────────────────────────
  const filtered = roles.filter((r) =>
    r.RoleName.toLowerCase().includes(search.toLowerCase()),
  );

  const showForm = isNew || selectedRole !== null;

  return (
    <div className="flex h-full gap-6">
      {/* ── Left panel: Roles list ───────────────────────────────────────── */}
      <div
        className={`flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm transition-all ${showForm ? "w-72 shrink-0" : "flex-1"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#e31837]" />
            <h2 className="text-sm font-semibold text-slate-800">Roles</h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
              {roles.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchRoles}
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
              New Role
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
              placeholder="Search roles…"
              className="flex-1 bg-transparent text-xs text-slate-700 placeholder-slate-400 outline-none"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-400">
              No roles found.
            </p>
          ) : (
            <ul className="divide-y divide-slate-50">
              {filtered.map((role) => {
                const active = selectedRole?.RoleId === role.RoleId;
                return (
                  <li key={role.RoleId}>
                    <button
                      onClick={() => handleSelectRole(role)}
                      className={`flex w-full items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-slate-50 ${
                        active ? "bg-red-50 border-l-2 border-[#e31837]" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${
                            active
                              ? "btn-primary"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {role.RoleName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p
                            className={`text-sm font-medium ${active ? "text-[#e31837]" : "text-slate-700"}`}
                          >
                            {role.RoleName}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {role.Pages.filter((p) => p.IsSelected).length}{" "}
                            pages · {role.Features.length} features
                          </p>
                        </div>
                      </div>
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors ${active ? "btn-icon-edit" : "bg-slate-100 text-slate-500"}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* ── Right panel: Form ────────────────────────────────────────────── */}
      {showForm && (
        <div className="flex flex-1 flex-col rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* Form header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">
                {isNew ? "New Role" : `Edit — ${selectedRole?.RoleName}`}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {isNew
                  ? "Configure pages and features for this role."
                  : "Update permissions and feature access."}
              </p>
            </div>
            <button
              onClick={handleCancel}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Form body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-7">
            {/* Role Name */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Role Name
              </label>
              <input
                value={form.RoleName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, RoleName: e.target.value }))
                }
                placeholder="e.g. Store Manager"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#e31837] focus:ring-2 focus:ring-[#e31837]/10 transition"
              />
            </div>

            {/* Pages */}
            {form.Pages.length > 0 && (
              <div>
                <label className="mb-3 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Page Access
                </label>
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="grid grid-cols-[auto_1fr_auto] items-center gap-0 divide-y divide-slate-100">
                    {/* Column headers */}
                    <div className="col-span-6 grid grid-cols-[auto_1fr_auto] bg-slate-50 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                      <span className="w-8" />
                      <span>Page</span>
                      <span className="w-28 text-right">Permission</span>
                    </div>
                    {form.Pages.map((page, idx) => (
                      <div
                        key={page.Id}
                        className="col-span-6 grid grid-cols-[auto_1fr_auto] items-center gap-3 bg-white px-4 py-3 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-3 justify-between">
                          <div>
                            <input
                              type="checkbox"
                              checked={page.IsSelected}
                              onChange={() => togglePage(idx)}
                              className="h-4 w-4 rounded border-slate-300 accent-[#e31837]"
                            />
                          </div>
                          <div>
                            <div className="flex flex-col gap-0.5">
                              <span
                                className={`text-sm ${page.IsSelected ? "text-slate-800 font-medium" : "text-slate-400"}`}
                              >
                                {pageLabel(page.Permission)}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                ({page.Permission})
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Features */}
            {form.Features.length > 0 && (
              <div>
                <label className="mb-3 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Feature Access
                </label>
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="divide-y divide-slate-100">
                    {/* Column header */}
                    <div className="grid grid-cols-[auto_1fr] bg-slate-50 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                      <span className="w-8" />
                      <span>Feature / Property</span>
                    </div>

                    {form.Features.map((feature, fIdx) => (
                      <div key={feature.Name}>
                        {/* Feature group header */}
                        <div className="grid grid-cols-[12] items-center gap-3 bg-slate-50/60 px-4 py-2"></div>

                        {/* Properties */}
                        {feature.Properties.map((prop, pIdx) => (
                          <div
                            key={prop.Id}
                            className="grid grid-cols-[1] items-center gap-3 bg-white px-4 py-3 hover:bg-slate-50 transition-colors"
                          >
                            <div className="flex items-center gap-3 justify-between">
                              <div>
                                <input
                                  type="checkbox"
                                  checked={prop.IsSelected}
                                  onChange={() => {
                                    const updated = {
                                      ...feature,
                                      Properties: feature.Properties.map(
                                        (p, i) =>
                                          i === pIdx
                                            ? {
                                                ...p,
                                                IsSelected: !p.IsSelected,
                                              }
                                            : p,
                                      ),
                                    };
                                    updateFeature(fIdx, updated);
                                  }}
                                  className="h-4 w-4 rounded border-slate-300 accent-[#e31837]"
                                />
                              </div>
                              <div>
                                <span
                                  className={`text-sm ${prop.IsSelected ? "text-slate-800 font-medium" : "text-slate-400"}`}
                                >
                                  {prop.Text}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {form.Pages.length === 0 && form.Features.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-12 text-center">
                <Shield className="mb-3 h-8 w-8 text-slate-200" />
                <p className="text-sm font-medium text-slate-400">
                  No pages or features configured
                </p>
                <p className="text-xs text-slate-300 mt-1">
                  Pages and features will appear once roles are loaded.
                </p>
              </div>
            )}
          </div>

          {/* Form footer */}
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4">
            {error && (
              <p className="text-xs font-medium text-red-600">{error}</p>
            )}
            {!error && <span />}
            <div className="flex items-center gap-3">
              <button onClick={handleCancel} className="btn btn-secondary">
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!saving && form.RoleName.trim()) handleSave();
                }}
                className={`btn btn-primary ${saving || !form.RoleName.trim() ? "disabled" : ""}`}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {isNew ? "Create Role" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
