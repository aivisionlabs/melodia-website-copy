"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export default function AdminNav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between h-16">
        <div className="flex items-center">
          <Link
            href="/song-admin-portal"
            className="text-xl font-semibold text-gray-900"
          >
            Melodia Admin Portal
          </Link>
        </div>

        {/* Desktop navigation */}
        <div className="hidden md:flex items-center space-x-4">
          <Link
            href="/song-admin-portal"
            className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
          >
            Dashboard
          </Link>
          <Link
            href="/song-admin-portal/create"
            className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
          >
            Create Song
          </Link>
          <Link
            href="/song-admin-portal/generate-lyrics"
            className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
          >
            Generate Lyrics
          </Link>
          <Link
            href="/song-admin-portal/templated-songs"
            className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
          >
            Templated Songs
          </Link>
          <Link
            href="/song-admin-portal/categories"
            className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
          >
            Categories
          </Link>
          <Link
            href="/song-admin-portal/partners"
            className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
          >
            Partners
          </Link>
          <Link
            href="/song-admin-portal/partner-api"
            className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
          >
            Partner API
          </Link>
          <Link
            href="/song-admin-portal/rj-shows"
            className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
          >
            RJ Shows
          </Link>
          <Link
            href="/song-admin-portal/merge-audio"
            className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
          >
            Merge Audio
          </Link>
          <Link
            href="/song-admin-portal/blog"
            className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
          >
            Blog
          </Link>
          <form action="/song-admin-portal/logout" method="post">
            <button
              type="submit"
              className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Logout
            </button>
          </form>
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300"
          aria-label="Toggle navigation menu"
          aria-expanded={isOpen}
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile navigation */}
      {isOpen && (
        <div className="md:hidden pb-3">
          <div className="flex flex-col gap-1 pt-2">
            <Link
              href="/song-admin-portal"
              className="block w-full text-left text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Dashboard
            </Link>
            <Link
              href="/song-admin-portal/create"
              className="block w-full text-left text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Create Song
            </Link>
            <Link
              href="/song-admin-portal/generate-lyrics"
              className="block w-full text-left text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Generate Lyrics
            </Link>
            <Link
              href="/song-admin-portal/templated-songs"
              className="block w-full text-left text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Templated Songs
            </Link>
            <Link
              href="/song-admin-portal/categories"
              className="block w-full text-left text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Categories
            </Link>
            <Link
              href="/song-admin-portal/partners"
              className="block w-full text-left text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Partners
            </Link>
            <Link
              href="/song-admin-portal/partner-api"
              className="block w-full text-left text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Partner API
            </Link>
            <Link
              href="/song-admin-portal/rj-shows"
              className="block w-full text-left text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              RJ Shows
            </Link>
            <Link
              href="/song-admin-portal/merge-audio"
              className="block w-full text-left text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Merge Audio
            </Link>
            <Link
              href="/song-admin-portal/blog"
              className="block w-full text-left text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Blog
            </Link>
            <form
              action="/song-admin-portal/logout"
              method="post"
              className="px-3"
            >
              <button
                type="submit"
                className="w-full text-left text-gray-700 hover:text-gray-900 px-0 py-2 rounded-md text-sm font-medium"
              >
                Logout
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
