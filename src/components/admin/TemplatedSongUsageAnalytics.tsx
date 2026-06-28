"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type UsageCategory = { id: number; name: string; slug: string };

type UsageStat = {
  template_id: number;
  title: string;
  slug: string;
  is_active: boolean;
  instance_count: number;
  completed_count: number;
  partner_count: number;
  consumer_count: number;
  last_used_at: string | null;
  categories: UsageCategory[];
};

type UsageSummary = {
  total_instances: number;
  total_completed: number;
  templates_with_usage: number;
  total_templates: number;
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const PAGE_SIZE = 20;

export default function TemplatedSongUsageAnalytics() {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [templates, setTemplates] = useState<UsageStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  // Filters
  const [search, setSearch] = useState("");
  const [categorySlug, setCategorySlug] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">(
    "all",
  );
  const [usedOnly, setUsedOnly] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/templated-songs/usage-stats", {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load usage stats");
      setSummary(data.summary ?? null);
      setTemplates(data.templates ?? []);
      setLoaded(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load usage stats");
    } finally {
      setLoading(false);
    }
  }, []);

  const toggle = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      // Lazy-load the (potentially expensive) stats only on first expand.
      if (next && !loaded && !loading) void load();
      return next;
    });
  }, [loaded, loading, load]);

  // Distinct categories across all templates, for the filter dropdown.
  const categoryOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of templates) {
      for (const c of t.categories) map.set(c.slug, c.name);
    }
    return Array.from(map, ([slug, name]) => ({ slug, name })).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return templates.filter((t) => {
      if (q && !t.title.toLowerCase().includes(q) && !t.slug.toLowerCase().includes(q))
        return false;
      if (categorySlug !== "all" && !t.categories.some((c) => c.slug === categorySlug))
        return false;
      if (statusFilter === "active" && !t.is_active) return false;
      if (statusFilter === "inactive" && t.is_active) return false;
      if (usedOnly && t.instance_count === 0) return false;
      return true;
    });
  }, [templates, search, categorySlug, statusFilter, usedOnly]);

  const pageCount = Math.max(1, Math.ceil(filteredTemplates.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pagedTemplates = useMemo(
    () =>
      filteredTemplates.slice(
        safePage * PAGE_SIZE,
        safePage * PAGE_SIZE + PAGE_SIZE,
      ),
    [filteredTemplates, safePage],
  );

  // Reset to first page whenever the filter result set changes.
  useEffect(() => {
    setPage(0);
  }, [search, categorySlug, statusFilter, usedOnly]);

  const chartData = useMemo(() => {
    return templates
      .filter((t) => t.instance_count > 0)
      .slice(0, 10)
      .map((t) => ({
        name: t.title.length > 24 ? `${t.title.slice(0, 22)}…` : t.title,
        songs: t.instance_count,
      }));
  }, [templates]);

  return (
    <section className="rounded-lg border border-gray-200 bg-white">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors rounded-lg"
      >
        <BarChart3 className="h-5 w-5 text-yellow-600 flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-gray-900">
            Template usage
          </h2>
          <p className="text-xs text-gray-500">
            How many personalized songs were created from each template.
          </p>
        </div>
        {loading && (
          <Loader2 className="h-4 w-4 animate-spin text-yellow-600 flex-shrink-0" />
        )}
        <ChevronDown
          className={`h-5 w-5 text-gray-400 flex-shrink-0 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="border-t border-gray-200 p-4 space-y-4">
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : loading && !summary ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin text-yellow-600" />
              Loading template usage…
            </div>
          ) : summary ? (
            <AnalyticsBody
              summary={summary}
              topTemplate={templates[0]}
              filteredCount={filteredTemplates.length}
              pagedTemplates={pagedTemplates}
              chartData={chartData}
              page={safePage}
              pageCount={pageCount}
              onPageChange={setPage}
              categoryOptions={categoryOptions}
              search={search}
              onSearchChange={setSearch}
              categorySlug={categorySlug}
              onCategoryChange={setCategorySlug}
              statusFilter={statusFilter}
              onStatusChange={setStatusFilter}
              usedOnly={usedOnly}
              onUsedOnlyChange={setUsedOnly}
            />
          ) : null}
        </div>
      )}
    </section>
  );
}

function AnalyticsBody({
  summary,
  topTemplate,
  filteredCount,
  pagedTemplates,
  chartData,
  page,
  pageCount,
  onPageChange,
  categoryOptions,
  search,
  onSearchChange,
  categorySlug,
  onCategoryChange,
  statusFilter,
  onStatusChange,
  usedOnly,
  onUsedOnlyChange,
}: {
  summary: UsageSummary;
  topTemplate: UsageStat | undefined;
  filteredCount: number;
  pagedTemplates: UsageStat[];
  chartData: Array<{ name: string; songs: number }>;
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  categoryOptions: Array<{ slug: string; name: string }>;
  search: string;
  onSearchChange: (v: string) => void;
  categorySlug: string;
  onCategoryChange: (v: string) => void;
  statusFilter: "all" | "active" | "inactive";
  onStatusChange: (v: "all" | "active" | "inactive") => void;
  usedOnly: boolean;
  onUsedOnlyChange: (v: boolean) => void;
}) {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Songs created
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {summary.total_instances.toLocaleString("en-IN")}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Completed
          </p>
          <p className="mt-1 text-2xl font-bold text-green-700">
            {summary.total_completed.toLocaleString("en-IN")}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Templates used
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {summary.templates_with_usage}
            <span className="text-base font-normal text-gray-400">
              {" "}
              / {summary.total_templates}
            </span>
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Top template
          </p>
          <p className="mt-1 text-sm font-semibold text-gray-900 line-clamp-2">
            {topTemplate?.instance_count ? topTemplate.title : "—"}
          </p>
          {topTemplate?.instance_count ? (
            <p className="text-xs text-gray-500 mt-0.5">
              {topTemplate.instance_count.toLocaleString("en-IN")} songs
            </p>
          ) : null}
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-700 mb-4">
            Top templates by songs created
          </p>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 48 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                  height={60}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
                <Tooltip />
                <Bar dataKey="songs" name="Songs created" fill="#ca8a04" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search title or slug…"
          className="min-w-[12rem] flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500"
        />
        <select
          value={categorySlug}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500"
        >
          <option value="all">All categories</option>
          {categoryOptions.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) =>
            onStatusChange(e.target.value as "all" | "active" | "inactive")
          }
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <label className="inline-flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={usedOnly}
            onChange={(e) => onUsedOnlyChange(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
          />
          Used only
        </label>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Template
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Songs created
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Completed
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                  Consumer
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                  Partner
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                  Last used
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {pagedTemplates.map((t) => (
                <tr key={t.template_id} className="bg-white hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">
                    <Link
                      href={`/song-admin-portal/templated-songs/${t.template_id}`}
                      className="font-medium text-yellow-700 hover:text-yellow-800"
                    >
                      {t.title}
                    </Link>
                    <p className="text-xs text-gray-400 mt-0.5">{t.slug}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900 tabular-nums">
                    {t.instance_count.toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600 tabular-nums">
                    {t.completed_count.toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600 tabular-nums hidden md:table-cell">
                    {t.consumer_count.toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600 tabular-nums hidden md:table-cell">
                    {t.partner_count.toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell">
                    {formatDate(t.last_used_at)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {t.is_active ? (
                      <span className="inline-flex rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                        Inactive
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredCount === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                    No templates match these filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filteredCount > 0 && pageCount > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 text-sm text-gray-600">
            <span>
              {page * PAGE_SIZE + 1}–
              {Math.min((page + 1) * PAGE_SIZE, filteredCount)} of{" "}
              {filteredCount.toLocaleString("en-IN")}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onPageChange(Math.max(0, page - 1))}
                disabled={page === 0}
                className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1.5 font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </button>
              <span className="tabular-nums text-gray-500">
                {page + 1} / {pageCount}
              </span>
              <button
                type="button"
                onClick={() => onPageChange(Math.min(pageCount - 1, page + 1))}
                disabled={page >= pageCount - 1}
                className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1.5 font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
