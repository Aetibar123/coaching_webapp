"use client";

import { useState } from "react";
import { api, type Student, type Batch } from "@/lib/api";

interface StudentsClientProps {
  initialStudents: Student[];
  batches: Batch[];
  userRole?: string;
}

export function StudentsClient({
  initialStudents,
  batches,
  userRole,
}: StudentsClientProps) {
  const isAdmin = userRole?.toLowerCase() === "admin";
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [search, setSearch] = useState("");
  const [batchFilter, setBatchFilter] = useState("all");

  // Create Student Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone_number: "",
    age: "",
    gender: "male",
    batch_id: "",
  });

  const batchMap = new Map<string | number, string>();
  for (const b of batches) {
    batchMap.set(String(b.id), `${b.name} (${b.course})`);
  }

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase());

    const matchesBatch =
      batchFilter === "all" ||
      (batchFilter === "unassigned"
        ? !s.batch_id
        : String(s.batch_id) === batchFilter);

    return matchesSearch && matchesBatch;
  });

  const openCreateModal = () => {
    setEditingStudent(null);
    setFormData({
      name: "",
      email: "",
      phone_number: "",
      age: "18",
      gender: "male",
      batch_id: "",
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      name: student.name,
      email: student.email,
      phone_number: String(student.phone_number),
      age: String(student.age),
      gender: student.gender,
      batch_id: student.batch_id ? String(student.batch_id) : "",
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        phone_number: Number(formData.phone_number),
        age: Number(formData.age),
        gender: formData.gender,
        batch_id: formData.batch_id ? formData.batch_id : undefined,
      };

      if (editingStudent) {
        const updated = await api.students.update(
          editingStudent.id,
          payload
        );
        if (updated) {
          setStudents(
            students.map((s) => (s.id === editingStudent.id ? updated : s))
          );
        }
      } else {
        const created = await api.students.create(payload);
        if (created) {
          setStudents([created, ...students]);
        }
      }

      setIsModalOpen(false);
    } catch (err: unknown) {
      setFormError(
        err instanceof Error ? err.message : "Failed to save student"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (studentId: string | number) => {
    if (!confirm("Are you sure you want to delete this student?")) return;

    try {
      await api.students.delete(studentId);
      setStudents(students.filter((s) => s.id !== studentId));
    } catch (err: unknown) {
      alert(
        err instanceof Error ? err.message : "Failed to delete student"
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Student Directory
          </h2>
          <p className="text-sm text-slate-500">
            View, enroll, and manage student profiles and batch assignments.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-all cursor-pointer"
          >
            <span>+</span> Register Student
          </button>
        )}
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3.5 rounded-2xl border border-slate-200">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            placeholder="Search student by name or email..."
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
            value={batchFilter}
            onChange={(e) => setBatchFilter(e.target.value)}
            className="w-full sm:w-auto rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Batches</option>
            <option value="unassigned">Unassigned</option>
            {batches.map((b) => (
              <option key={b.id} value={String(b.id)}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Students Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        {filteredStudents.length === 0 ? (
          <div className="p-12 text-center">
            <span className="text-4xl">🎓</span>
            <h3 className="mt-2 text-base font-semibold text-slate-800">
              No students found
            </h3>
            <p className="text-sm text-slate-500">
              Try adjusting your search query or register a new student.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500 tracking-wider">
                <tr>
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Phone</th>
                  <th className="px-6 py-4">Age / Gender</th>
                  <th className="px-6 py-4">Assigned Batch</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((student) => {
                  const batchName = student.batch_id
                    ? batchMap.get(String(student.batch_id))
                    : null;
                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">
                          {student.name}
                        </div>
                        <div className="text-xs text-slate-400">
                          {student.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs">
                        {student.phone_number}
                      </td>
                      <td className="px-6 py-4 capitalize text-xs">
                        {student.age} yrs • {student.gender}
                      </td>
                      <td className="px-6 py-4">
                        {batchName ? (
                          <span className="inline-flex rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                            {batchName}
                          </span>
                        ) : (
                          <span className="inline-flex rounded-lg bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right space-x-3 text-xs font-semibold">
                        {isAdmin ? (
                          <>
                            <button
                              onClick={() => openEditModal(student)}
                              className="text-blue-600 hover:text-blue-800 cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(student.id)}
                              className="text-red-500 hover:text-red-700 cursor-pointer"
                            >
                              Delete
                            </button>
                          </>
                        ) : (
                          <span className="text-slate-400 font-normal">
                            View only
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Student Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900">
                {editingStudent ? "Edit Student Profile" : "Register Student"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
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

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Student's name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
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
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Phone Number *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="9876543210"
                    value={formData.phone_number}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
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
                    max={100}
                    value={formData.age}
                    onChange={(e) =>
                      setFormData({ ...formData, age: e.target.value })
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
                    value={formData.gender}
                    onChange={(e) =>
                      setFormData({ ...formData, gender: e.target.value })
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
                    value={formData.batch_id}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        batch_id: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">No Batch Assigned</option>
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
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting
                    ? "Saving..."
                    : editingStudent
                    ? "Update Student"
                    : "Register Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

