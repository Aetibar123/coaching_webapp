"use client";

import { useState } from "react";
import { api, type Teacher, type Batch } from "@/lib/api";

interface TeachersClientProps {
  initialTeachers: Teacher[];
  allBatches: Batch[];
}

export function TeachersClient({
  initialTeachers,
  allBatches,
}: TeachersClientProps) {
  const [teachers, setTeachers] = useState<Teacher[]>(initialTeachers);
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");

  // Create/Edit Teacher Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    bio: "",
  });

  // Assign Batches Modal State
  const [assigningTeacher, setAssigningTeacher] = useState<Teacher | null>(null);
  const [selectedBatchIds, setSelectedBatchIds] = useState<(string | number)[]>(
    []
  );
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  // Extract distinct subjects for filtering
  const distinctSubjects = Array.from(
    new Set(teachers.map((t) => t.subject).filter(Boolean))
  ) as string[];

  const filteredTeachers = teachers.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase()) ||
      (t.subject && t.subject.toLowerCase().includes(search.toLowerCase()));

    const matchesSubject =
      subjectFilter === "all" || t.subject === subjectFilter;

    return matchesSearch && matchesSubject;
  });

  const openCreateModal = () => {
    setEditingTeacher(null);
    setFormData({
      name: "",
      email: "",
      phone: "",
      subject: "",
      bio: "",
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditModal = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setFormData({
      name: teacher.name,
      email: teacher.email,
      phone: teacher.phone || "",
      subject: teacher.subject || "",
      bio: teacher.bio || "",
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      if (editingTeacher) {
        const updated = await api.teachers.update(editingTeacher.id, formData);
        if (updated) {
          setTeachers((prev) =>
            prev.map((t) =>
              t.id === editingTeacher.id
                ? { ...t, ...updated, batches: t.batches }
                : t
            )
          );
        }
      } else {
        const created = await api.teachers.create(formData);
        if (created) {
          setTeachers((prev) => [
            { ...created, batches: [] },
            ...prev,
          ]);
        }
      }
      setIsFormOpen(false);
    } catch (err: unknown) {
      setFormError(
        err instanceof Error ? err.message : "Failed to save teacher profile"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTeacher = async (teacherId: string) => {
    if (
      !confirm(
        "Are you sure you want to remove this faculty member? Assigned batches will be unassigned."
      )
    ) {
      return;
    }

    try {
      await api.teachers.delete(teacherId);
      setTeachers((prev) => prev.filter((t) => t.id !== teacherId));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete teacher");
    }
  };

  const openAssignModal = (teacher: Teacher) => {
    setAssigningTeacher(teacher);
    const currentlyAssignedIds = (teacher.batches || []).map((b) => b.id);
    setSelectedBatchIds(currentlyAssignedIds);
    setAssignError(null);
  };

  const toggleBatchSelection = (batchId: string | number) => {
    setSelectedBatchIds((prev) =>
      prev.includes(batchId)
        ? prev.filter((id) => id !== batchId)
        : [...prev, batchId]
    );
  };

  const handleSaveAssignments = async () => {
    if (!assigningTeacher) return;
    setIsAssigning(true);
    setAssignError(null);

    try {
      const updatedTeacher = await api.teachers.assignBatches(
        assigningTeacher.id,
        selectedBatchIds
      );

      if (updatedTeacher) {
        setTeachers((prev) =>
          prev.map((t) => (t.id === assigningTeacher.id ? updatedTeacher : t))
        );
      }
      setAssigningTeacher(null);
    } catch (err: unknown) {
      setAssignError(
        err instanceof Error ? err.message : "Failed to assign batches"
      );
    } finally {
      setIsAssigning(false);
    }
  };

  const totalBatchesAssigned = teachers.reduce((acc, t) => acc + (t.batches?.length || 0), 0);

  return (
    <div className="space-y-6">
      {/* Hero Banner (Home Page Signature Dark Bento) */}
      <div className="rounded-3xl bg-slate-950 p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-800/80">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.3),rgba(255,255,255,0))]" />

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/80 px-3.5 py-1 text-xs font-mono font-medium text-slate-300">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span>[ 07 FACULTY // DIRECTORY ]</span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400 font-normal">Admin Security Module</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Faculty Directory &{" "}
              <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-white bg-clip-text text-transparent">
                Batch Allocation
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-400 max-w-xl font-normal leading-relaxed">
              Register teachers, allocate batch responsibilities, and oversee cohort instructors with role-scoped security.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-bold text-slate-950 shadow-md hover:bg-slate-100 transition-all cursor-pointer"
            >
              <span>+</span> Add Teacher
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs text-center">
          <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 font-mono">
            {teachers.length}
          </p>
          <p className="mt-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
            Total Instructors
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs text-center">
          <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-blue-600 font-mono">
            {totalBatchesAssigned}
          </p>
          <p className="mt-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
            Allocated Batches
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs text-center">
          <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-purple-600 font-mono">
            {distinctSubjects.length}
          </p>
          <p className="mt-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
            Academic Subjects
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs text-center">
          <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-emerald-600 font-mono">
            {allBatches.length}
          </p>
          <p className="mt-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
            Total Batches
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3.5 rounded-2xl border border-slate-200">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            placeholder="Search by teacher name, email, or subject..."
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
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="w-full sm:w-auto rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Subjects</option>
            {distinctSubjects.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Teachers Grid */}
      {filteredTeachers.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
          <span className="text-4xl">👨‍🏫</span>
          <h3 className="mt-2 text-base font-semibold text-slate-800">
            No teachers found
          </h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            Get started by adding your coaching institute&apos;s teachers and assigning them to batches.
          </p>
          <button
            onClick={openCreateModal}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-all cursor-pointer"
          >
            + Add First Teacher
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTeachers.map((teacher) => {
            const initial = teacher.name.charAt(0).toUpperCase() || "T";
            const assignedCount = teacher.batches?.length ?? 0;

            return (
              <div
                key={teacher.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-slate-300 hover:shadow-md transition-all"
              >
                <div>
                  {/* Card Header: Avatar & Info */}
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-base font-bold text-white shadow-sm">
                      {initial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold text-slate-900 text-sm">
                        {teacher.name}
                      </h3>
                      <p className="truncate text-xs text-slate-500">
                        {teacher.email}
                      </p>
                      {teacher.subject && (
                        <span className="mt-1.5 inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 ring-1 ring-inset ring-blue-700/10">
                          {teacher.subject}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Contact details */}
                  {teacher.phone && (
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                      <svg
                        className="h-3.5 w-3.5 text-slate-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                        />
                      </svg>
                      <span>{teacher.phone}</span>
                    </div>
                  )}

                  {/* Assigned Batches Section */}
                  <div className="mt-4 pt-3.5 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Assigned Cohorts ({assignedCount})
                      </span>
                    </div>

                    {assignedCount === 0 ? (
                      <p className="text-xs text-slate-400 italic">
                        No batches currently assigned.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {teacher.batches?.map((batch) => (
                          <span
                            key={batch.id}
                            className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            {batch.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
                  <button
                    onClick={() => openAssignModal(teacher)}
                    className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
                  >
                    <span>⚡</span> Assign Batches
                  </button>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => openEditModal(teacher)}
                      className="text-slate-600 hover:text-slate-900 cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteTeacher(teacher.id)}
                      className="text-red-500 hover:text-red-700 cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Teacher Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900">
                {editingTeacher ? "Edit Teacher Profile" : "Register New Teacher"}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Rajesh Sharma"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="teacher@coaching.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  When the teacher logs in with this email, they will automatically see their assigned batches.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Subject / Department
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mathematics"
                    value={formData.subject}
                    onChange={(e) =>
                      setFormData({ ...formData, subject: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Bio / Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Specialization, years of coaching experience, etc."
                  value={formData.bio}
                  onChange={(e) =>
                    setFormData({ ...formData, bio: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting
                    ? "Saving..."
                    : editingTeacher
                    ? "Update Teacher"
                    : "Add Teacher"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Batches Modal */}
      {assigningTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Assign Batches
                </h3>
                <p className="text-xs text-slate-500">
                  Select cohorts taught by{" "}
                  <span className="font-semibold text-slate-800">
                    {assigningTeacher.name}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setAssigningTeacher(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {assignError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {assignError}
              </div>
            )}

            {/* Batch Selection Checklist */}
            <div className="mt-4 flex-1 overflow-y-auto space-y-2 pr-1">
              {allBatches.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-400">
                  No batches have been created in the system yet.
                </p>
              ) : (
                allBatches.map((batch) => {
                  const isSelected = selectedBatchIds.includes(batch.id);
                  return (
                    <div
                      key={batch.id}
                      onClick={() => toggleBatchSelection(batch.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? "border-blue-500 bg-blue-50/40 shadow-xs"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}} // handled by parent div
                          className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <p className="text-xs font-semibold text-slate-900">
                            {batch.name}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Course: {batch.course} • Capacity: {batch.capacity || "N/A"}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          batch.status === "active"
                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {batch.status || "active"}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
              <span className="text-xs text-slate-500 font-medium">
                {selectedBatchIds.length} batch(es) selected
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAssigningTeacher(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveAssignments}
                  disabled={isAssigning}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                >
                  {isAssigning ? "Saving..." : "Save Assignments"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

