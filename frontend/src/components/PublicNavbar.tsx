"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

interface PublicNavbarProps {
  user?: {
    fullName?: string;
    avatarUrl?: string;
    email?: string;
  } | null;
}

export function PublicNavbar({ user }: PublicNavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
        {/* Brand Logo with Custom Geometric Glyph */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white font-bold text-sm shadow-xs group-hover:bg-blue-600 transition-colors">
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          <div>
            <span className="text-base font-extrabold tracking-tight text-slate-950 flex items-center gap-1.5">
              CoachingHub
              <span className="rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.2 text-[10px] font-mono font-semibold text-slate-600">
                v2.4
              </span>
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-slate-600">
          <Link
            href="/#features"
            className="hover:text-slate-950 transition-colors"
          >
            Capabilities
          </Link>
          <Link
            href="/#bento"
            className="hover:text-slate-950 transition-colors"
          >
            Architecture
          </Link>
          <Link
            href="/#comparison"
            className="hover:text-slate-950 transition-colors"
          >
            Why CoachingHub
          </Link>
          <Link
            href="/#faq"
            className="hover:text-slate-950 transition-colors"
          >
            FAQ
          </Link>
          <Link
            href="/batches"
            className="hover:text-slate-950 transition-colors"
          >
            Batches
          </Link>
          <Link
            href="/attendance"
            className="hover:text-slate-950 transition-colors"
          >
            Attendance
          </Link>
        </nav>

        {/* Right CTA / Auth Status */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2.5">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 rounded-xl bg-slate-950 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition-all"
              >
                {user.avatarUrl ? (
                  <Image
                    src={user.avatarUrl}
                    alt={user.fullName || "User"}
                    width={20}
                    height={20}
                    unoptimized
                    className="rounded-full"
                  />
                ) : (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                    {user.fullName?.charAt(0).toUpperCase() || "U"}
                  </span>
                )}
                <span>Console</span>
              </Link>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  Sign out
                </button>
              </form>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-950 hover:bg-slate-100 transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition-all cursor-pointer"
              >
                <span>Google OAuth</span>
                <span className="text-slate-400">→</span>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 md:hidden"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d={
                mobileMenuOpen
                  ? "M6 18L18 6M6 6l12 12"
                  : "M4 6h16M4 12h16M4 18h16"
              }
            />
          </svg>
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="border-b border-slate-200 bg-white px-6 py-4 md:hidden space-y-3 shadow-lg text-sm">
          <Link
            href="/#features"
            onClick={() => setMobileMenuOpen(false)}
            className="block font-semibold text-slate-700 hover:text-blue-600"
          >
            Capabilities
          </Link>
          <Link
            href="/#bento"
            onClick={() => setMobileMenuOpen(false)}
            className="block font-semibold text-slate-700 hover:text-blue-600"
          >
            Architecture
          </Link>
          <Link
            href="/#comparison"
            onClick={() => setMobileMenuOpen(false)}
            className="block font-semibold text-slate-700 hover:text-blue-600"
          >
            Why CoachingHub
          </Link>
          <Link
            href="/#faq"
            onClick={() => setMobileMenuOpen(false)}
            className="block font-semibold text-slate-700 hover:text-blue-600"
          >
            FAQ
          </Link>
          <Link
            href="/batches"
            onClick={() => setMobileMenuOpen(false)}
            className="block font-semibold text-slate-700 hover:text-blue-600"
          >
            Batches
          </Link>
          <Link
            href="/students"
            onClick={() => setMobileMenuOpen(false)}
            className="block font-semibold text-slate-700 hover:text-blue-600"
          >
            Students
          </Link>
          <Link
            href="/attendance"
            onClick={() => setMobileMenuOpen(false)}
            className="block font-semibold text-slate-700 hover:text-blue-600"
          >
            Attendance
          </Link>

          <div className="pt-3 border-t border-slate-100">
            {user ? (
              <div className="space-y-2">
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full text-center rounded-xl bg-slate-950 py-2.5 text-xs font-bold text-white"
                >
                  Open Console →
                </Link>
                <form action="/auth/signout" method="post">
                  <button
                    type="submit"
                    className="w-full text-center py-2 text-xs font-semibold text-rose-600"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-center rounded-xl bg-slate-950 py-2.5 text-xs font-bold text-white"
              >
                Sign In with Google
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
