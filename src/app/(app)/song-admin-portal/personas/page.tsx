"use client";

import React, { useEffect, useMemo, useState } from "react";

type PersonaItem = {
  id: number;
  sunoPersonaId: string;
  name: string;
  description: string;
  createdAt: string;
  audioUrl: string | null;
  linkedTo: { type: "song" | "user_song"; id: number } | null;
};

export default function PersonasPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<PersonaItem[]>([]);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.sunoPersonaId.toLowerCase().includes(q)
    );
  }, [items, query]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/personas", { method: "GET" });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || "Failed to load personas");
        }
        if (!cancelled) {
          setItems(
            (data.personas || []).map((p: any) => ({
              ...p,
              createdAt:
                typeof p.createdAt === "string"
                  ? p.createdAt
                  : new Date(p.createdAt).toISOString(),
            }))
          );
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load personas");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Personas</h1>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search personas..."
          className="border rounded px-3 py-2 w-64"
        />
      </div>

      {loading && <div>Loading...</div>}
      {error && <div className="text-red-600">{error}</div>}

      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="min-w-full border text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="border px-3 py-2 text-left">Persona ID</th>
                <th className="border px-3 py-2 text-left">Name</th>
                <th className="border px-3 py-2 text-left">Description</th>
                <th className="border px-3 py-2 text-left">Linked To</th>
                <th className="border px-3 py-2 text-left">Created</th>
                <th className="border px-3 py-2 text-left">Preview</th>
                <th className="border px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="border px-3 py-2">{p.sunoPersonaId}</td>
                  <td className="border px-3 py-2">{p.name}</td>
                  <td className="border px-3 py-2 max-w-lg truncate">
                    {p.description}
                  </td>
                  <td className="border px-3 py-2">
                    {p.linkedTo ? `${p.linkedTo.type}#${p.linkedTo.id}` : "-"}
                  </td>
                  <td className="border px-3 py-2">
                    {new Date(p.createdAt).toLocaleString()}
                  </td>
                  <td className="border px-3 py-2">
                    {p.audioUrl ? (
                      <audio controls src={p.audioUrl} className="w-64" />
                    ) : (
                      <span className="text-gray-400">No audio</span>
                    )}
                  </td>
                  <td className="border px-3 py-2 space-x-2">
                    {/* Placeholder for future edit (name/description) */}
                    <button
                      className="px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200"
                      onClick={async () => {
                        const name = prompt("Update name", p.name) || p.name;
                        const description =
                          prompt("Update description", p.description) ||
                          p.description;
                        try {
                          const res = await fetch(
                            `/api/admin/personas/${p.id}`,
                            {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ name, description }),
                            }
                          );
                          if (!res.ok) throw new Error("Failed to update");
                          setItems(
                            items.map((i) =>
                              i.id === p.id ? { ...i, name, description } : i
                            )
                          );
                        } catch (e) {
                          alert((e as any)?.message || "Update failed");
                        }
                      }}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-gray-500 py-6">
                    No personas found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

