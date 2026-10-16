"use client";

import { useState, useEffect } from "react";
import {
  api,
  type Batch,
  type Student,
  type AttendanceRecord,
} from "@/lib/api";
import { useSearchParams } from "next/navigation";

interface AttendanceClientProps {
  batches: Batch[];
}

type AttendanceStatusType = "present" | "absent" | "late" | "excused";

export function AttendanceClient({ batches }: AttendanceClientProps) {
  const searchParams = useSearchParams();
  const initialBatchId = searchParams.get("batch") || (batches[0]?.id ? String(batches[0].id) : "");

  const todayStr = new Date().toISOString().split("T")[0];

  const [selectedBatchId, setSelectedBatchId] = useState(initialBatchId);
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const [students, setStudents] = useState<Student[]>([]);
  const [existingRecords, setExistingRecords] = useState<AttendanceRecord[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<
    Record<string | number, AttendanceStatusType>
  >({});

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Load students and existing attendance when batch or date changes
  useEffect(() => {
    let isMounted = true;

    async function loadBatchData() {
      if (!selectedBatchId) {
        setStudents([]);
        setExistingRecords([]);
        return;
      }

      setLoading(true);
      setNotification(null);

      try {
        const [batchStudents, records] = await Promise.all([
          api.batches.getStudents(selectedBatchId),
          api.attendance.getByBatch(selectedBatchId, selectedDate),
        ]);

        if (!isMounted) return;

        setStudents(batchStudents);
        setExistingRecords(records);

        // Prepopulate attendance map
        const newMap: Record<string | number, AttendanceStatusType> = {};

        // First check existing records from DB
        const recordMap = new Map<string, string>();
        for (const r of records) {
          recordMap.set(String(r.student_id), r.status.toLowerCase());
        }

        for (const s of batchStudents) {
          const recorded = recordMap.get(String(s.id));
          if (
            recorded &&
            ["present", "absent", "late", "excused"].includes(recorded)
          ) {
            newMap[s.id] = recorded as AttendanceStatusType;
          } else {
            // Default to present for new attendance
            newMap[s.id] = "present";
          }
        }

        setAttendanceMap(newMap);
      } catch (err) {
        if (isMounted) {
          setNotification({
            type: "error",
            message:
              err instanceof Error ? err.message : "Failed to load batch data",
          });
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void loadBatchData();

    return () => {
      isMounted = false;
    };
  }, [selectedBatchId, selectedDate]);

  const setStatusForStudent = (
    studentId: string | number,
    status: AttendanceStatusType
  ) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const markAll = (status: AttendanceStatusType) => {
    const updated: Record<string | number, AttendanceStatusType> = {};
    for (const s of students) {
      updated[s.id] = status;
    }
    setAttendanceMap(updated);
  };

  const handleSubmitAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchId || students.length === 0) return;

    setSubmitting(true);
    setNotification(null);

    try {
      const recordsToSubmit = students.map((s) => ({
        student_id: s.id,
        status: attendanceMap[s.id] || "present",
      }));

      await api.attendance.submit({
        batch_id: selectedBatchId,
        date: selectedDate,
        students: recordsToSubmit,
      });

      setNotification({
        type: "success",
        message: `Attendance for ${students.length} students recorded successfully on ${selectedDate}!`,
      });

      // Refresh records
      const updatedRecords = await api.attendance.getByBatch(
        selectedBatchId,
        selectedDate
      );
      setExistingRecords(updatedRecords);
    } catch (err: unknown) {
      setNotification({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Failed to submit attendance",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedBatch = batches.find((b) => String(b.id) === selectedBatchId);

  // Statistics for current session
  const counts = {
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
  };
  for (const s of students) {
    const status = attendanceMap[s.id] || "present";
    counts[status]++;
  }

  const isAlreadyRecorded = existingRecords.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Attendance Tracker
        </h2>
        <p className="text-sm text-slate-500">
          Mark daily session attendance by batch and date with one-click bulk submissions.
        </p>
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
            className="text-xs opacity-70 hover:opacity-100 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Controls Bar: Batch & Date Pickers */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex-1 w-full">
          <label className="block text-xs font-semibold text-slate-500 mb-1">
            Select Batch
          </label>
          <select
            value={selectedBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a batch...</option>
            {batches.map((b) => (
              <option key={b.id} value={String(b.id)}>
                {b.name} — {b.course}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full sm:w-60">
          <label className="block text-xs font-semibold text-slate-500 mb-1">
            Attendance Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Batch Attendance Workspace */}
      {!selectedBatchId ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <span className="text-4xl">📋</span>
          <h3 className="mt-3 text-base font-semibold text-slate-800">
            No batch selected
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Choose a batch above to view students and take session attendance.
          </p>
        </div>
      ) : loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-16 text-center text-slate-400">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mb-3" />
          <p className="text-sm font-medium">Loading batch roster & attendance history...</p>
        </div>
      ) : students.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <span className="text-4xl">👥</span>
          <h3 className="mt-3 text-base font-semibold text-slate-800">
            No students enrolled in {selectedBatch?.name}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Assign students to this batch first to start tracking attendance.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmitAttendance} className="space-y-6">
          {/* Summary & Quick Actions Bar */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                Present: {counts.present}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700">
                Absent: {counts.absent}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
                Late: {counts.late}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                Excused: {counts.excused}
              </span>

              {isAlreadyRecorded && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                  ✓ Recorded ({existingRecords.length})
                </span>
              )}
            </div>

            {/* Quick Fill Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => markAll("present")}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-colors cursor-pointer"
              >
                All Present
              </button>
              <button
                type="button"
                onClick={() => markAll("absent")}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors cursor-pointer"
              >
                All Absent
              </button>
            </div>
          </div>

          {/* Students Roster Grid */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500 tracking-wider">
                  <tr>
                    <th className="px-6 py-4">#</th>
                    <th className="px-6 py-4">Student Details</th>
                    <th className="px-6 py-4 text-center">Status Selection</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((student, idx) => {
                    const currentStatus = attendanceMap[student.id] || "present";
                    return (
                      <tr
                        key={student.id}
                        className="hover:bg-slate-50/70 transition-colors"
                      >
                        <td className="px-6 py-4 text-xs font-bold text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-900">
                            {student.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {student.email} • Phone: {student.phone_number}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            {(
                              [
                                { key: "present", label: "Present", color: "emerald" },
                                { key: "absent", label: "Absent", color: "red" },
                                { key: "late", label: "Late", color: "amber" },
                                { key: "excused", label: "Excused", color: "blue" },
                              ] as const
                            ).map((opt) => {
                              const isSelected = currentStatus === opt.key;
                              return (
                                <button
                                  key={opt.key}
                                  type="button"
                                  onClick={() =>
                                    setStatusForStudent(student.id, opt.key)
                                  }
                                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                                    isSelected
                                      ? opt.color === "emerald"
                                        ? "bg-emerald-600 text-white shadow-sm shadow-emerald-200"
                                        : opt.color === "red"
                                        ? "bg-red-600 text-white shadow-sm shadow-red-200"
                                        : opt.color === "amber"
                                        ? "bg-amber-500 text-white shadow-sm shadow-amber-200"
                                        : "bg-blue-600 text-white shadow-sm shadow-blue-200"
                                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Submission Bar */}
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <p className="text-xs text-slate-500">
              Ready to submit attendance for{" "}
              <span className="font-semibold text-slate-800">
                {students.length} students
              </span>{" "}
              on{" "}
              <span className="font-semibold text-slate-800">
                {selectedDate}
              </span>
              .
            </p>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 transition-all cursor-pointer"
            >
              {submitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Submitting to Supabase...
                </>
              ) : (
                <>
                  <span>✓</span> Submit Attendance
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

