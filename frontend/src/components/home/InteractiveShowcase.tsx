"use client";

import { useState } from "react";
import Link from "next/link";

type TabKey = "attendance" | "batches" | "assignments";

export function InteractiveShowcase() {
  const [activeTab, setActiveTab] = useState<TabKey>("attendance");

  // Interactive state for student attendance simulation
  const [students, setStudents] = useState([
    { id: 1, name: "Aarav Patel", roll: "PH-101", status: "present", time: "09:02 AM" },
    { id: 2, name: "Diya Sharma", roll: "PH-102", status: "present", time: "09:05 AM" },
    { id: 3, name: "Rohan Mehta", roll: "PH-103", status: "late", time: "09:18 AM" },
    { id: 4, name: "Ishaan Verma", roll: "PH-104", status: "present", time: "08:58 AM" },
    { id: 5, name: "Ananya Iyer", roll: "PH-105", status: "absent", time: "-" },
    { id: 6, name: "Kabir Sengupta", roll: "PH-106", status: "present", time: "09:01 AM" },
  ]);

  // Interactive state for MCQ demo
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  const toggleStatus = (id: number) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const nextStatus =
          s.status === "present"
            ? "absent"
            : s.status === "absent"
            ? "late"
            : "present";
        return {
          ...s,
          status: nextStatus,
          time: nextStatus === "absent" ? "-" : s.time === "-" ? "09:12 AM" : s.time,
        };
      })
    );
  };

  const markAll = (status: "present" | "absent") => {
    setStudents((prev) =>
      prev.map((s) => ({
        ...s,
        status,
        time: status === "present" ? "09:00 AM" : "-",
      }))
    );
  };

  const presentCount = students.filter((s) => s.status === "present").length;
  const lateCount = students.filter((s) => s.status === "late").length;
  const absentCount = students.filter((s) => s.status === "absent").length;

  return (
    <div className="relative mx-auto max-w-5xl rounded-2xl border border-slate-200/90 bg-white shadow-2xl shadow-slate-900/10 overflow-hidden">
      {/* Window Header Bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200/80 bg-slate-50/80 px-4 py-3 gap-3">
        {/* Window Controls */}
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-rose-400/80 border border-rose-500/30" />
            <span className="h-3 w-3 rounded-full bg-amber-400/80 border border-amber-500/30" />
            <span className="h-3 w-3 rounded-full bg-emerald-400/80 border border-emerald-500/30" />
          </div>
          <span className="ml-3 font-mono text-xs font-medium text-slate-400">
            coachinghub.app/demo
          </span>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center rounded-xl bg-slate-200/60 p-1 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("attendance")}
            className={`rounded-lg px-3 py-1.5 transition-all cursor-pointer ${
              activeTab === "attendance"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Daily Attendance
          </button>
          <button
            onClick={() => setActiveTab("batches")}
            className={`rounded-lg px-3 py-1.5 transition-all cursor-pointer ${
              activeTab === "batches"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Batch Capacities
          </button>
          <button
            onClick={() => setActiveTab("assignments")}
            className={`rounded-lg px-3 py-1.5 transition-all cursor-pointer ${
              activeTab === "assignments"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            MCQ Quizzes
          </button>
        </div>

        {/* Live preview pill */}
        <div className="hidden sm:flex items-center gap-1.5 font-mono text-[11px] text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200/60">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Interactive Demo
        </div>
      </div>

      {/* Window Body */}
      <div className="p-5 md:p-7 bg-white">
        {activeTab === "attendance" && (
          <div className="space-y-5">
            {/* Top Bar for Batch selection */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">
                    Class 12 Physics — Morning Batch A
                  </span>
                  <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                    Room 102
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Subject: Mechanics • 30 Total Seats
                </p>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => markAll("present")}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-colors cursor-pointer"
                >
                  All Present
                </button>
                <button
                  onClick={() => markAll("absent")}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-colors cursor-pointer"
                >
                  All Absent
                </button>
                <Link
                  href="/attendance"
                  className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  Go to Attendance
                </Link>
              </div>
            </div>

            {/* Attendance Stat Counter Bar */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
              <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-emerald-700 font-bold border border-emerald-100">
                Present: {presentCount}
              </span>
              <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-amber-700 font-bold border border-amber-100">
                Late: {lateCount}
              </span>
              <span className="rounded-lg bg-rose-50 px-2.5 py-1 text-rose-700 font-bold border border-rose-100">
                Absent: {absentCount}
              </span>
              <span className="text-slate-400 text-xs ml-auto">
                Tip: Click any status badge below to toggle
              </span>
            </div>

            {/* Interactive Student Table */}
            <div className="rounded-xl border border-slate-200/80 overflow-hidden">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-4 py-2.5">Roll No</th>
                    <th className="px-4 py-2.5">Student Name</th>
                    <th className="px-4 py-2.5">Recorded Time</th>
                    <th className="px-4 py-2.5 text-right">Status Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((student) => (
                    <tr
                      key={student.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="px-4 py-2.5 font-mono text-slate-400 font-semibold">
                        {student.roll}
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-slate-800">
                        {student.name}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-slate-500">
                        {student.time}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={() => toggleStatus(student.id)}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold capitalize transition-all cursor-pointer ${
                            student.status === "present"
                              ? "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 hover:bg-emerald-500/20"
                              : student.status === "late"
                              ? "bg-amber-500/10 text-amber-700 border border-amber-500/20 hover:bg-amber-500/20"
                              : "bg-rose-500/10 text-rose-700 border border-rose-500/20 hover:bg-rose-500/20"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              student.status === "present"
                                ? "bg-emerald-500"
                                : student.status === "late"
                                ? "bg-amber-500"
                                : "bg-rose-500"
                            }`}
                          />
                          {student.status}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "batches" && (
          <div className="space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  Active Batches & Seat Limits
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Keep classrooms comfortable by tracking enrolled counts against physical seat capacity.
                </p>
              </div>
              <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 border border-indigo-100">
                3 Batches Active
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                    Physics
                  </span>
                  <span className="rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5">
                    28 / 30 Filled
                  </span>
                </div>
                <h5 className="font-bold text-slate-800 text-sm">
                  Class 12 Morning Batch
                </h5>
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span>Enrolled: 28 students</span>
                    <span className="font-semibold text-slate-700">93% capacity</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full"
                      style={{ width: "93.3%" }}
                    />
                  </div>
                </div>
                <p className="text-[11px] text-amber-600 font-medium">
                  2 seats remaining for admission
                </p>
              </div>

              <div className="rounded-xl border border-rose-200 bg-rose-50/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600">
                    Chemistry
                  </span>
                  <span className="rounded-md bg-rose-100 text-rose-800 text-[10px] font-bold px-1.5 py-0.5">
                    Batch Full
                  </span>
                </div>
                <h5 className="font-bold text-slate-800 text-sm">
                  NEET Evening Batch
                </h5>
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span>Enrolled: 25 students</span>
                    <span className="font-semibold text-rose-600">25 / 25</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full bg-rose-500 rounded-full"
                      style={{ width: "100%" }}
                    />
                  </div>
                </div>
                <p className="text-[11px] text-rose-600 font-semibold">
                  Maximum capacity reached
                </p>
              </div>

              <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600">
                    Mathematics
                  </span>
                  <span className="rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold px-1.5 py-0.5">
                    12 / 30 Filled
                  </span>
                </div>
                <h5 className="font-bold text-slate-800 text-sm">
                  Foundation Weekend
                </h5>
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span>Enrolled: 12 students</span>
                    <span className="font-semibold text-slate-700">40% capacity</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full bg-purple-600 rounded-full"
                      style={{ width: "40%" }}
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">
                  18 seats open for enrollment
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "assignments" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  Interactive MCQ Quiz Preview
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Teachers create quizzes with answer keys. Students submit online and get their scores instantly.
                </p>
              </div>
              <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                Physics Chapter 3
              </span>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-600 font-mono">
                  QUESTION 1 OF 5 • 4 MARKS
                </span>
                <span className="text-xs text-slate-400">
                  Batch: Class 12 Morning
                </span>
              </div>

              <p className="text-sm font-semibold text-slate-800">
                A passenger in a moving bus leans forward when the driver suddenly applies brakes. Which principle explains this phenomenon?
              </p>

              <div className="space-y-2">
                {[
                  { id: 0, text: "Newton's First Law (Law of Inertia)", correct: true },
                  { id: 1, text: "Newton's Second Law (Force = Mass × Acceleration)", correct: false },
                  { id: 2, text: "Newton's Third Law (Action and Reaction)", correct: false },
                  { id: 3, text: "Law of Conservation of Energy", correct: false },
                ].map((opt) => {
                  const isSelected = selectedOption === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setSelectedOption(opt.id)}
                      className={`w-full text-left px-4 py-2.5 rounded-xl border text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? opt.correct
                            ? "border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold"
                            : "border-rose-400 bg-rose-50 text-rose-900 font-semibold"
                          : "border-slate-200 bg-white hover:border-slate-300 text-slate-700"
                      }`}
                    >
                      <span>{opt.text}</span>
                      {isSelected && (
                        <span className="text-xs font-bold font-mono">
                          {opt.correct ? "✓ Correct (+4)" : "✗ Incorrect"}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {selectedOption !== null && (
                <div className="mt-3 rounded-lg bg-blue-50/70 border border-blue-100 p-3 text-xs text-blue-900">
                  <span className="font-bold">Automated grading:</span> Students see their answers and final score as soon as they submit, saving hours of manual correction.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Strip */}
      <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3 flex flex-wrap items-center justify-between text-[11px] text-slate-500 font-mono gap-2">
        <div className="flex items-center gap-3">
          <span>● Fast Roll-Call</span>
          <span>● Batch Seat Limits</span>
          <span>● Auto-Graded MCQ Quizzes</span>
        </div>
        <div className="font-sans font-semibold text-blue-600 hover:text-blue-800">
          <Link href="/dashboard">Open CoachingHub Dashboard →</Link>
        </div>
      </div>
    </div>
  );
}


