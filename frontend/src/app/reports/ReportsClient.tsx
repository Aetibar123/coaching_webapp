"use client";

import { useState } from "react";
import {
  api,
  type Batch,
  type AttendanceAnalyticsSummary,
  type StudentAttendanceReportItem,
} from "@/lib/api";
import { useSearchParams } from "next/navigation";

interface ReportsClientProps {
  batches: Batch[];
  initialSummary: AttendanceAnalyticsSummary | null;
  initialStudentReport: StudentAttendanceReportItem[];
  initialStartDate: string;
  initialEndDate: string;
  userRole?: string;
  userEmail?: string;
}

export function ReportsClient({
  batches,
  initialSummary,
  initialStudentReport,
  initialStartDate,
  initialEndDate,
  userRole,
  userEmail,
}: ReportsClientProps) {
  const searchParams = useSearchParams();
  const paramBatchId = searchParams.get("batch") || "";

  // Filter States
  const [selectedBatchId, setSelectedBatchId] = useState(paramBatchId);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [datePreset, setDatePreset] = useState("30days");

  // Data States
  const [summary, setSummary] = useState<AttendanceAnalyticsSummary | null>(
    initialSummary
  );
  const [studentReports, setStudentReports] =
    useState<StudentAttendanceReportItem[]>(initialStudentReport);
  const [loading, setLoading] = useState(false);

  // Tab & Search States
  const [activeTab, setActiveTab] = useState<"students" | "batches" | "daily">(
    "students"
  );
  const [studentSearch, setStudentSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isExporting, setIsExporting] = useState(false);

  // Date Preset Helpers
  const applyPreset = (preset: string) => {
    setDatePreset(preset);
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    if (preset === "7days") {
      const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      setStartDate(past.toISOString().split("T")[0]);
      setEndDate(today);
      fetchData(selectedBatchId, past.toISOString().split("T")[0], today);
    } else if (preset === "30days") {
      const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      setStartDate(past.toISOString().split("T")[0]);
      setEndDate(today);
      fetchData(selectedBatchId, past.toISOString().split("T")[0], today);
    } else if (preset === "thisMonth") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split("T")[0];
      setStartDate(firstDay);
      setEndDate(today);
      fetchData(selectedBatchId, firstDay, today);
    } else if (preset === "lastMonth") {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        .toISOString()
        .split("T")[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0)
        .toISOString()
        .split("T")[0];
      setStartDate(firstDay);
      setEndDate(lastDay);
      fetchData(selectedBatchId, firstDay, lastDay);
    } else if (preset === "all") {
      setStartDate("");
      setEndDate("");
      fetchData(selectedBatchId, "", "");
    }
  };

  const fetchData = async (
    bId: string,
    sDate: string,
    eDate: string
  ) => {
    setLoading(true);
    try {
      const [newSummary, newReports] = await Promise.all([
        api.attendance.getAnalyticsSummary({
          batch_id: bId || undefined,
          start_date: sDate || undefined,
          end_date: eDate || undefined,
          teacher_email: userRole === "teacher" ? userEmail : undefined,
          role: userRole,
        }),
        api.attendance.getStudentReport({
          batch_id: bId || undefined,
          start_date: sDate || undefined,
          end_date: eDate || undefined,
          teacher_email: userRole === "teacher" ? userEmail : undefined,
          role: userRole,
        }),
      ]);
      setSummary(newSummary);
      setStudentReports(newReports);
    } catch (err) {
      console.error("Failed to refresh analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilter = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    fetchData(selectedBatchId, startDate, endDate);
  };

  // CSV Export Trigger
  const triggerCsvDownload = async (type: "students" | "daily" | "batches") => {
    setIsExporting(true);
    try {
      const url = api.attendance.exportCsvUrl({
        batch_id: selectedBatchId || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        type,
        teacher_email: userRole === "teacher" ? userEmail : undefined,
        role: userRole,
      });

      // Fetch with auth headers
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to export CSV");

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `attendance-${type}-${startDate || "start"}-to-${endDate || "end"}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to download CSV");
    } finally {
      setIsExporting(false);
    }
  };

  // Student filter calculations
  const filteredStudents = studentReports.filter((s) => {
    const matchesSearch =
      s.student_name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.student_email.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.batch_name.toLowerCase().includes(studentSearch.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      s.status_badge.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const overall = summary?.overall || {
    totalRecords: 0,
    presentCount: 0,
    absentCount: 0,
    lateCount: 0,
    excusedCount: 0,
    attendancePercentage: 0,
  };

  return (
    <div className="space-y-6">
      {/* Hero Banner (Home Page Signature Dark Bento) */}
      <div className="rounded-3xl bg-slate-950 p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-800/80">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.3),rgba(255,255,255,0))]" />

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/80 px-3.5 py-1 text-xs font-mono font-medium text-slate-300">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span>[ 06 ANALYTICS // REPORTING ]</span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400 font-normal">
                {userRole === "teacher" ? "Faculty Report" : "Institute Master"}
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Attendance Analytics &{" "}
              <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-white bg-clip-text text-transparent">
                Reporting Suite
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-400 max-w-xl font-normal leading-relaxed">
              Track daily and monthly trends, student-level attendance health, and batch-wise performance metrics with CSV data export.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => triggerCsvDownload("students")}
              disabled={isExporting}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-slate-950 shadow-md hover:bg-slate-100 transition-all disabled:opacity-50 cursor-pointer"
            >
              <span>📥</span> Export Students (CSV)
            </button>
            <button
              onClick={() => triggerCsvDownload("daily")}
              disabled={isExporting}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-all disabled:opacity-50 cursor-pointer"
            >
              <span>📊</span> Export Daily Trend (CSV)
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Date-Range Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <form
          onSubmit={handleApplyFilter}
          className="flex flex-col lg:flex-row lg:items-center justify-between gap-4"
        >
          {/* Batch Selector */}
          <div className="flex items-center gap-2 min-w-[240px]">
            <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">
              Cohort:
            </label>
            <select
              value={selectedBatchId}
              onChange={(e) => {
                setSelectedBatchId(e.target.value);
                fetchData(e.target.value, startDate, endDate);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Batches</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.course})
                </option>
              ))}
            </select>
          </div>

          {/* Quick Date Presets */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            {[
              { id: "7days", label: "7 Days" },
              { id: "30days", label: "30 Days" },
              { id: "thisMonth", label: "This Month" },
              { id: "lastMonth", label: "Last Month" },
              { id: "all", label: "All Time" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p.id)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  datePreset === p.id
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom Date Pickers & Apply Button */}
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setDatePreset("custom");
                setStartDate(e.target.value);
              }}
              className="rounded-xl border border-slate-200 bg-slate-50/50 px-2.5 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setDatePreset("custom");
                setEndDate(e.target.value);
              }}
              className="rounded-xl border border-slate-200 bg-slate-50/50 px-2.5 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {loading ? "Loading..." : "Filter"}
            </button>
          </div>
        </form>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Attendance Rate Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Attendance Rate
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                overall.attendancePercentage >= 80
                  ? "bg-emerald-50 text-emerald-700"
                  : overall.attendancePercentage >= 65
                  ? "bg-amber-50 text-amber-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {overall.attendancePercentage >= 80
                ? "Healthy"
                : overall.attendancePercentage >= 65
                ? "Moderate"
                : "Needs Attention"}
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {overall.attendancePercentage}%
            </span>
          </div>
          {/* Visual Progress Bar */}
          <div className="mt-3 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                overall.attendancePercentage >= 80
                  ? "bg-emerald-500"
                  : overall.attendancePercentage >= 65
                  ? "bg-amber-500"
                  : "bg-red-500"
              }`}
              style={{ width: `${Math.min(overall.attendancePercentage, 100)}%` }}
            />
          </div>
        </div>

        {/* Total Marked Entries */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Total Sessions Marked
          </span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {overall.totalRecords.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400">entries recorded</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Across {summary?.batchBreakdown.length || 0} cohort(s)
          </p>
        </div>

        {/* Present Days Count */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Total Attendances
          </span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-600 tracking-tight">
              {(overall.presentCount + overall.lateCount).toLocaleString()}
            </span>
            <span className="text-xs text-slate-400">
              ({overall.presentCount} on-time, {overall.lateCount} late)
            </span>
          </div>
          <p className="mt-2 text-xs text-emerald-700 font-medium">
            Active classroom presence
          </p>
        </div>

        {/* Absent Count */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Total Absences
          </span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-rose-600 tracking-tight">
              {overall.absentCount.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400">
              ({overall.excusedCount} excused)
            </span>
          </div>
          <p className="mt-2 text-xs text-rose-600 font-medium">
            Missed student sessions
          </p>
        </div>
      </div>

      {/* Visual Analytics: Daily & Monthly Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Attendance Trend (2 Cols) */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Daily Attendance Percentage
              </h3>
              <p className="text-xs text-slate-400">
                Timeline trend for session attendance rates
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {summary?.dailyTrend.length || 0} Active Days
            </span>
          </div>

          {!summary?.dailyTrend || summary.dailyTrend.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No daily records found for the selected date range.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
              {summary.dailyTrend.map((d) => (
                <div
                  key={d.date}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors text-xs"
                >
                  <div className="w-28 font-medium text-slate-700">
                    {d.date}
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-slate-500 font-mono">
                        {d.present} Present / {d.total} Total
                      </span>
                      <span className="font-bold text-slate-800">
                        {d.percentage}%
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          d.percentage >= 80
                            ? "bg-emerald-500"
                            : d.percentage >= 60
                            ? "bg-amber-500"
                            : "bg-red-500"
                        }`}
                        style={{ width: `${Math.min(d.percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                      d.percentage >= 80
                        ? "bg-emerald-50 text-emerald-700"
                        : d.percentage >= 60
                        ? "bg-amber-50 text-amber-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {d.percentage}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Monthly Attendance Progress (1 Col) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Monthly Breakdown
                </h3>
                <p className="text-xs text-slate-400">
                  Month-by-month attendance rate
                </p>
              </div>
            </div>

            {!summary?.monthlyTrend || summary.monthlyTrend.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No monthly data in this period.
              </div>
            ) : (
              <div className="space-y-4">
                {summary.monthlyTrend.map((m) => (
                  <div key={m.month} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">
                        {m.label}
                      </span>
                      <span className="font-bold text-blue-600">
                        {m.percentage}%
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-600"
                        style={{ width: `${Math.min(m.percentage, 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>{m.total} entries</span>
                      <span>{m.present} present</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Minimum required goal</span>
            <span className="font-semibold text-slate-700">75% Attendance</span>
          </div>
        </div>
      </div>

      {/* Reports Tabs Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6 text-sm font-semibold">
          <button
            onClick={() => setActiveTab("students")}
            className={`pb-3 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === "students"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>👨‍🎓</span> Student-Wise Report ({studentReports.length})
          </button>
          <button
            onClick={() => setActiveTab("batches")}
            className={`pb-3 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === "batches"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>🏫</span> Batch-Wise Breakdown ({summary?.batchBreakdown.length || 0})
          </button>
        </nav>
      </div>

      {/* TAB 1: Student-Wise Report */}
      {activeTab === "students" && (
        <div className="space-y-4">
          {/* Search & Status Filter */}
          <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="relative flex-1 w-full">
              <input
                type="text"
                placeholder="Search by student name, email, or batch..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <svg
                className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-auto rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Ratings</option>
                <option value="excellent">Excellent (≥90%)</option>
                <option value="good">Good (75–89%)</option>
                <option value="average">Average (50–74%)</option>
                <option value="at risk">At Risk (&lt;50%)</option>
                <option value="no data">No Records</option>
              </select>
            </div>
          </div>

          {/* Student Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
            {filteredStudents.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                No student attendance records matching the current filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500 tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Student</th>
                      <th className="px-6 py-4">Cohort</th>
                      <th className="px-6 py-4 text-center">Sessions</th>
                      <th className="px-6 py-4 text-center">Present</th>
                      <th className="px-6 py-4 text-center">Absent</th>
                      <th className="px-6 py-4">Rate (%)</th>
                      <th className="px-6 py-4 text-right">Health Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.map((s) => (
                      <tr
                        key={s.student_id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-900">
                            {s.student_name}
                          </div>
                          <div className="text-xs text-slate-400">
                            {s.student_email}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                            {s.batch_name}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center font-mono text-xs">
                          {s.total_days}
                        </td>
                        <td className="px-6 py-4 text-center font-mono text-xs font-semibold text-emerald-600">
                          {s.present_days}
                        </td>
                        <td className="px-6 py-4 text-center font-mono text-xs font-semibold text-rose-600">
                          {s.absent_days}
                        </td>
                        <td className="px-6 py-4 min-w-[140px]">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 w-10 text-xs">
                              {s.attendance_percentage}%
                            </span>
                            <div className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  s.attendance_percentage >= 80
                                    ? "bg-emerald-500"
                                    : s.attendance_percentage >= 65
                                    ? "bg-amber-500"
                                    : "bg-red-500"
                                }`}
                                style={{
                                  width: `${Math.min(
                                    s.attendance_percentage,
                                    100
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${
                              s.status_badge === "Excellent"
                                ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
                                : s.status_badge === "Good"
                                ? "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20"
                                : s.status_badge === "Average"
                                ? "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20"
                                : s.status_badge === "No Data"
                                ? "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-500/20"
                                : "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20"
                            }`}
                          >
                            {s.status_badge}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Batch-Wise Performance */}
      {activeTab === "batches" && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          {!summary?.batchBreakdown || summary.batchBreakdown.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              No batch data recorded for this date range.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500 tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Batch</th>
                    <th className="px-6 py-4">Course</th>
                    <th className="px-6 py-4 text-center">Total Entries</th>
                    <th className="px-6 py-4 text-center">Total Present</th>
                    <th className="px-6 py-4 text-center">Total Absent</th>
                    <th className="px-6 py-4">Attendance Rate (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summary.batchBreakdown.map((b) => (
                    <tr
                      key={b.batch_id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {b.name}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {b.course}
                      </td>
                      <td className="px-6 py-4 text-center font-mono text-xs">
                        {b.totalRecords}
                      </td>
                      <td className="px-6 py-4 text-center font-mono text-xs font-semibold text-emerald-600">
                        {b.presentCount}
                      </td>
                      <td className="px-6 py-4 text-center font-mono text-xs font-semibold text-rose-600">
                        {b.absentCount}
                      </td>
                      <td className="px-6 py-4 min-w-[160px]">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 w-12 text-xs">
                            {b.percentage}%
                          </span>
                          <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                b.percentage >= 80
                                  ? "bg-emerald-500"
                                  : b.percentage >= 65
                                  ? "bg-amber-500"
                                  : "bg-red-500"
                              }`}
                              style={{ width: `${Math.min(b.percentage, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

