"use client";

import { useEffect, useState } from "react";
import { Pencil, Trash2, Check, X, Plus } from "lucide-react";

interface Category {
  id: number;
  name: string;
  slug: string;
  sequence: number;
  template_count: number;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New category form
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newSequence, setNewSequence] = useState(0);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Inline edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editSequence, setEditSequence] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Delete confirm
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/categories");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setCategories(data.categories ?? []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, slug: newSlug, sequence: newSequence }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create");
      setNewName("");
      setNewSlug("");
      setNewSequence(0);
      await fetchCategories();
    } catch (e: any) {
      setCreateError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditSlug(cat.slug);
    setEditSequence(cat.sequence);
    setSaveError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setSaveError(null);
  };

  const handleSave = async (id: number) => {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, slug: editSlug, sequence: editSequence }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setEditingId(null);
      await fetchCategories();
    } catch (e: any) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      setDeletingId(null);
      await fetchCategories();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <h1 className="text-xl font-semibold">Template Categories</h1>

      {/* Create form */}
      <form
        onSubmit={handleCreate}
        className="bg-white rounded-lg border p-4 space-y-3"
      >
        <h2 className="font-medium text-sm text-gray-700">New Category</h2>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs text-gray-500 mb-1">Name</label>
            <input
              required
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                setNewSlug(slugify(e.target.value));
              }}
              placeholder="e.g. Birthday"
              className="border rounded px-3 py-2 text-sm w-full"
            />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs text-gray-500 mb-1">Slug</label>
            <input
              required
              value={newSlug}
              onChange={(e) => setNewSlug(slugify(e.target.value))}
              placeholder="e.g. birthday"
              className="border rounded px-3 py-2 text-sm w-full font-mono"
            />
          </div>
          <div className="w-24">
            <label className="block text-xs text-gray-500 mb-1">Sequence</label>
            <input
              type="number"
              value={newSequence}
              onChange={(e) => setNewSequence(parseInt(e.target.value, 10) || 0)}
              className="border rounded px-3 py-2 text-sm w-full"
            />
          </div>
          <button
            type="submit"
            disabled={creating}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-60"
          >
            <Plus className="w-4 h-4" />
            {creating ? "Creating…" : "Add"}
          </button>
        </div>
        {createError && <p className="text-red-600 text-sm">{createError}</p>}
      </form>

      {/* Table */}
      {loading && <p className="text-gray-500">Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Slug</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 w-24">Seq</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 w-28">Templates</th>
                <th className="px-4 py-3 w-32" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {categories.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                    No categories yet. Add one above.
                  </td>
                </tr>
              )}
              {categories.map((cat) =>
                editingId === cat.id ? (
                  <tr key={cat.id} className="bg-blue-50">
                    <td className="px-4 py-2">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="border rounded px-2 py-1 text-sm w-full"
                        autoFocus
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        value={editSlug}
                        onChange={(e) => setEditSlug(slugify(e.target.value))}
                        className="border rounded px-2 py-1 text-sm w-full font-mono"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={editSequence}
                        onChange={(e) => setEditSequence(parseInt(e.target.value, 10) || 0)}
                        className="border rounded px-2 py-1 text-sm w-full"
                      />
                    </td>
                    <td className="px-4 py-2 text-gray-500">{cat.template_count}</td>
                    <td className="px-4 py-2">
                      {saveError && <p className="text-red-600 text-xs mb-1">{saveError}</p>}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSave(cat.id)}
                          disabled={saving}
                          className="text-green-600 hover:text-green-800 disabled:opacity-50"
                          title="Save"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="text-gray-400 hover:text-gray-600"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={cat.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{cat.name}</td>
                    <td className="px-4 py-3 font-mono text-gray-500">{cat.slug}</td>
                    <td className="px-4 py-3 text-gray-500">{cat.sequence}</td>
                    <td className="px-4 py-3 text-gray-500">{cat.template_count}</td>
                    <td className="px-4 py-3">
                      {deletingId === cat.id ? (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-gray-600">Delete?</span>
                          <button
                            onClick={() => handleDelete(cat.id)}
                            className="text-red-600 hover:text-red-800 font-medium"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setDeletingId(null)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => startEdit(cat)}
                            className="text-gray-400 hover:text-blue-600"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingId(cat.id)}
                            className="text-gray-400 hover:text-red-600"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
