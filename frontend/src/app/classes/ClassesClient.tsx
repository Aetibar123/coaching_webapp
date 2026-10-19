"use client";

import { useState } from "react";
import {
  api,
  type Batch,
  type ClassItem,
  type CreateClassInput,
  type RescheduleClassInput,
} from "@/lib/api";
import Link from "next/link";

interface ClassesClientProps {
  batches: Batch[];
  initialClasses: ClassItem[];
  userRole?: string;
  userEmail?: string;
}

export function ClassesClient({
  batches,
  initialClasses,
  userRole,
  userEmail,
}: ClassesClientProps) {
  const [classesList, setClassesList] = useState<ClassItem[]>(initialClasses);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Schedule Class Modal State
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleSubmitting, setScheduleSubmitting] = useState(false);
  const [scheduleForm, setScheduleForm] = useState<CreateClassInput>({
    batch_id: batches[0]?.id ? String(batches[0].id) : "",
    title: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
    start_time: "10:00",
    end_time: "11:30",
    room: "",
    meeting_link: "",
  });

  // Reschedule Modal State
  const [rescheduleTarget, setRescheduleTarget] = useState<ClassItem | null>(null);
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false);
  const [rescheduleForm, setRescheduleForm] = useState<RescheduleClassInput>({
    date: "",
    start_time: "",
    end_time: "",
    reason: "",
    room: "",
    meeting_link: "",
  });

  // Reload classes list
  const refreshClasses = async (bId = selectedBatchId, status = statusFilter) => {
    setLoading(true);
    try {
      const authHeaders = {
        "x-user-role": userRole || "",
        "x-user-email": userEmail || "",
      };
      const data = await api.classes.list(
        {
          batch_id: bId || undefined,
          status: status !== "all" ? status : undefined,
          teacher_email: userRole === "teacher" ? userEmail : undefined,
        },
        authHeaders
      );
      setClassesList(data);
    } catch (err) {
      setNotification({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to load classes",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle Schedule Class Submit
  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleForm.batch_id || !scheduleForm.title || !scheduleForm.date) return;

    setScheduleSubmitting(true);
    setNotification(null);

    try {
      const authHeaders = {
        "x-user-role": userRole || "",
        "x-user-email": userEmail || "",
      };
      const created = await api.classes.create(
        {
          batch_id: scheduleForm.batch_id,
          title: scheduleForm.title.trim(),
          description: scheduleForm.description?.trim() || undefined,
          date: scheduleForm.date,
          start_time: scheduleForm.start_time,
          end_time: scheduleForm.end_time,
          room: scheduleForm.room?.trim() || undefined,
          meeting_link: scheduleForm.meeting_link?.trim() || undefined,
        },
        authHeaders
      );

      if (created) {
        setClassesList((prev) => [created, ...prev]);
        setNotification({
          type: "success",
          message: `Class "${created.title}" scheduled successfully for ${created.date}!`,
        });
        setIsScheduleModalOpen(false);
        setScheduleForm({
          batch_id: batches[0]?.id ? String(batches[0].id) : "",
          title: "",
          description: "",
          date: new Date().toISOString().split("T")[0],
          start_time: "10:00",
          end_time: "11:30",
          room: "",
          meeting_link: "",
        });
      }
    } catch (err) {
      setNotification({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to schedule class",
      });
    } finally {
      setScheduleSubmitting(false);
    }
  };

  // Open Reschedule Modal
  const openRescheduleModal = (cls: ClassItem) => {
    setRescheduleTarget(cls);
    setRescheduleForm({
      date: cls.date,
      start_time: cls.start_time?.substring(0, 5) || "10:00",
      end_time: cls.end_time?.substring(0, 5) || "11:30",
      reason: "",
      room: cls.room || "",
      meeting_link: cls.meeting_link || "",
    });
  };

  // Handle Reschedule Submit
  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleTarget) return;

    setRescheduleSubmitting(true);
    setNotification(null);

    try {
      const authHeaders = {
        "x-user-role": userRole || "",
        "x-user-email": userEmail || "",
      };
      const updated = await api.classes.reschedule(
        rescheduleTarget.id,
        {
          date: rescheduleForm.date,
          start_time: rescheduleForm.start_time,
          end_time: rescheduleForm.end_time,
          reason: rescheduleForm.reason?.trim() || "Rescheduled by instructor",
          room: rescheduleForm.room?.trim() || undefined,
          meeting_link: rescheduleForm.meeting_link?.trim() || undefined,
        },
        authHeaders
      );

      if (updated) {
        setClassesList((prev) =>
          prev.map((c) =>
            c.id === rescheduleTarget.id
              ? {
                  ...c,
                  ...updated,
                  status: "rescheduled",
                  original_date: rescheduleTarget.date,
                  original_time: rescheduleTarget.start_time,
                  reschedule_reason: rescheduleForm.reason,
                }
              : c
          )
        );

        setNotification({
          type: "success",
          message: `Class rescheduled to ${rescheduleForm.date} at ${rescheduleForm.start_time}!`,
        });
        setRescheduleTarget(null);
      }
    } catch (err) {
      setNotification({
        type: "error",
        message:
          err instanceof Error ? err.message : "Failed to reschedule class",
      });
    } finally {
      setRescheduleSubmitting(false);
    }
  };

  // Mark Completed / Cancelled
  const handleStatusChange = async (
    cls: ClassItem,
    newStatus: "completed" | "cancelled"
  ) => {
    try {
      const updated = await api.classes.update(cls.id, { status: newStatus });
      if (updated) {
        setClassesList((prev) =>
          prev.map((c) => (c.id === cls.id ? { ...c, status: newStatus } : c))
        );
        setNotification({
          type: "success",
          message: `Class marked as ${newStatus}!`,
        });
      }
    } catch (err) {
      setNotification({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to update status",
      });
    }
  };

  // Filter classes
  const filteredClasses = classesList.filter((c) => {
    const matchesBatch =
      !selectedBatchId || String(c.batch_id) === String(selectedBatchId);
    const matchesStatus =
      statusFilter === "all" || c.status.toLowerCase() === statusFilter.toLowerCase();
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      c.title.toLowerCase().includes(q) ||
      (c.batch_name && c.batch_name.toLowerCase().includes(q)) ||
      (c.instructor && c.instructor.toLowerCase().includes(q)) ||
      (c.description && c.description.toLowerCase().includes(q));

    return matchesBatch && matchesStatus && matchesSearch;
  });

  const isTeacherOrAdmin = userRole === "admin" || userRole === "teacher";
  const scheduledCount = classesList.filter((c) => c.status === "scheduled").length;
  const rescheduledCount = classesList.filter((c) => c.status === "rescheduled").length;
  const completedCount = classesList.filter((c) => c.status === "completed").length;

  return (
    <div className="space-y-6">
      {/* Hero Banner (Home Page Signature Dark Bento) */}
      <div className="rounded-3xl bg-slate-950 p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-800/80">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.3),rgba(255,255,255,0))]" />

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/80 px-3.5 py-1 text-xs font-mono font-medium text-slate-300">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span>[ 04 ORCHESTRATION // TIMETABLE ]</span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400 font-normal">
                {userRole === "teacher"
                  ? "Faculty Schedule"
                  : userRole === "student"
                  ? "Student Roster"
                  : "Institute Master Schedule"}
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Class Schedule &{" "}
              <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-white bg-clip-text text-transparent">
                Lecture Timetable
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-400 max-w-xl font-normal leading-relaxed">
              Coordinate physical classrooms, meeting links, and real-time reschedule notices across all coaching batches.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {isTeacherOrAdmin && (
              <button
                onClick={() => setIsScheduleModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-slate-950 shadow-md hover:bg-slate-100 transition-all cursor-pointer"
              >
                <span>+</span> Schedule Class
              </button>
            )}

            <Link
              href="/assignments"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-all"
            >
              <span>📝</span> MCQs
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs text-center">
          <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 font-mono">
            {classesList.length}
          </p>
          <p className="mt-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
            Total Sessions
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs text-center">
          <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-blue-600 font-mono">
            {scheduledCount}
          </p>
          <p className="mt-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
            Scheduled Upcoming
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs text-center">
          <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-amber-600 font-mono">
            {rescheduledCount}
          </p>
          <p className="mt-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
            Rescheduled
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs text-center">
          <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-emerald-600 font-mono">
            {completedCount}
          </p>
          <p className="mt-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
            Completed
          </p>
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div
          className={`rounded-2xl p-4 text-sm font-medium flex items-center justify-between border ${
            notification.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-red-50 text-red-800 border-red-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{notification.type === "success" ? "✓" : "⚠️"}</span>
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-xs font-bold underline opacity-70 hover:opacity-100 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-3 justify-between">
        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
          {/* Cohort Filter */}
          <select
            value={selectedBatchId}
            onChange={(e) => {
              setSelectedBatchId(e.target.value);
              refreshClasses(e.target.value, statusFilter);
            }}
            className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="">All Cohorts / Batches</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.course})
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              refreshClasses(selectedBatchId, e.target.value);
            }}
            className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="rescheduled">Rescheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Search Field */}
        <div className="relative w-full md:w-72">
          <input
            type="text"
            placeholder="Search topic or instructor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <svg
            className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400"
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
      </div>

      {/* Classes List / Grid */}
      {loading ? (
        <div className="py-16 text-center text-sm font-medium text-slate-400">
          Loading classes schedule...
        </div>
      ) : filteredClasses.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <span className="text-4xl">🗓️</span>
          <h3 className="mt-3 text-base font-bold text-slate-900">
            No classes scheduled
          </h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            {selectedBatchId || statusFilter !== "all"
              ? "No classes matching the selected batch or status filters."
              : "No upcoming classes found. Schedule a session to get started."}
          </p>
          {isTeacherOrAdmin && (
            <button
              onClick={() => setIsScheduleModalOpen(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"
            >
              <span>+</span> Schedule First Class
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredClasses.map((cls) => {
            const isRescheduled = cls.status === "rescheduled";
            const isCompleted = cls.status === "completed";
            const isCancelled = cls.status === "cancelled";

            return (
              <div
                key={cls.id}
                className={`rounded-2xl border bg-white p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between ${
                  isRescheduled
                    ? "border-amber-200 bg-gradient-to-b from-amber-50/20 to-white"
                    : isCancelled
                    ? "border-rose-200 bg-rose-50/10 opacity-75"
                    : isCompleted
                    ? "border-slate-200 bg-slate-50/20"
                    : "border-slate-200"
                }`}
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                      {cls.batch_name || "Batch"}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        isRescheduled
                          ? "bg-amber-100 text-amber-800"
                          : isCompleted
                          ? "bg-blue-100 text-blue-800"
                          : isCancelled
                          ? "bg-rose-100 text-rose-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {cls.status}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="mt-3 text-base font-bold text-slate-900 leading-snug">
                    {cls.title}
                  </h3>
                  {cls.description && (
                    <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                      {cls.description}
                    </p>
                  )}

                  {/* Reschedule Notice Banner */}
                  {isRescheduled && (
                    <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-800">
                      <div className="font-semibold flex items-center gap-1.5">
                        <span>⚠️</span>
                        <span>Rescheduled Session</span>
                      </div>
                      {cls.original_date && (
                        <p className="mt-0.5 text-[11px] text-amber-700">
                          Original: {cls.original_date}{" "}
                          {cls.original_time?.substring(0, 5)}
                        </p>
                      )}
                      {cls.reschedule_reason && (
                        <p className="mt-0.5 text-[11px] font-medium text-amber-900">
                          Reason: {cls.reschedule_reason}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Date & Time Meta */}
                  <div className="mt-4 space-y-2 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 text-slate-500 text-xs">
                        📅
                      </span>
                      <span className="font-semibold text-slate-800">
                        {cls.date}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 text-slate-500 text-xs">
                        ⏰
                      </span>
                      <span>
                        {cls.start_time?.substring(0, 5)} –{" "}
                        {cls.end_time?.substring(0, 5)}
                      </span>
                    </div>

                    {cls.room && (
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 text-slate-500 text-xs">
                          📍
                        </span>
                        <span>Room: {cls.room}</span>
                      </div>
                    )}

                    {cls.instructor && (
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 text-slate-500 text-xs">
                          👨‍🏫
                        </span>
                        <span>Faculty: {cls.instructor}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex flex-col gap-2">
                  {cls.meeting_link && (
                    <a
                      href={
                        cls.meeting_link.startsWith("http")
                          ? cls.meeting_link
                          : `https://${cls.meeting_link}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors"
                    >
                      <span>🎥</span> Join Online Meeting ↗
                    </a>
                  )}

                  <div className="flex items-center justify-between text-xs pt-1">
                    {/* Attendance & Assignments Links */}
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/attendance?batch=${cls.batch_id}&date=${cls.date}`}
                        className="font-semibold text-blue-600 hover:text-blue-800"
                      >
                        Attendance →
                      </Link>
                      <Link
                        href={`/assignments`}
                        className="font-semibold text-indigo-600 hover:text-indigo-800"
                      >
                        📝 MCQs →
                      </Link>
                    </div>

                    {/* Reschedule & Manage (Teacher & Admin) */}
                    {isTeacherOrAdmin && !isCancelled && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openRescheduleModal(cls)}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          Reschedule
                        </button>
                        {!isCompleted && (
                          <button
                            onClick={() => handleStatusChange(cls, "completed")}
                            title="Mark as completed"
                            className="rounded-lg bg-emerald-50 px-2 py-1 font-bold text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
                          >
                            ✓
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: Schedule New Class */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Schedule New Class Session
                </h3>
                <p className="text-xs text-slate-400">
                  Add a lecture, lab, or webinar to the batch schedule.
                </p>
              </div>
              <button
                onClick={() => setIsScheduleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {batches.length === 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 space-y-1">
                <p className="font-bold">No Cohorts Assigned</p>
                <p>
                  You are not assigned to any batches yet. Teachers can only schedule classes for batches specifically allocated to them by an administrator.
                </p>
              </div>
            ) : (
              <form onSubmit={handleScheduleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Cohort / Batch *
                </label>
                <select
                  required
                  value={scheduleForm.batch_id}
                  onChange={(e) =>
                    setScheduleForm({ ...scheduleForm, batch_id: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.course})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Class Title / Topic *
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. React Hooks Deep Dive, SQL Joins Lab"
                  value={scheduleForm.title}
                  onChange={(e) =>
                    setScheduleForm({ ...scheduleForm, title: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date *
                  </label>
                  <input
                    required
                    type="date"
                    value={scheduleForm.date}
                    onChange={(e) =>
                      setScheduleForm({ ...scheduleForm, date: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Start Time *
                  </label>
                  <input
                    required
                    type="time"
                    value={scheduleForm.start_time}
                    onChange={(e) =>
                      setScheduleForm({
                        ...scheduleForm,
                        start_time: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    End Time *
                  </label>
                  <input
                    required
                    type="time"
                    value={scheduleForm.end_time}
                    onChange={(e) =>
                      setScheduleForm({ ...scheduleForm, end_time: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Physical Room (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Lab 2, Room 304"
                    value={scheduleForm.room}
                    onChange={(e) =>
                      setScheduleForm({ ...scheduleForm, room: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Virtual Link (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. meet.google.com/xyz-abc"
                    value={scheduleForm.meeting_link}
                    onChange={(e) =>
                      setScheduleForm({
                        ...scheduleForm,
                        meeting_link: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description / Agenda (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Topics to be covered in this session..."
                  value={scheduleForm.description}
                  onChange={(e) =>
                    setScheduleForm({
                      ...scheduleForm,
                      description: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={scheduleSubmitting}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                >
                  {scheduleSubmitting ? "Scheduling..." : "Schedule Class"}
                </button>
              </div>
            </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: Reschedule Class */}
      {rescheduleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Reschedule Class
                </h3>
                <p className="text-xs text-amber-700 font-medium mt-0.5">
                  Current: {rescheduleTarget.date} at{" "}
                  {rescheduleTarget.start_time?.substring(0, 5)}
                </p>
              </div>
              <button
                onClick={() => setRescheduleTarget(null)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
              <span className="font-bold text-slate-800 block">
                {rescheduleTarget.title}
              </span>
              <span className="text-slate-400">
                Cohort: {rescheduleTarget.batch_name}
              </span>
            </div>

            <form onSubmit={handleRescheduleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Date *
                </label>
                <input
                  required
                  type="date"
                  value={rescheduleForm.date}
                  onChange={(e) =>
                    setRescheduleForm({ ...rescheduleForm, date: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    New Start Time *
                  </label>
                  <input
                    required
                    type="time"
                    value={rescheduleForm.start_time}
                    onChange={(e) =>
                      setRescheduleForm({
                        ...rescheduleForm,
                        start_time: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    New End Time *
                  </label>
                  <input
                    required
                    type="time"
                    value={rescheduleForm.end_time}
                    onChange={(e) =>
                      setRescheduleForm({
                        ...rescheduleForm,
                        end_time: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Rescheduling *
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Instructor emergency, lab maintenance, holiday"
                  value={rescheduleForm.reason}
                  onChange={(e) =>
                    setRescheduleForm({
                      ...rescheduleForm,
                      reason: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Updated Room / Meeting Link (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Room 201 or meeting URL"
                  value={rescheduleForm.meeting_link || rescheduleForm.room || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.includes("http") || val.includes(".com")) {
                      setRescheduleForm({
                        ...rescheduleForm,
                        meeting_link: val,
                      });
                    } else {
                      setRescheduleForm({ ...rescheduleForm, room: val });
                    }
                  }}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRescheduleTarget(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rescheduleSubmitting}
                  className="rounded-xl bg-amber-600 px-5 py-2 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50 cursor-pointer"
                >
                  {rescheduleSubmitting ? "Updating..." : "Confirm Reschedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

