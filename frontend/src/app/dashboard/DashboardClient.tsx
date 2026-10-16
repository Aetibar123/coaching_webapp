"use client";

import { useState } from "react";
import { api, type Batch, type Student } from "@/lib/api";
import Link from "next/link";

interface DashboardClientProps {
  initialBatches: Batch[];
  initialStudents: Student[];
  userName: string;
}

export function DashboardClient({
  initialBatches,
  initialStudents,
  userName,
}: DashboardClientProps) {
  const [batches, setBatches] = useState<Batch[]>(initialBatches);
  const [students, setStudents] = useState<Student[]>(initialStudents);

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
      {/* Welcome Hero Banner with Quick Actions */}
      <div className="rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 p-8 text-white shadow-xl shadow-blue-500/10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-blue-500/30 px-3 py-1 text-xs font-semibold text-blue-100 backdrop-blur-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Live Institute Console
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight">
              Welcome back, {userName}!
            </h2>
            <p className="text-sm text-blue-100/90 max-w-xl">
              Manage your cohorts, student directory, and instant session
              attendance from this command center.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsBatchModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-blue-700 shadow-sm hover:bg-blue-50 transition-all cursor-pointer"
            >
              <span>+</span> New Batch
            </button>
            <button
              onClick={() => setIsStudentModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-500/30 px-4 py-2.5 text-xs font-bold text-white border border-blue-400/40 hover:bg-blue-500/50 transition-all cursor-pointer"
            >
              <span>+</span> Register Student
            </button>
            <Link
              href="/attendance"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-500/40 px-4 py-2.5 text-xs font-bold text-white border border-indigo-400/40 hover:bg-indigo-500/60 transition-all"
            >
              <span>📅</span> Take Attendance
            </Link>
          </div>
        </div>
      </div>

      {/* Top Stat Counters */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Students
            </p>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 font-bold">
              🎓
            </span>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-slate-900">
            {students.length}
          </p>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-slate-400">Registered in system</span>
            <Link
              href="/students"
              className="font-semibold text-blue-600 hover:text-blue-800"
            >
              Manage →
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Batches
            </p>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 font-bold">
              📚
            </span>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-slate-900">
            {batches.length}
          </p>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-slate-400">Across all courses</span>
            <Link
              href="/batches"
              className="font-semibold text-indigo-600 hover:text-indigo-800"
            >
              View →
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active Batches
            </p>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 font-bold">
              ⚡
            </span>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-emerald-600">
            {activeBatches.length}
          </p>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-slate-400">Currently in session</span>
            <span className="font-semibold text-emerald-600">
              {batches.length > 0
                ? `${Math.round((activeBatches.length / batches.length) * 100)}% active`
                : "0%"}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Attendance Module
            </p>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 font-bold">
              ✅
            </span>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-purple-600">Active</p>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-slate-400">Bulk .map() insert</span>
            <Link
              href="/attendance"
              className="font-semibold text-purple-600 hover:text-purple-800"
            >
              Start →
            </Link>
          </div>
        </div>
      </div>

      {/* Main Panels Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 spans): Active Batches */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">
              Active Batches & Cohorts
            </h3>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsBatchModalOpen(true)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
              >
                + Add Batch
              </button>
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
    </div>
  );
}

