"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Plus,
  ChevronDown,
  Loader2,
  Save,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  X,
  MapPin,
} from "lucide-react";
import { API_BASE, API_BASE_API } from "@/lib/config";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Region {
  Id: number;
  Name: string;
  AllStoresFlag: boolean;
  ReadOnlyFlag: boolean;
}

interface Location {
  Id: number;
  Name: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function authHeaders() {
  return {
    Authorization: `Bearer ${localStorage.getItem("enterprise_auth_token") ?? ""}`,
  };
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function RegionsPage() {
  // ── Data state ────────────────────────────────────────────────────────────
  const [regions, setRegions] = useState<Region[]>([]);
  const [allLocations, setAllLocations] = useState<Location[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);

  // ── Dual-listbox state ────────────────────────────────────────────────────
  const [assigned, setAssigned] = useState<Location[]>([]); // right box
  const [available, setAvailable] = useState<Location[]>([]); // left box
  const [leftChecked, setLeftChecked] = useState<Set<number>>(new Set());
  const [rightChecked, setRightChecked] = useState<Set<number>>(new Set());

  // ── UI state ──────────────────────────────────────────────────────────────
  const [loadingRegions, setLoadingRegions] = useState(true);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ── Add-region modal state ────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [newRegionName, setNewRegionName] = useState("");
  const [creatingRegion, setCreatingRegion] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // ── Region dropdown state ─────────────────────────────────────────────────
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // ── Fetch regions ─────────────────────────────────────────────────────────
  const fetchRegions = useCallback(async () => {
    setLoadingRegions(true);
    setError(null);
    try {
      const { data } = await axios.get<Region[]>(
        `${API_BASE_API}/api/ITCentralServer/get-regions`,
        { headers: authHeaders() },
      );
      setRegions(data);
    } catch {
      setError("Failed to load regions.");
    } finally {
      setLoadingRegions(false);
    }
  }, []);

  // ── Fetch all locations (stores) once ─────────────────────────────────────
  const fetchAllLocations = useCallback(async () => {
    try {
      const { data } = await axios.post<Location[]>(
        `${API_BASE_API}/ITDashboard/GetStores`,
        { DivisionId: 0 },
        { headers: authHeaders() },
      );
      setAllLocations(
        (Array.isArray(data) ? data : []).filter((l) => l.Id !== -1),
      );
    } catch {
      // non-fatal — lists will just be empty
    }
  }, []);

  useEffect(() => {
    fetchRegions();
    fetchAllLocations();
  }, [fetchRegions, fetchAllLocations]);

  // ── When a region is selected, load its assigned locations ────────────────
  const loadRegionLocations = useCallback(
    async (region: Region) => {
      setLoadingLocations(true);
      setLeftChecked(new Set());
      setRightChecked(new Set());
      setSaveSuccess(false);
      setError(null);
      try {
        const { data } = await axios.get<{ LocationId: number }[]>(
          `${API_BASE_API}/api/ITCentralServer/get-region-locations`,
          {
            params: { regionId: region.Id },
            headers: authHeaders(),
          },
        );
        const assignedIds = new Set((data ?? []).map((r) => r.LocationId));
        const assignedLocs = allLocations.filter((l) => assignedIds.has(l.Id));
        const availableLocs = allLocations.filter(
          (l) => !assignedIds.has(l.Id),
        );
        setAssigned(assignedLocs);
        setAvailable(availableLocs);
      } catch {
        setError("Failed to load region locations.");
        setAssigned([]);
        setAvailable([...allLocations]);
      } finally {
        setLoadingLocations(false);
      }
    },
    [allLocations],
  );

  const handleSelectRegion = (region: Region) => {
    setSelectedRegion(region);
    setDropdownOpen(false);
    loadRegionLocations(region);
  };

  // ── Dual-listbox actions ──────────────────────────────────────────────────

  const moveToRight = () => {
    if (leftChecked.size === 0) return;
    const moving = available.filter((l) => leftChecked.has(l.Id));
    setAssigned((prev) =>
      [...prev, ...moving].sort((a, b) => a.Name.localeCompare(b.Name)),
    );
    setAvailable((prev) => prev.filter((l) => !leftChecked.has(l.Id)));
    setLeftChecked(new Set());
  };

  const moveToLeft = () => {
    if (rightChecked.size === 0) return;
    const moving = assigned.filter((l) => rightChecked.has(l.Id));
    setAvailable((prev) =>
      [...prev, ...moving].sort((a, b) => a.Name.localeCompare(b.Name)),
    );
    setAssigned((prev) => prev.filter((l) => !rightChecked.has(l.Id)));
    setRightChecked(new Set());
  };

  const toggleLeft = (id: number) => {
    setLeftChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleRight = (id: number) => {
    setRightChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const allLeftSelected = available.length > 0 && available.every((l) => leftChecked.has(l.Id));
  const allRightSelected = assigned.length > 0 && assigned.every((l) => rightChecked.has(l.Id));

  const toggleAllLeft = () => {
    if (allLeftSelected) {
      setLeftChecked(new Set());
    } else {
      setLeftChecked(new Set(available.map((l) => l.Id)));
    }
  };

  const toggleAllRight = () => {
    if (allRightSelected) {
      setRightChecked(new Set());
    } else {
      setRightChecked(new Set(assigned.map((l) => l.Id)));
    }
  };

  // ── Reset to last saved state ─────────────────────────────────────────────
  const handleReset = () => {
    if (!selectedRegion) return;
    loadRegionLocations(selectedRegion);
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!selectedRegion) return;
    setSaving(true);
    setError(null);
    setSaveSuccess(false);
    try {
      await axios.post(
        `${API_BASE_API}/api/ITCentralServer/save-region-locations`,
        {
          RegionId: selectedRegion.Id,
          LocationIds: assigned.map((l) => l.Id),
        },
        { headers: authHeaders() },
      );
      setSaveSuccess(true);
    } catch {
      setError("Failed to save region locations.");
    } finally {
      setSaving(false);
    }
  };

  // ── Create new region ─────────────────────────────────────────────────────
  const handleCreateRegion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRegionName.trim()) return;
    setCreatingRegion(true);
    setCreateError(null);
    try {
      await axios.post(
        `${API_BASE_API}/api/ITCentralServer/create-region`,
        { Name: newRegionName.trim() },
        { headers: authHeaders() },
      );
      setNewRegionName("");
      setModalOpen(false);
      await fetchRegions();
    } catch {
      setCreateError("Failed to create region. Please try again.");
    } finally {
      setCreatingRegion(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="space-y-5">
        {/* ── Top bar: Region selector + Add New ── */}
        <div className="flex items-center gap-3">
          {/* Region dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen((v) => !v)}
              className="flex h-9 min-w-56 items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
            >
              <span
                className={
                  selectedRegion
                    ? "text-slate-900 font-medium"
                    : "text-slate-400"
                }
              >
                {loadingRegions
                  ? "Loading…"
                  : selectedRegion
                    ? selectedRegion.Name
                    : "Select a Region"}
              </span>
              {loadingRegions ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
              ) : (
                <ChevronDown
                  className={`h-3.5 w-3.5 text-slate-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                />
              )}
            </button>

            {dropdownOpen && regions.length > 0 && (
              <div className="absolute z-50 mt-1 w-full min-w-56 rounded-xl border border-slate-200 bg-white shadow-lg">
                <ul className="max-h-60 overflow-y-auto py-1">
                  {regions.map((r) => (
                    <li key={r.Id}>
                      <button
                        type="button"
                        onClick={() => handleSelectRegion(r)}
                        className={`w-full px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${
                          selectedRegion?.Id === r.Id
                            ? "font-semibold text-[#E60D2E]"
                            : "text-slate-700"
                        }`}
                      >
                        {r.Name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Add New button */}
          <button
            type="button"
            onClick={() => {
              setModalOpen(true);
              setCreateError(null);
              setNewRegionName("");
            }}
            className="flex h-9 items-center gap-2 rounded-lg bg-[#E60D2E] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#c40a27] transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add New
          </button>
        </div>

        {/* ── Error / success banner ── */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {saveSuccess && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Region locations saved successfully.
          </div>
        )}

        {/* ── Dual Listbox ── */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
            <MapPin className="h-4 w-4 text-[#E60D2E]" />
            <h2 className="text-sm font-semibold text-slate-800">
              Location Assignment
            </h2>
            {selectedRegion && (
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                {selectedRegion.Name}
              </span>
            )}
          </div>

          <div className="p-5">
            {!selectedRegion ? (
              <div className="flex items-center justify-center py-20 text-sm text-slate-400">
                Select a region above to manage its locations.
              </div>
            ) : loadingLocations ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
              </div>
            ) : (
              <>
                <div className="flex items-start gap-4">
                  {/* ── Left box: Available ── */}
                  <div className="flex flex-1 flex-col">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                        Available Locations
                      </span>
                      <span className="text-xs text-slate-400">
                        {available.length} locations
                      </span>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 overflow-hidden">
                      {/* Select all row */}
                      {available.length > 0 && (
                        <label className="flex cursor-pointer items-center gap-2.5 border-b border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                          <input
                            type="checkbox"
                            checked={allLeftSelected}
                            onChange={toggleAllLeft}
                            className="h-3.5 w-3.5 rounded border-slate-300 accent-[#E60D2E]"
                          />
                          Select all
                        </label>
                      )}
                      <ul className="h-80 overflow-y-auto">
                        {available.length === 0 ? (
                          <li className="flex items-center justify-center py-10 text-xs text-slate-400">
                            No available locations
                          </li>
                        ) : (
                          available.map((loc) => (
                            <li key={loc.Id}>
                              <label className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors">
                                <input
                                  type="checkbox"
                                  checked={leftChecked.has(loc.Id)}
                                  onChange={() => toggleLeft(loc.Id)}
                                  className="h-3.5 w-3.5 rounded border-slate-300 accent-[#E60D2E]"
                                />
                                <span className="truncate">{loc.Name}</span>
                              </label>
                            </li>
                          ))
                        )}
                      </ul>
                    </div>
                  </div>

                  {/* ── Transfer buttons ── */}
                  <div className="flex flex-col items-center justify-center gap-2 pt-10 self-center">
                    <button
                      type="button"
                      onClick={moveToRight}
                      disabled={leftChecked.size === 0}
                      title="Move selected to assigned"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:border-[#E60D2E] hover:bg-[#E60D2E] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={moveToLeft}
                      disabled={rightChecked.size === 0}
                      title="Remove selected from assigned"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:border-[#E60D2E] hover:bg-[#E60D2E] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                  </div>

                  {/* ── Right box: Assigned ── */}
                  <div className="flex flex-1 flex-col">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                        Assigned Locations
                      </span>
                      <span className="text-xs text-slate-400">
                        {assigned.length} locations
                      </span>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 overflow-hidden">
                      {/* Select all row */}
                      {assigned.length > 0 && (
                        <label className="flex cursor-pointer items-center gap-2.5 border-b border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                          <input
                            type="checkbox"
                            checked={allRightSelected}
                            onChange={toggleAllRight}
                            className="h-3.5 w-3.5 rounded border-slate-300 accent-[#E60D2E]"
                          />
                          Select all
                        </label>
                      )}
                      <ul className="h-80 overflow-y-auto">
                        {assigned.length === 0 ? (
                          <li className="flex items-center justify-center py-10 text-xs text-slate-400">
                            No locations assigned
                          </li>
                        ) : (
                          assigned.map((loc) => (
                            <li key={loc.Id}>
                              <label className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors">
                                <input
                                  type="checkbox"
                                  checked={rightChecked.has(loc.Id)}
                                  onChange={() => toggleRight(loc.Id)}
                                  className="h-3.5 w-3.5 rounded border-slate-300 accent-[#E60D2E]"
                                />
                                <span className="truncate">{loc.Name}</span>
                              </label>
                            </li>
                          ))
                        )}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* ── Save / Reset ── */}
                <div className="mt-5 flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={saving || loadingLocations}
                    className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || loadingLocations}
                    className="flex h-9 items-center gap-2 rounded-lg bg-[#E60D2E] px-4 text-sm font-semibold text-white hover:bg-[#c40a27] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      <>
                        <Save className="h-3.5 w-3.5" />
                        Save
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Add New Region Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white shadow-xl">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="text-sm font-semibold text-slate-800">
                Add New Region
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal body */}
            <form onSubmit={handleCreateRegion} className="px-5 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Region Name
                </label>
                <input
                  type="text"
                  autoFocus
                  value={newRegionName}
                  onChange={(e) => setNewRegionName(e.target.value)}
                  placeholder="e.g. North East"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm outline-none transition focus:border-[#E60D2E] focus:ring-2 focus:ring-[#E60D2E]/20"
                />
              </div>

              {createError && (
                <p className="text-xs font-medium text-red-600">
                  {createError}
                </p>
              )}

              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newRegionName.trim() || creatingRegion}
                  className="flex h-9 items-center gap-2 rounded-lg bg-[#E60D2E] px-4 text-sm font-semibold text-white hover:bg-[#c40a27] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {creatingRegion ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Creating…
                    </>
                  ) : (
                    "Submit"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
