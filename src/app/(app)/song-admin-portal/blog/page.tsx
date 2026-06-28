"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Edit, Trash2, Eye, X } from "lucide-react";
import { useToastHelpers } from "@/hooks/use-toast";

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  meta_description: string | null;
  content: string;
  published: boolean;
  created_at: string;
  updated_at: string;
}

const defaultPost: Partial<BlogPost> = {
  title: "",
  slug: "",
  meta_description: "",
  content: "",
  published: false,
};

export default function BlogAdminPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<BlogPost>>(defaultPost);
  const [saving, setSaving] = useState(false);
  const [filterPublished, setFilterPublished] = useState<
    "all" | "true" | "false"
  >("all");
  const toast = useToastHelpers();

  useEffect(() => {
    fetchPosts();
  }, [filterPublished]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const q =
        filterPublished !== "all" ? `?published=${filterPublished}` : "";
      const res = await fetch(`/api/admin/blog${q}`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts ?? []);
      } else {
        toast.error("Error", "Failed to load blog posts");
      }
    } catch (e) {
      toast.error("Error", "Failed to load blog posts");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setForm({ ...defaultPost });
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (post: BlogPost) => {
    setForm({
      title: post.title,
      slug: post.slug,
      meta_description: post.meta_description ?? "",
      content: post.content,
      published: post.published,
    });
    setEditingId(post.id);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(defaultPost);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title?.trim() || !form.slug?.trim() || form.content == null) {
      toast.error("Validation", "Title, slug, and content are required");
      return;
    }
    setSaving(true);
    try {
      const slug = String(form.slug).trim().toLowerCase().replace(/\s+/g, "-");
      if (editingId) {
        const res = await fetch(`/api/admin/blog/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.title.trim(),
            slug,
            meta_description: form.meta_description?.trim() || null,
            content: String(form.content),
            published: Boolean(form.published),
          }),
        });
        if (res.ok) {
          toast.success("Updated", "Blog post updated");
          closeForm();
          fetchPosts();
        } else {
          const data = await res.json().catch(() => ({}));
          toast.error("Error", data.error || "Failed to update");
        }
      } else {
        const res = await fetch("/api/admin/blog", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.title.trim(),
            slug,
            meta_description: form.meta_description?.trim() || null,
            content: String(form.content),
            published: Boolean(form.published),
          }),
        });
        if (res.ok) {
          toast.success("Created", "Blog post created");
          closeForm();
          fetchPosts();
        } else {
          const data = await res.json().catch(() => ({}));
          toast.error("Error", data.error || "Failed to create");
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (post: BlogPost) => {
    if (!confirm(`Delete "${post.title}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/blog/${post.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Deleted", "Blog post deleted");
        fetchPosts();
      } else {
        toast.error("Error", "Failed to delete");
      }
    } catch {
      toast.error("Error", "Failed to delete");
    }
  };

  const syncSlug = () => {
    if (form.title && !form.slug) {
      setForm((f) => ({
        ...f,
        slug: String(f.title).trim().toLowerCase().replace(/\s+/g, "-"),
      }));
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Blog Posts</h1>
        <div className="flex items-center gap-2">
          <select
            value={filterPublished}
            onChange={(e) =>
              setFilterPublished(e.target.value as "all" | "true" | "false")
            }
            className="rounded border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="all">All</option>
            <option value="true">Published</option>
            <option value="false">Draft</option>
          </select>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            New Post
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-600">Loading…</p>
      ) : posts.length === 0 ? (
        <p className="text-gray-600">No blog posts yet.</p>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                  Title
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                  Slug
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                  Updated
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {posts.map((post) => (
                <tr key={post.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {post.title}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                    {post.slug}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${
                        post.published
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {post.published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(post.updated_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {post.published && (
                        <a
                          href={`/blog/${post.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-600 hover:text-gray-900"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => openEdit(post)}
                        className="text-gray-600 hover:text-blue-600"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(post)}
                        className="text-gray-600 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">
                {editingId ? "Edit Blog Post" : "New Blog Post"}
              </h2>
              <button
                type="button"
                onClick={closeForm}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <Input
                  value={form.title ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                  onBlur={syncSlug}
                  placeholder="How to Make an AI Song"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL slug *
                </label>
                <Input
                  value={form.slug ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, slug: e.target.value }))
                  }
                  placeholder="how-to-make-an-ai-song"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use lowercase, hyphens only. Used in /blog/[slug]
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meta description (SEO)
                </label>
                <Input
                  value={form.meta_description ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, meta_description: e.target.value }))
                  }
                  placeholder="150–160 characters for search results"
                  maxLength={170}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Content (HTML) *
                </label>
                <p className="text-xs text-gray-500 mb-1">
                  Use &lt;h1&gt;, &lt;h2&gt;, &lt;h3&gt;, &lt;p&gt;, &lt;ul&gt;,
                  &lt;li&gt; for structure.
                </p>
                <textarea
                  value={form.content ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, content: e.target.value }))
                  }
                  className="w-full min-h-[280px] rounded border border-gray-300 px-3 py-2 text-sm font-mono"
                  placeholder="<h1>Title</h1><h2>Section</h2><p>Paragraph...</p>"
                  required
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="published"
                  checked={Boolean(form.published)}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, published: e.target.checked }))
                  }
                  className="rounded border-gray-300"
                />
                <label htmlFor="published" className="text-sm text-gray-700">
                  Published (visible on /blog)
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={closeForm}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : editingId ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
