"use client";

import { useState } from "react";
import {
  api,
  type Batch,
  type Student,
  type ClassItem,
  type CreateClassInput,
  type RescheduleClassInput,
} from "@/lib/api";
import Link from "next/link";

interface DashboardClientProps {
  initialBatches: Batch[];
  initialStudents: Student[];
  initialClasses?: ClassItem[];
  userName: string;
  userRole?: string;
  userEmail?: string;
}

export function DashboardClient({
  initialBatches,
  initialStudents,
  initialClasses = [],
  userName,
  userRole,
  userEmail,
}: DashboardClientProps) {
  const [batches, setBatches] = useState<Batch[]>(initialBatches);
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [upcomingClasses, setUpcomingClasses] = useState<ClassItem[]>(initialClasses);

  const isTeacher = userRole === "teacher";

  // Class Scheduling & Rescheduling States
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [classSubmitting, setClassSubmitting] = useState(false);
  const [classForm, setClassForm] = useState<CreateClassInput>({
    batch_id: batches[0]?.id ? String(batches[0].id) : "",
    title: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
    start_time: "10:00",
    end_time: "11:30",
    room: "",
    meeting_link: "",
  });

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

  const [dashboardNotification, setDashboardNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Quick Create Batch Modal
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchForm, setBatchForm] = useState({
    name: "",
    course: "",
    instructor: "",
    capacity: 30,
    fee: 0,
    status: "active",
  });
  const [batchSubmitting, setBatchSubmitting] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);

  // Quick Add Student Modal
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [studentForm, setStudentForm] = useState({
    name: "",
    email: "",
    phone_number: "",
    age: "18",
    gender: "male",
    batch_id: "",
  });
  const [studentSubmitting, setStudentSubmitting] = useState(false);
  const [studentError, setStudentError] = useState<string | null>(null);

  const activeBatches = batches.filter((b) => b.status === "active");

  const todayStr = new Date().toISOString().split("T")[0];
  const todayClassesCount = upcomingClasses.filter((c) => c.date === todayStr).length;

  const handleScheduleClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classForm.batch_id || !classForm.title || !classForm.date) return;
    setClassSubmitting(true);
    setDashboardNotification(null);

    try {
      const created = await api.classes.create({
        ...classForm,
        title: classForm.title.trim(),
        description: classForm.description?.trim() || undefined,
        room: classForm.room?.trim() || undefined,
        meeting_link: classForm.meeting_link?.trim() || undefined,
      });

      if (created) {
        setUpcomingClasses((prev) => [created, ...prev]);
        setDashboardNotification({
          type: "success",
          message: `Class "${created.title}" scheduled successfully for ${created.date}!`,
        });
        setIsClassModalOpen(false);
        setClassForm({
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
      setDashboardNotification({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to schedule class",
      });
    } finally {
      setClassSubmitting(false);
    }
  };

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

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleTarget) return;
    setRescheduleSubmitting(true);
    setDashboardNotification(null);

    try {
      const updated = await api.classes.reschedule(rescheduleTarget.id, {
        date: rescheduleForm.date,
        start_time: rescheduleForm.start_time,
        end_time: rescheduleForm.end_time,
        reason: rescheduleForm.reason?.trim() || "Rescheduled by instructor",
        room: rescheduleForm.room?.trim() || undefined,
        meeting_link: rescheduleForm.meeting_link?.trim() || undefined,
      });

      if (updated) {
        setUpcomingClasses((prev) =>
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
        setDashboardNotification({
          type: "success",
          message: `Class rescheduled to ${rescheduleForm.date} at ${rescheduleForm.start_time}!`,
        });
        setRescheduleTarget(null);
      }
    } catch (err) {
      setDashboardNotification({
        type: "error",
        message:
          err instanceof Error ? err.message : "Failed to reschedule class",
      });
    } finally {
      setRescheduleSubmitting(false);
    }
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setBatchError(null);
    setBatchSubmitting(true);

    try {
      const created = await api.batches.create({
        name: batchForm.name,
        course: batchForm.course,
        instructor: batchForm.instructor || undefined,
        capacity: Number(batchForm.capacity) || 30,
        fee: Number(batchForm.fee) || 0,
        status: batchForm.status || "active",
      });

      if (created) {
        setBatches([created, ...batches]);
      }
      setIsBatchModalOpen(false);
      setBatchForm({
        name: "",
        course: "",
        instructor: "",
        capacity: 30,
        fee: 0,
        status: "active",
      });
    } catch (err: unknown) {
      setBatchError(
        err instanceof Error ? err.message : "Failed to create batch"
      );
    } finally {
      setBatchSubmitting(false);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setStudentError(null);
    setStudentSubmitting(true);

    try {
      const created = await api.students.create({
        name: studentForm.name,
        email: studentForm.email,
        phone_number: Number(studentForm.phone_number),
        age: Number(studentForm.age),
        gender: studentForm.gender,
        batch_id: studentForm.batch_id || undefined,
      });

      if (created) {
        setStudents([created, ...students]);
      }
      setIsStudentModalOpen(false);
      setStudentForm({
        name: "",
        email: "",
        phone_number: "",
        age: "18",
        gender: "male",
        batch_id: "",
      });
    } catch (err: unknown) {
      setStudentError(
        err instanceof Error ? err.message : "Failed to register student"
      );
    } finally {
      setStudentSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Notification Banner */}
      {dashboardNotification && (
        <div
          className={`rounded-2xl p-4 text-sm font-medium flex items-center justify-between border ${
            dashboardNotification.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-red-50 text-red-800 border-red-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{dashboardNotification.type === "success" ? "✓" : "⚠️"}</span>
            <span>{dashboardNotification.message}</span>
          </div>
          <button
            onClick={() => setDashboardNotification(null)}
            className="text-xs font-bold underline opacity-70 hover:opacity-100 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Welcome Hero Banner with Quick Actions (Home Page Signature Dark Bento) */}
      <div className="rounded-3xl bg-slate-950 p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-800/80">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.3),rgba(255,255,255,0))]" />

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/80 px-3.5 py-1 text-xs font-mono font-medium text-slate-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{isTeacher ? "FACULTY // CONSOLE" : "v2.4 // OPERATIONAL CONSOLE"}</span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400 font-normal">Active Session</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Welcome back,{" "}
              <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-white bg-clip-text text-transparent">
                {userName}!
              </span>
            </h2>

            <p className="text-xs sm:text-sm text-slate-400 max-w-xl font-normal leading-relaxed">
              {isTeacher
                ? "Manage your assigned cohorts, schedule upcoming lectures, and conduct instant student assessments with database precision."
                : "Orchestrate your course batches, student directory, class schedule, and track attendance with sub-millisecond reliability."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Show New Batch and Register Student ONLY for Admin */}
            {!isTeacher && (
              <>
                <button
                  onClick={() => setIsBatchModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-slate-950 shadow-md hover:bg-slate-100 transition-all cursor-pointer"
                >
                  <span>+</span> New Batch
                </button>
                <button
                  onClick={() => setIsStudentModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-all cursor-pointer"
                >
                  <span>+</span> Register Student
                </button>
              </>
            )}

            {/* Class Schedule Quick Action for Both Admin & Teacher */}
            <button
              onClick={() => setIsClassModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-500 transition-all cursor-pointer"
            >
              <span>+</span> Schedule Class
            </button>

            <Link
              href="/attendance"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-all"
            >
              <span>📅</span> Take Attendance
            </Link>

            <Link
              href="/classes"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-all"
            >
              <span>🗓️</span> Class Schedule →
            </Link>

            <Link
              href="/assignments"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-all"
            >
              <span>📝</span> MCQs →
            </Link>
          </div>
        </div>
      </div>

      {/* Top Stat Counters (Bento Grid) */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Students */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
              [ 01 ROSTER ]
            </span>
            <span className="rounded-lg bg-blue-50 px-2 py-0.5 text-[10px] font-mono font-bold text-blue-700">
              STUDENTS
            </span>
          </div>
          <div className="my-3">
            <p className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-950 font-mono">
              {students.length}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {isTeacher ? "Enrolled in your cohorts" : "Total registered students"}
            </p>
          </div>
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-400 font-mono">Active Directory</span>
            <Link
              href="/students"
              className="font-bold text-blue-600 hover:text-blue-800"
            >
              View Directory →
            </Link>
          </div>
        </div>

        {/* Card 2: Batches */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
              [ 02 COHORTS ]
            </span>
            <span className="rounded-lg bg-indigo-50 px-2 py-0.5 text-[10px] font-mono font-bold text-indigo-700">
              BATCHES
            </span>
          </div>
          <div className="my-3">
            <p className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-950 font-mono">
              {batches.length}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {isTeacher ? "Assigned to your care" : "Active courses & batches"}
            </p>
          </div>
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-400 font-mono">Capacity Guard On</span>
            <Link
              href="/batches"
              className="font-bold text-indigo-600 hover:text-indigo-800"
            >
              View Batches →
            </Link>
          </div>
        </div>

        {/* Card 3: Today's Classes */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
              [ 03 SCHEDULE ]
            </span>
            <span className="rounded-lg bg-amber-50 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-700">
              TODAY
            </span>
          </div>
          <div className="my-3">
            <p className="text-3xl sm:text-4xl font-extrabold tracking-tight text-amber-600 font-mono">
              {todayClassesCount}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Lectures scheduled today
            </p>
          </div>
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-400 font-mono">Reschedule Enabled</span>
            <Link
              href="/classes"
              className="font-bold text-amber-600 hover:text-amber-800"
            >
              Manage Schedule →
            </Link>
          </div>
        </div>

        {/* Card 4: Active Batches */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
              [ 04 ATTENDANCE ]
            </span>
            <span className="rounded-lg bg-emerald-50 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-700">
              SESSIONS
            </span>
          </div>
          <div className="my-3">
            <p className="text-3xl sm:text-4xl font-extrabold tracking-tight text-emerald-600 font-mono">
              {activeBatches.length}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Cohorts currently running
            </p>
          </div>
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-400 font-mono">Bulk Sync Ready</span>
            <Link
              href="/attendance"
              className="font-bold text-emerald-600 hover:text-emerald-800"
            >
              Log Attendance →
            </Link>
          </div>
        </div>
      </div>

      {/* Upcoming Class Schedule & Reschedule Hub */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🗓️</span>
              <h3 className="text-lg font-bold text-slate-900">
                {isTeacher
                  ? "My Class Schedule & Sessions"
                  : "Upcoming Class Schedule"}
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live upcoming sessions across cohorts. Reschedule dates or update rooms with one click.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsClassModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
            >
              <span>+</span> Schedule Class
            </button>
            <Link
              href="/classes"
              className="text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Full Calendar ({upcomingClasses.length}) →
            </Link>
          </div>
        </div>

        {upcomingClasses.length === 0 ? (
          <div className="py-10 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200">
            <span className="text-3xl">☕</span>
            <p className="mt-2 text-xs font-semibold text-slate-700">
              No classes scheduled yet
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Schedule your first lecture or session to keep students informed.
            </p>
            <button
              onClick={() => setIsClassModalOpen(true)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 cursor-pointer"
            >
              <span>+</span> Schedule a Class
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingClasses.slice(0, 3).map((cls) => {
              const isRescheduled = cls.status === "rescheduled";
              return (
                <div
                  key={cls.id}
                  className={`rounded-2xl border p-4.5 flex flex-col justify-between transition-all ${
                    isRescheduled
                      ? "border-amber-200 bg-amber-50/20 shadow-xs"
                      : "border-slate-200 bg-white shadow-xs hover:shadow-sm"
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                        {cls.batch_name || "Batch"}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          isRescheduled
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {cls.status}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 leading-snug">
                      {cls.title}
                    </h4>

                    {isRescheduled && (
                      <div className="rounded-lg bg-amber-50 border border-amber-200/80 p-2 text-[11px] text-amber-800">
                        <span className="font-semibold block">
                          ⚠️ Rescheduled Session
                        </span>
                        {cls.reschedule_reason && (
                          <span className="text-amber-900">
                            Reason: {cls.reschedule_reason}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="space-y-1 text-xs text-slate-600 pt-1">
                      <div className="flex items-center gap-2">
                        <span>📅</span>
                        <span className="font-semibold text-slate-800">
                          {cls.date}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>⏰</span>
                        <span>
                          {cls.start_time?.substring(0, 5)} –{" "}
                          {cls.end_time?.substring(0, 5)}
                        </span>
                      </div>
                      {cls.room && (
                        <div className="flex items-center gap-2">
                          <span>📍</span>
                          <span>Room: {cls.room}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <button
                      onClick={() => openRescheduleModal(cls)}
                      className="font-semibold text-amber-600 hover:text-amber-800 cursor-pointer"
                    >
                      Reschedule ↻
                    </button>
                    {cls.meeting_link ? (
                      <a
                        href={
                          cls.meeting_link.startsWith("http")
                            ? cls.meeting_link
                            : `https://${cls.meeting_link}`
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-blue-600 hover:text-blue-800"
                      >
                        Join Class ↗
                      </a>
                    ) : (
                      <Link
                        href={`/attendance?batch=${cls.batch_id}&date=${cls.date}`}
                        className="font-semibold text-slate-500 hover:text-slate-800"
                      >
                        Attendance →
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Panels Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 spans): Active Batches */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">
              {isTeacher
                ? "My Assigned Batches & Cohorts"
                : "Active Batches & Cohorts"}
            </h3>
            <div className="flex items-center gap-3">
              {!isTeacher && (
                <button
                  onClick={() => setIsBatchModalOpen(true)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                >
                  + Add Batch
                </button>
              )}
              <Link
                href="/batches"
                className="text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                View all ({batches.length}) →
              </Link>
            </div>
          </div>

          {batches.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <span className="text-4xl">📚</span>
              <h4 className="mt-3 text-base font-semibold text-slate-800">
                No batches created yet
              </h4>
              <p className="mt-1 text-sm text-slate-500">
                Start by creating your first course cohort.
              </p>
              <button
                onClick={() => setIsBatchModalOpen(true)}
                className="mt-4 inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"
              >
                Create Batch
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {batches.slice(0, 4).map((b) => (
                <div
                  key={b.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                        {b.course}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${
                          b.status === "active"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {b.status || "active"}
                      </span>
                    </div>

                    <h4 className="mt-3 text-base font-bold text-slate-900">
                      {b.name}
                    </h4>

                    <div className="mt-3 text-xs text-slate-500 space-y-1">
                      {b.instructor && (
                        <p>
                          <span className="text-slate-400">Instructor:</span>{" "}
                          <span className="font-medium text-slate-700">
                            {b.instructor}
                          </span>
                        </p>
                      )}
                      <p>
                        <span className="text-slate-400">Capacity:</span>{" "}
                        <span className="font-medium text-slate-700">
                          {b.capacity || "Unlimited"} seats
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <Link
                      href={`/attendance?batch=${b.id}`}
                      className="font-semibold text-blue-600 hover:text-blue-800"
                    >
                      Take Attendance →
                    </Link>
                    <Link
                      href="/batches"
                      className="text-slate-500 hover:text-slate-700"
                    >
                      Manage
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column (1 span): Recent Students Roster Panel */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">
              Students Roster
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsStudentModalOpen(true)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
              >
                + Register
              </button>
              <Link
                href="/students"
                className="text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                View all →
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            {students.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No students enrolled yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {students.slice(0, 6).map((student) => (
                  <div
                    key={student.id}
                    className="py-3 first:pt-0 last:pb-0 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {student.name}
                      </p>
                      <p className="text-xs text-slate-400">{student.email}</p>
                    </div>
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                      Age {student.age}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-slate-100 text-center">
              <Link
                href="/students"
                className="text-xs font-semibold text-blue-600 hover:text-blue-800"
              >
                Open Full Student Directory ({students.length}) →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Create Batch Modal */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900">
                Create New Batch
              </h3>
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {batchError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {batchError}
              </div>
            )}

            <form onSubmit={handleCreateBatch} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Batch Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mathematics JEE 2026"
                  value={batchForm.name}
                  onChange={(e) =>
                    setBatchForm({ ...batchForm, name: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Course *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mathematics"
                    value={batchForm.course}
                    onChange={(e) =>
                      setBatchForm({ ...batchForm, course: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Instructor
                  </label>
                  <input
                    type="text"
                    placeholder="Instructor Name"
                    value={batchForm.instructor}
                    onChange={(e) =>
                      setBatchForm({ ...batchForm, instructor: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Max Capacity
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={batchForm.capacity}
                    onChange={(e) =>
                      setBatchForm({
                        ...batchForm,
                        capacity: Number(e.target.value),
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Status
                  </label>
                  <select
                    value={batchForm.status}
                    onChange={(e) =>
                      setBatchForm({ ...batchForm, status: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={batchSubmitting}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                >
                  {batchSubmitting ? "Creating..." : "Save Batch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Add Student Modal */}
      {isStudentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900">
                Register New Student
              </h3>
              <button
                onClick={() => setIsStudentModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {studentError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {studentError}
              </div>
            )}

            <form onSubmit={handleAddStudent} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Student's name"
                  value={studentForm.name}
                  onChange={(e) =>
                    setStudentForm({ ...studentForm, name: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="student@example.com"
                  value={studentForm.email}
                  onChange={(e) =>
                    setStudentForm({ ...studentForm, email: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Phone *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="9876543210"
                    value={studentForm.phone_number}
                    onChange={(e) =>
                      setStudentForm({
                        ...studentForm,
                        phone_number: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Age *
                  </label>
                  <input
                    type="number"
                    required
                    min={5}
                    value={studentForm.age}
                    onChange={(e) =>
                      setStudentForm({ ...studentForm, age: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Gender *
                  </label>
                  <select
                    value={studentForm.gender}
                    onChange={(e) =>
                      setStudentForm({ ...studentForm, gender: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Assign Batch
                  </label>
                  <select
                    value={studentForm.batch_id}
                    onChange={(e) =>
                      setStudentForm({
                        ...studentForm,
                        batch_id: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">No Batch</option>
                    {batches.map((b) => (
                      <option key={b.id} value={String(b.id)}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsStudentModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={studentSubmitting}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                >
                  {studentSubmitting ? "Registering..." : "Save Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Class Modal */}
      {isClassModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Schedule New Class Session
                </h3>
                <p className="text-xs text-slate-400">
                  Add a lecture, lab, or webinar to the cohort schedule.
                </p>
              </div>
              <button
                onClick={() => setIsClassModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleScheduleClass} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Cohort / Batch *
                </label>
                <select
                  required
                  value={classForm.batch_id}
                  onChange={(e) =>
                    setClassForm({ ...classForm, batch_id: e.target.value })
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
                  value={classForm.title}
                  onChange={(e) =>
                    setClassForm({ ...classForm, title: e.target.value })
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
                    value={classForm.date}
                    onChange={(e) =>
                      setClassForm({ ...classForm, date: e.target.value })
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
                    value={classForm.start_time}
                    onChange={(e) =>
                      setClassForm({
                        ...classForm,
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
                    value={classForm.end_time}
                    onChange={(e) =>
                      setClassForm({ ...classForm, end_time: e.target.value })
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
                    value={classForm.room}
                    onChange={(e) =>
                      setClassForm({ ...classForm, room: e.target.value })
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
                    value={classForm.meeting_link}
                    onChange={(e) =>
                      setClassForm({
                        ...classForm,
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
                  value={classForm.description}
                  onChange={(e) =>
                    setClassForm({
                      ...classForm,
                      description: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsClassModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={classSubmitting}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                >
                  {classSubmitting ? "Scheduling..." : "Schedule Class"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reschedule Class Modal */}
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
                    setRescheduleForm({
                      ...rescheduleForm,
                      date: e.target.value,
                    })
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
                  value={
                    rescheduleForm.meeting_link || rescheduleForm.room || ""
                  }
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
                  {rescheduleSubmitting
                    ? "Updating..."
                    : "Confirm Reschedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

