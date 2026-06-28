"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Cpu,
  PlusCircle,
  FileText,
  Users,
  Library,
  Tag,
  Newspaper,
  Scissors,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Music2,
} from "lucide-react";

// ─── Nav structure ────────────────────────────────────────────────────────────

const BASE = "/song-admin-portal";

type NavItem = {
  label: string;
  href: string;
  icon: React.FC<{ className?: string }>;
  /** Extra hrefs that should also count as "active" for this item */
  alsoActiveFor?: string[];
};

type NavGroup = {
  label: string | null; // null = no section header (top-level items)
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    // Dashboard sits above all groups — it's the home / daily triage view
    label: null,
    items: [
      { label: "Dashboard", href: BASE, icon: LayoutDashboard },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Partner API", href: `${BASE}/partner-api`, icon: Cpu },
    ],
  },
  {
    label: "Create",
    items: [
      { label: "New Song", href: `${BASE}/create`, icon: PlusCircle },
      { label: "Generate Lyrics", href: `${BASE}/generate-lyrics`, icon: FileText },
    ],
  },
  {
    label: "Partners",
    items: [
      { label: "Retail Partners", href: `${BASE}/partners`, icon: Users },
    ],
  },
  {
    label: "Library",
    items: [
      {
        label: "Templated Songs",
        href: `${BASE}/templated-songs`,
        icon: Library,
        alsoActiveFor: [`${BASE}/templated-songs/create`],
      },
      { label: "Personas", href: `${BASE}/personas`, icon: Music2 },
      { label: "Categories", href: `${BASE}/categories`, icon: Tag },
    ],
  },
  {
    label: "Content",
    items: [
      { label: "Blog", href: `${BASE}/blog`, icon: Newspaper },
    ],
  },
  {
    label: "Tools",
    items: [
      { label: "Merge Audio", href: `${BASE}/merge-audio`, icon: Scissors },
    ],
  },
];

// ─── Single nav item ──────────────────────────────────────────────────────────

function NavLink({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors group ${
        active
          ? "bg-indigo-50 text-indigo-700"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      }`}
    >
      <Icon
        className={`h-4 w-4 shrink-0 ${
          active ? "text-indigo-600" : "text-gray-400 group-hover:text-gray-500"
        }`}
      />
      <span className="truncate">{item.label}</span>
      {active && (
        <ChevronRight className="h-3 w-3 ml-auto text-indigo-400 shrink-0" />
      )}
    </Link>
  );
}

// ─── Sidebar content (shared between desktop + mobile drawer) ─────────────────

function SidebarContent({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  function isActive(item: NavItem): boolean {
    // Exact match for Dashboard to avoid it lighting up everywhere
    if (item.href === BASE && !item.alsoActiveFor) {
      return pathname === BASE || pathname === BASE + "/";
    }
    if (pathname === item.href) return true;
    if (item.alsoActiveFor?.some((alt) => pathname.startsWith(alt))) return true;
    // Prefix match for sub-pages (e.g. /templated-songs/123 → templated-songs active)
    if (item.href !== BASE && pathname.startsWith(item.href)) return true;
    return false;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-gray-100">
        <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
          <Music2 className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900 leading-tight">Melodia</p>
          <p className="text-xs text-gray-400 leading-tight">Admin Portal</p>
        </div>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {NAV_GROUPS.map((group, gi) => {
          return (
            <div key={gi}>
              {group.label && (
                <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.href + item.label}
                    item={item}
                    active={isActive(item)}
                    onClick={onNavigate}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-4 border-t border-gray-100 pt-3">
        <form action="/song-admin-portal/logout" method="post">
          <button
            type="submit"
            className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <LogOut className="h-4 w-4 text-gray-400" />
            Logout
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function AdminSidebar() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      {/* ── Desktop sidebar (lg+) — in flex flow ── */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0 bg-white border-r border-gray-200 min-h-screen sticky top-0">
        <SidebarContent pathname={pathname} />
      </aside>

      {/* ── Mobile: fixed topbar — NOT in flex flow, so main gets full width ── */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-30 flex items-center justify-between px-4 h-14 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center shrink-0">
            <Music2 className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold text-gray-900">Melodia Admin</span>
        </div>
        <button
          type="button"
          onClick={() => setDrawerOpen((v) => !v)}
          className="p-2 rounded-md text-gray-600 hover:bg-gray-100"
          aria-label="Toggle menu"
          aria-expanded={drawerOpen}
        >
          {drawerOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* ── Mobile: drawer overlay + panel (both fixed, out of flow) ── */}
      {drawerOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/30"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="lg:hidden fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200 shadow-xl">
            <SidebarContent
              pathname={pathname}
              onNavigate={() => setDrawerOpen(false)}
            />
          </div>
        </>
      )}
    </>
  );
}
