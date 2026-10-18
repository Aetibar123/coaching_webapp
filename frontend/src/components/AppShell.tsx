"use client";

import { usePathname } from "next/navigation";
import Image from "next/image";
import { useState, type ReactNode } from "react";
import Link from "next/link";

interface UserProfile {
  id?: string;
  email?: string;
  fullName?: string;
  avatarUrl?: string;
  role?: string;
}

interface AppShellProps {
  children: ReactNode;
  user?: UserProfile | null;
}

const navItems = [
  {
    name: "Dashboard",
    href: "/dashboard",
    badge: "01",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
  },
  {
    name: "Batches",
    href: "/batches",
    badge: "02",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
        />
      </svg>
    ),
  },
  {
    name: "Class Schedule",
    href: "/classes",
    badge: "03",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  {
    name: "Assignments & MCQs",
    href: "/assignments",
    badge: "04",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
  },
  {
    name: "Students",
    href: "/students",
    badge: "05",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>
    ),
  },
  {
    name: "Attendance",
    href: "/attendance",
    badge: "06",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
        />
      </svg>
    ),
  },
  {
    name: "Analytics & Reports",
    href: "/reports",
    badge: "07",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
  },
  {
    name: "Faculty & Teachers",
    href: "/teachers",
    adminOnly: true,
    badge: "08",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    ),
  },
];

export function AppShell({ children, user }: AppShellProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const initial = user?.fullName?.charAt(0)?.toUpperCase() || "U";
  const isAdmin = user?.role?.toLowerCase() === "admin";
  const visibleNavItems = navItems.filter((item) => !item.adminOnly || isAdmin);

  // Derive current module label for header breadcrumb
  const currentItem = navItems.find(
    (item) =>
      pathname === item.href ||
      (item.href !== "/dashboard" && pathname?.startsWith(item.href))
  );
  const currentTitle = currentItem?.name || "Dashboard";

  return (
    <div className="min-h-screen bg-[#fafafa] text-slate-900 selection:bg-blue-600 selection:text-white font-sans flex flex-col md:flex-row relative">
      {/* Engineering background grid matching Home page */}
      <div className="fixed inset-0 -z-10 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35 pointer-events-none" />

      {/* ========================================================================= */}
      {/* DESKTOP SIDEBAR (Restored with refined Home-Page Bento Theme)              */}
      {/* ========================================================================= */}
      <aside className="hidden md:flex md:w-64 md:flex-col fixed inset-y-0 border-r border-slate-200/90 bg-white/95 backdrop-blur-md z-30 shadow-xs">
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-5">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 font-bold text-white text-sm shadow-xs group-hover:bg-blue-600 transition-colors">
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
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-extrabold text-slate-950 tracking-tight leading-none">
                  CoachingHub
                </span>
                <span className="rounded border border-slate-200 bg-slate-100 px-1 py-0.2 text-[9px] font-mono font-semibold text-slate-600">
                  v2.4
                </span>
              </div>
              <p className="text-[10px] font-mono text-slate-400 font-medium mt-0.5">
                ENTERPRISE ERP
              </p>
            </div>
          </Link>
        </div>

        {/* Navigation Modules */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-5">
          <div>
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 font-mono">
                [ ERP MODULES ]
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            <nav className="space-y-1">
              {visibleNavItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname?.startsWith(item.href));
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-slate-950 text-white shadow-xs font-bold"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`transition-colors ${
                          isActive
                            ? "text-white"
                            : "text-slate-400 group-hover:text-slate-700"
                        }`}
                      >
                        {item.icon}
                      </span>
                      <span>{item.name}</span>
                    </div>
                    <span
                      className={`font-mono text-[10px] ${
                        isActive
                          ? "text-slate-400 font-normal"
                          : "text-slate-300 group-hover:text-slate-400"
                      }`}
                    >
                      {item.badge}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Quick Platform Navigation */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono px-2 block mb-2">
              [ PORTAL ]
            </span>
            <Link
              href="/"
              className="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <svg
                  className="h-4 w-4 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
                <span>Public Landing</span>
              </div>
              <span className="text-slate-400 text-[11px]">↗</span>
            </Link>
          </div>
        </div>

        {/* Sidebar Footer: User Card & Sign Out */}
        {user && (
          <div className="border-t border-slate-100 p-3 bg-slate-50/60">
            <div className="flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white p-2.5 shadow-2xs">
              {user.avatarUrl ? (
                <Image
                  src={user.avatarUrl}
                  alt={user.fullName || "User"}
                  width={32}
                  height={32}
                  unoptimized
                  className="rounded-full ring-1 ring-slate-200 shrink-0"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white shrink-0">
                  {initial}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <p className="truncate text-xs font-bold text-slate-900 leading-tight">
                    {user.fullName || "User"}
                  </p>
                  {user.role && (
                    <span
                      className={`inline-flex items-center rounded px-1.5 py-0.2 text-[9px] font-mono font-bold uppercase tracking-wider shrink-0 ${
                        user.role.toLowerCase() === "admin"
                          ? "bg-slate-950 text-white"
                          : "bg-blue-50 text-blue-700 border border-blue-200/60"
                      }`}
                    >
                      {user.role}
                    </span>
                  )}
                </div>
                <p className="truncate text-[10px] text-slate-400 font-mono mt-0.5">
                  {user.email}
                </p>
              </div>
            </div>

            <form action="/auth/signout" method="post" className="mt-2">
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all cursor-pointer"
              >
                <span>Sign out</span>
                <span className="text-slate-400">→</span>
              </button>
            </form>
          </div>
        )}
      </aside>

      {/* ========================================================================= */}
      {/* MAIN CONTENT AREA WITH TOP CONTEXT BAR & FOOTER                           */}
      {/* ========================================================================= */}
      <div className="flex flex-1 flex-col md:pl-64">
        {/* Top Context Header Bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/80 backdrop-blur-md px-4 sm:px-6 lg:px-8">
          {/* Left: Mobile Toggle & Breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100 cursor-pointer"
              aria-label="Toggle Navigation"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

            <Link href="/" className="flex items-center gap-2 md:hidden">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-950 font-bold text-white text-xs">
                C
              </div>
            </Link>

            {/* Breadcrumb Context */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-mono hidden sm:inline">[ CONSOLE ]</span>
              <span className="text-slate-300 font-mono hidden sm:inline">/</span>
              <span className="text-slate-900 font-bold tracking-tight">
                {currentTitle}
              </span>
            </div>
          </div>

          {/* Right Header Status */}
          <div className="flex items-center gap-3">
            {/* Live Database Status */}
            <div className="hidden sm:inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50/80 px-3 py-1 text-[11px] font-mono text-slate-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Supabase PostgreSQL • Online</span>
            </div>

            {/* Quick Home Link */}
            <Link
              href="/"
              className="hidden lg:inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
            >
              <span>Public Site</span>
              <span className="text-slate-400">↗</span>
            </Link>

            {/* Mobile User Avatar */}
            {user && (
              <div className="flex md:hidden items-center gap-2">
                {user.avatarUrl ? (
                  <Image
                    src={user.avatarUrl}
                    alt={user.fullName || "User"}
                    width={28}
                    height={28}
                    unoptimized
                    className="rounded-full ring-1 ring-slate-200"
                  />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white">
                    {initial}
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Mobile Slide-down Drawer */}
        {mobileMenuOpen && (
          <div className="border-b border-slate-200 bg-white px-4 py-4 md:hidden space-y-2 animate-in slide-in-from-top-2 duration-150 shadow-md">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 font-mono px-2 block">
              [ WORKFLOW MODULES ]
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {visibleNavItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold ${
                    pathname === item.href
                      ? "bg-slate-950 text-white font-bold"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </Link>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between px-2">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800"
              >
                ← Public Home
              </Link>
              {user && (
                <form action="/auth/signout" method="post">
                  <button
                    type="submit"
                    className="text-xs font-semibold text-rose-600 hover:text-rose-800 cursor-pointer"
                  >
                    Sign out
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Page Content Viewport */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>

        {/* Clean Platform Footer matching Home Page */}
        <footer className="mt-auto border-t border-slate-200 bg-white/80 backdrop-blur-xs py-6 text-xs text-slate-500">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-950 text-white font-bold text-xs">
                C
              </div>
              <div>
                <span className="font-bold text-slate-900">CoachingHub ERP</span>
                <span className="text-slate-400 text-[11px] ml-2 hidden sm:inline">
                  High-performance Institute Operating System
                </span>
              </div>
            </div>

            <p className="font-mono text-[11px] text-slate-400">
              © {new Date().getFullYear()} CoachingHub. NestJS + Supabase.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
