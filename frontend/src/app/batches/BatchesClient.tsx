"use client";

import { useState } from "react";
import { api, type Batch, type Student, type BatchStats, type Teacher } from "@/lib/api";
import Link from "next/link";

interface BatchesClientProps {
  initialBatches: Batch[];
  allStudents: Student[];
  allTeachers?: Teacher[];
  userRole?: string;
  userEmail?: string;
}

export function BatchesClient({
  initialBatches,
  allStudents,
  allTeachers = [],
  userRole,
}: BatchesClientProps) {
  const isAdmin = userRole?.toLowerCase() === "admin";
  const [batches, setBatches] = useState<Batch[]>(initialBatches);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Create Batch Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [newBatch, setNewBatch] = useState({
    name: "",
    course: "",
    description: "",
    instructor: "",
    teacher_id: "",
    capacity: 30,
    fee: 0,
    start_date: "",
    end_date: "",
    status: "active",
  });

  // Batch Detail / Enrolled Students Modal
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [batchStudents, setBatchStudents] = useState<Student[]>([]);
  const [batchStats, setBatchStats] = useState<BatchStats | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [assignStudentId, setAssignStudentId] = useState("");
  const [assignError, setAssignError] = useState<string | null>(null);

  const filteredBatches = batches.filter((b) => {
    const matchesSearch =
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.course.toLowerCase().includes(search.toLowerCase()) ||
      (b.instructor &&
        b.instructor.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus =
      statusFilter === "all" || b.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const created = await api.batches.create({
        name: newBatch.name,
        course: newBatch.course,
        description: newBatch.description || undefined,
        instructor: newBatch.instructor || undefined,
        teacher_id: newBatch.teacher_id || undefined,
        capacity: Number(newBatch.capacity) || 30,
        fee: Number(newBatch.fee) || 0,
        start_date: newBatch.start_date || undefined,
        end_date: newBatch.end_date || undefined,
        status: newBatch.status || "active",
      });

      if (created) {
        setBatches([created, ...batches]);
      }
      setIsCreateOpen(false);
      setNewBatch({
        name: "",
        course: "",
        description: "",
        instructor: "",
        teacher_id: "",
        capacity: 30,
        fee: 0,
        start_date: "",
        end_date: "",
        status: "active",
      });
    } catch (err: unknown) {
      setFormError(
        err instanceof Error ? err.message : "Failed to create batch"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewDetails = async (batch: Batch) => {
    setSelectedBatch(batch);
    setLoadingDetails(true);
    setAssignError(null);

    try {
      const [students, stats] = await Promise.all([
        api.batches.getStudents(batch.id),
        api.batches.getStats(batch.id),
      ]);
      setBatchStudents(students);
      setBatchStats(stats ?? null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleAssignStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch || !assignStudentId) return;
    setAssignError(null);

    try {
      await api.batches.assignStudent(selectedBatch.id, assignStudentId);
      // Reload students and stats
      const [updatedStudents, updatedStats] = await Promise.all([
        api.batches.getStudents(selectedBatch.id),
        api.batches.getStats(selectedBatch.id),
      ]);
      setBatchStudents(updatedStudents);
      setBatchStats(updatedStats ?? null);
      setAssignStudentId("");
    } catch (err: unknown) {
      setAssignError(
        err instanceof Error ? err.message : "Failed to assign student"
      );
    }
  };

  const handleRemoveStudent = async (studentId: string | number) => {
    if (!selectedBatch) return;
    if (
      !confirm(
        "Are you sure you want to remove this student from the batch?"
      )
    )
      return;

    try {
      await api.batches.removeStudent(selectedBatch.id, studentId);
      const [updatedStudents, updatedStats] = await Promise.all([
        api.batches.getStudents(selectedBatch.id),
        api.batches.getStats(selectedBatch.id),
      ]);
      setBatchStudents(updatedStudents);
      setBatchStats(updatedStats ?? null);
    } catch (err: unknown) {
      alert(
        err instanceof Error ? err.message : "Failed to remove student"
      );
    }
  };

  const handleDeleteBatch = async (batchId: string | number) => {
    if (!confirm("Are you sure you want to delete this batch?")) return;

    try {
      await api.batches.delete(batchId);
      setBatches(batches.filter((b) => b.id !== batchId));
      if (selectedBatch?.id === batchId) setSelectedBatch(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete batch");
    }
  };

  // Available students not already in this batch
  const availableStudents = allStudents.filter(
    (s) => !batchStudents.some((bs) => bs.id === s.id)
  );

  const totalCapacity = batches.reduce((sum, b) => sum + (Number(b.capacity) || 0), 0);
  const activeBatchesCount = batches.filter((b) => b.status === "active").length;

  return (
    <div className="space-y-6">
      {/* Hero Banner (Home Page Signature Dark Bento) */}
      <div className="rounded-3xl bg-slate-950 p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-800/80">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.3),rgba(255,255,255,0))]" />

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/80 px-3.5 py-1 text-xs font-mono font-medium text-slate-300">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span>[ 01 ARCHITECTURE // COHORTS ]</span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400 font-normal">Capacity Guard Engine</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Course Cohorts &{" "}
              <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-white bg-clip-text text-transparent">
                Batch Registry
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-400 max-w-xl font-normal leading-relaxed">
              {isAdmin
                ? "Physical classrooms have hard seating limits. CoachingHub enforces batch capacity at the service layer, preventing accidental over-enrollment."
                : "You are viewing your assigned teaching batches. Review student enrollments and manage class schedules."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {isAdmin && (
              <button
                onClick={() => setIsCreateOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-slate-950 shadow-md hover:bg-slate-100 transition-all cursor-pointer"
              >
                <span>+</span> New Batch
              </button>
            )}

            <Link
              href="/classes"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-all"
            >
              <span>🗓️</span> Class Schedule
            </Link>

            <Link
              href="/attendance"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-all"
            >
              <span>📅</span> Attendance
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs text-center">
          <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 font-mono">
            {batches.length}
          </p>
          <p className="mt-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
            Total Cohorts
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs text-center">
          <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-emerald-600 font-mono">
            {activeBatchesCount}
          </p>
          <p className="mt-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
            Active Batches
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs text-center">
          <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-blue-600 font-mono">
            {totalCapacity}
          </p>
          <p className="mt-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
            Total Seats
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs text-center">
          <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-purple-600 font-mono">
            {allStudents.length}
          </p>
          <p className="mt-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
            Enrolled Students
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3.5 rounded-2xl border border-slate-200">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            placeholder="Search by batch name, course, or instructor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
            className="w-full sm:w-auto rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="upcoming">Upcoming</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Batches Grid */}
      {filteredBatches.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <span className="text-4xl">🔍</span>
          <h3 className="mt-2 text-base font-semibold text-slate-800">
            No batches found
          </h3>
          <p className="text-sm text-slate-500">
            Try adjusting your search filters or create a new batch.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredBatches.map((batch) => (
            <div
              key={batch.id}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                    {batch.course}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${
                      batch.status === "active"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {batch.status || "active"}
                  </span>
                </div>

                <h3 className="mt-3 text-lg font-bold text-slate-900">
                  {batch.name}
                </h3>

                {batch.description && (
                  <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                    {batch.description}
                  </p>
                )}

                <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                  {batch.instructor && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Instructor:</span>
                      <span className="font-semibold text-slate-800">
                        {batch.instructor}
                      </span>
                    </div>
                  )}
                  {batch.capacity && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Capacity:</span>
                      <span className="font-semibold text-slate-800">
                        {batch.capacity} seats
                      </span>
                    </div>
                  )}
                  {batch.fee !== undefined && batch.fee > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Course Fee:</span>
                      <span className="font-semibold text-slate-800">
                        ₹{batch.fee.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
                <button
                  onClick={() => handleViewDetails(batch)}
                  className="text-blue-600 hover:text-blue-800 cursor-pointer"
                >
                  Manage Students →
                </button>

                <div className="flex items-center gap-3">
                  <Link
                    href={`/attendance?batch=${batch.id}`}
                    className="text-slate-600 hover:text-slate-900"
                  >
                    Attendance
                  </Link>
                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteBatch(batch.id)}
                      className="text-red-500 hover:text-red-700 cursor-pointer"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Batch Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900">
                Create New Batch
              </h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateBatch} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    Batch Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Physics JEE 2026 Batch A"
                    value={newBatch.name}
                    onChange={(e) =>
                      setNewBatch({ ...newBatch, name: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Course *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. JEE Physics"
                    value={newBatch.course}
                    onChange={(e) =>
                      setNewBatch({ ...newBatch, course: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Assigned Teacher / Instructor
                  </label>
                  {allTeachers && allTeachers.length > 0 ? (
                    <select
                      value={newBatch.teacher_id}
                      onChange={(e) => {
                        const tId = e.target.value;
                        const tObj = allTeachers.find((t) => t.id === tId);
                        setNewBatch({
                          ...newBatch,
                          teacher_id: tId,
                          instructor: tObj ? tObj.name : "",
                        });
                      }}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Faculty...</option>
                      {allTeachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.subject || t.email})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="Instructor Name"
                      value={newBatch.instructor}
                      onChange={(e) =>
                        setNewBatch({ ...newBatch, instructor: e.target.value })
                      }
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Capacity (Max Students)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={newBatch.capacity}
                    onChange={(e) =>
                      setNewBatch({
                        ...newBatch,
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
                    value={newBatch.status}
                    onChange={(e) =>
                      setNewBatch({ ...newBatch, status: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Short description of this batch schedule or syllabus"
                    value={newBatch.description}
                    onChange={(e) =>
                      setNewBatch({
                        ...newBatch,
                        description: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? "Creating..." : "Save Batch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Details & Student Enrollment Modal */}
      {selectedBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {selectedBatch.name}
                </h3>
                <p className="text-xs text-slate-500">
                  Course: {selectedBatch.course}
                </p>
              </div>
              <button
                onClick={() => setSelectedBatch(null)}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                ✕
              </button>
            </div>

            {/* Batch Statistics Bar */}
            {batchStats && (
              <div className="mt-4 grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl text-center">
                <div>
                  <p className="text-xs text-slate-400">Enrolled</p>
                  <p className="text-lg font-bold text-slate-800">
                    {batchStats.enrolledStudents}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Seats Available</p>
                  <p className="text-lg font-bold text-emerald-600">
                    {batchStats.availableSeats ?? "Unlimited"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Occupancy</p>
                  <p className="text-lg font-bold text-blue-600">
                    {batchStats.occupancyRate ?? "0%"}
                  </p>
                </div>
              </div>
            )}

            {/* Enroll New Student to this Batch */}
            <form
              onSubmit={handleAssignStudent}
              className="mt-4 p-3 bg-blue-50/50 border border-blue-100 rounded-xl flex items-center gap-2"
            >
              <select
                required
                value={assignStudentId}
                onChange={(e) => setAssignStudentId(e.target.value)}
                className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select student to enroll...</option>
                {availableStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.email})
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={!assignStudentId}
                className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
              >
                Enroll Student
              </button>
            </form>

            {assignError && (
              <p className="mt-2 text-xs text-red-600 font-medium">
                {assignError}
              </p>
            )}

            {/* Enrolled Students Table */}
            <div className="mt-4 flex-1 overflow-y-auto">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Enrolled Students ({batchStudents.length})
              </h4>

              {loadingDetails ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Loading students...
                </div>
              ) : batchStudents.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 border border-dashed rounded-xl">
                  No students assigned to this batch yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                  {batchStudents.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-3 hover:bg-slate-50 text-xs"
                    >
                      <div>
                        <p className="font-semibold text-slate-800">
                          {student.name}
                        </p>
                        <p className="text-slate-400">
                          {student.email} • Age {student.age}
                        </p>
                      </div>
                      {isAdmin && (
                        <button
                          onClick={() => handleRemoveStudent(student.id)}
                          className="text-red-500 hover:text-red-700 font-semibold cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedBatch(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

