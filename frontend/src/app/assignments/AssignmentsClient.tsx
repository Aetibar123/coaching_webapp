"use client";

import { useState } from "react";
import Link from "next/link";
import {
  api,
  type Batch,
  type ClassItem,
  type Assignment,
  type Student,
  type AssignmentSubmission,
  type AssignmentSubmissionsResult,
} from "@/lib/api";

interface AssignmentsClientProps {
  initialAssignments: Assignment[];
  batches: Batch[];
  classes: ClassItem[];
  students: Student[];
  userRole?: string;
  userEmail?: string;
  userName?: string;
}

interface McqQuestionForm {
  question_text: string;
  options: string[];
  correct_option: number;
  points: number;
}

export function AssignmentsClient({
  initialAssignments,
  batches,
  classes,
  students,
  userRole,
  userEmail,
  userName,
}: AssignmentsClientProps) {
  const isTeacher = userRole === "teacher";
  const isTeacherOrAdmin = userRole === "admin" || userRole === "teacher";

  // Main state
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Modal 1: Create Assignment
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState<{
    batch_id: string;
    class_id: string;
    title: string;
    description: string;
    due_date: string;
  }>({
    batch_id: batches[0]?.id ? String(batches[0].id) : "",
    class_id: "",
    title: "",
    description: "",
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
  });

  const [questionsForm, setQuestionsForm] = useState<McqQuestionForm[]>([
    {
      question_text: "",
      options: ["", "", "", ""],
      correct_option: 0,
      points: 1,
    },
  ]);

  // Modal 2: Attempt Assignment
  const [attemptTarget, setAttemptTarget] = useState<Assignment | null>(null);
  const [attemptQuestions, setAttemptQuestions] = useState<
    {
      id: string;
      question_text: string;
      options: string[];
      points: number;
    }[]
  >([]);
  const [loadingAttempt, setLoadingAttempt] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [studentAnswers, setStudentAnswers] = useState<Record<string, number>>({});
  const [attemptSubmitting, setAttemptSubmitting] = useState(false);
  const [attemptResult, setAttemptResult] = useState<AssignmentSubmission | null>(null);

  // Modal 3: View Submissions (Teacher/Admin view)
  const [submissionsTarget, setSubmissionsTarget] = useState<Assignment | null>(null);
  const [submissionsData, setSubmissionsData] =
    useState<AssignmentSubmissionsResult | null>(null);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [expandedSubmissionId, setExpandedSubmissionId] = useState<string | null>(null);

  // Classes filtered by currently selected batch in Create form
  const availableClassesForBatch = classes.filter(
    (c) => String(c.batch_id) === String(assignmentForm.batch_id)
  );

  // Total points in current create form
  const computedTotalPoints = questionsForm.reduce(
    (acc, q) => acc + (Number(q.points) || 1),
    0
  );

  // Filtered assignments
  const filteredAssignments = assignments.filter((a) => {
    const matchesBatch = selectedBatchId ? String(a.batch_id) === String(selectedBatchId) : true;
    const matchesSearch = searchQuery
      ? a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.course?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.batch_name?.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchesBatch && matchesSearch;
  });

  // Calculate high-level stats
  const totalMCQs = assignments.reduce((acc, a) => acc + (a.questions_count || 0), 0);
  const totalSubmissions = assignments.reduce(
    (acc, a) => acc + (a.submissions_count || 0),
    0
  );

  // Add question to form
  const handleAddQuestion = () => {
    setQuestionsForm([
      ...questionsForm,
      {
        question_text: "",
        options: ["", "", "", ""],
        correct_option: 0,
        points: 1,
      },
    ]);
  };

  // Remove question from form
  const handleRemoveQuestion = (qIndex: number) => {
    if (questionsForm.length <= 1) {
      setNotification({
        type: "error",
        message: "An assignment must have at least one MCQ question.",
      });
      return;
    }
    setQuestionsForm(questionsForm.filter((_, idx) => idx !== qIndex));
  };

  // Update question option text
  const handleOptionChange = (
    qIndex: number,
    oIndex: number,
    value: string
  ) => {
    const updated = [...questionsForm];
    updated[qIndex].options[oIndex] = value;
    setQuestionsForm(updated);
  };

  // Add option to question
  const handleAddOptionToQuestion = (qIndex: number) => {
    const updated = [...questionsForm];
    if (updated[qIndex].options.length >= 6) return;
    updated[qIndex].options.push("");
    setQuestionsForm(updated);
  };

  // Remove option from question
  const handleRemoveOptionFromQuestion = (qIndex: number, oIndex: number) => {
    const updated = [...questionsForm];
    if (updated[qIndex].options.length <= 2) {
      setNotification({
        type: "error",
        message: "A question must contain at least 2 choices.",
      });
      return;
    }
    updated[qIndex].options.splice(oIndex, 1);
    if (updated[qIndex].correct_option >= updated[qIndex].options.length) {
      updated[qIndex].correct_option = updated[qIndex].options.length - 1;
    }
    setQuestionsForm(updated);
  };

  // Submit Create Assignment
  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignmentForm.batch_id || !assignmentForm.title.trim()) {
      setNotification({
        type: "error",
        message: "Please fill in all required assignment details.",
      });
      return;
    }

    // Validate questions
    for (let i = 0; i < questionsForm.length; i++) {
      const q = questionsForm[i];
      if (!q.question_text.trim()) {
        setNotification({
          type: "error",
          message: `Question #${i + 1} is missing its question prompt.`,
        });
        return;
      }
      const emptyOptIndex = q.options.findIndex((opt) => !opt.trim());
      if (emptyOptIndex !== -1) {
        setNotification({
          type: "error",
          message: `Question #${i + 1} has an empty option (Choice ${String.fromCharCode(
            65 + emptyOptIndex
          )}).`,
        });
        return;
      }
    }

    setCreateSubmitting(true);
    setNotification(null);

    try {
      const created = await api.assignments.create(
        {
          batch_id: assignmentForm.batch_id,
          class_id: assignmentForm.class_id || null,
          title: assignmentForm.title.trim(),
          description: assignmentForm.description.trim() || undefined,
          due_date: assignmentForm.due_date || undefined,
          questions: questionsForm.map((q) => ({
            question_text: q.question_text.trim(),
            options: q.options.map((opt) => opt.trim()),
            correct_option: q.correct_option,
            points: Number(q.points) || 1,
          })),
        },
        {
          "x-user-role": userRole || "",
          "x-user-email": userEmail || "",
        }
      );

      if (created) {
        setAssignments([created, ...assignments]);
        setNotification({
          type: "success",
          message: `Assignment "${created.title}" with ${questionsForm.length} MCQs published successfully!`,
        });
        setIsCreateModalOpen(false);
        // Reset form
        setAssignmentForm({
          batch_id: batches[0]?.id ? String(batches[0].id) : "",
          class_id: "",
          title: "",
          description: "",
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
        });
        setQuestionsForm([
          {
            question_text: "",
            options: ["", "", "", ""],
            correct_option: 0,
            points: 1,
          },
        ]);
      }
    } catch (err) {
      setNotification({
        type: "error",
        message:
          err instanceof Error ? err.message : "Failed to create assignment",
      });
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Open Attempt Modal
  const openAttemptModal = async (assignment: Assignment) => {
    setAttemptTarget(assignment);
    setLoadingAttempt(true);
    setAttemptResult(null);
    setStudentAnswers({});

    // Filter students belonging to this batch
    const batchStudents = students.filter(
      (s) => String(s.batch_id) === String(assignment.batch_id)
    );
    if (batchStudents.length > 0) {
      setSelectedStudentId(String(batchStudents[0].id));
    } else if (students.length > 0) {
      setSelectedStudentId(String(students[0].id));
    }

    try {
      const detailed = await api.assignments.get(assignment.id);
      if (detailed && detailed.questions) {
        setAttemptQuestions(
          detailed.questions.map((q) => ({
            id: q.id || "",
            question_text: q.question_text,
            options: q.options,
            points: q.points || 1,
          }))
        );
      }
    } catch (err) {
      setNotification({
        type: "error",
        message: "Failed to load questions for this assignment.",
      });
    } finally {
      setLoadingAttempt(false);
    }
  };

  // Submit Attempt
  const handleAttemptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attemptTarget || !selectedStudentId) {
      setNotification({
        type: "error",
        message: "Please select a student profile for submission.",
      });
      return;
    }

    // Check unanswered questions
    const unansweredCount = attemptQuestions.filter(
      (q) => studentAnswers[q.id] === undefined
    ).length;

    if (unansweredCount > 0) {
      const confirmSubmit = window.confirm(
        `You have ${unansweredCount} unanswered question(s). Are you sure you want to submit?`
      );
      if (!confirmSubmit) return;
    }

    setAttemptSubmitting(true);
    setNotification(null);

    const answersPayload = attemptQuestions.map((q) => ({
      question_id: q.id,
      selected_option:
        studentAnswers[q.id] !== undefined ? studentAnswers[q.id] : -1,
    }));

    try {
      const studentObj = students.find(
        (s) => String(s.id) === String(selectedStudentId)
      );

      const res = await api.assignments.submit(attemptTarget.id, {
        student_id: selectedStudentId,
        student_name: studentObj?.name || userName || "Student",
        student_email: studentObj?.email || userEmail || undefined,
        answers: answersPayload,
      });

      if (res.data) {
        setAttemptResult(res.data);
        // Refresh local assignment submissions count
        setAssignments((prev) =>
          prev.map((a) =>
            a.id === attemptTarget.id
              ? { ...a, submissions_count: (a.submissions_count || 0) + 1 }
              : a
          )
        );
      }
    } catch (err) {
      setNotification({
        type: "error",
        message:
          err instanceof Error ? err.message : "Failed to submit assignment",
      });
    } finally {
      setAttemptSubmitting(false);
    }
  };

  // Open Submissions View (Teacher view)
  const openSubmissionsModal = async (assignment: Assignment) => {
    setSubmissionsTarget(assignment);
    setLoadingSubmissions(true);
    setExpandedSubmissionId(null);

    try {
      const data = await api.assignments.getSubmissions(assignment.id, {
        "x-user-role": userRole || "",
        "x-user-email": userEmail || "",
      });
      setSubmissionsData(data ?? null);
    } catch (err) {
      setNotification({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Failed to load assignment submissions",
      });
    } finally {
      setLoadingSubmissions(false);
    }
  };

  // Delete Assignment
  const handleDeleteAssignment = async (assignment: Assignment) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete assignment "${assignment.title}"? All questions and student submissions will be permanently deleted.`
    );
    if (!confirmDelete) return;

    try {
      await api.assignments.delete(assignment.id, {
        "x-user-role": userRole || "",
        "x-user-email": userEmail || "",
      });
      setAssignments((prev) => prev.filter((a) => a.id !== assignment.id));
      setNotification({
        type: "success",
        message: `Assignment "${assignment.title}" deleted.`,
      });
    } catch (err) {
      setNotification({
        type: "error",
        message:
          err instanceof Error ? err.message : "Failed to delete assignment",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`flex items-center justify-between rounded-2xl px-5 py-3.5 text-xs font-semibold shadow-xs animate-in fade-in duration-200 ${
            notification.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{notification.type === "success" ? "✓" : "⚠️"}</span>
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 font-bold ml-4 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Hero Banner (Home Page Signature Dark Bento) */}
      <div className="rounded-3xl bg-slate-950 p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-800/80">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.3),rgba(255,255,255,0))]" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/80 px-3.5 py-1 text-xs font-mono font-medium text-slate-300">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span>[ 05 ASSESSMENT // MCQ ENGINE ]</span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400 font-normal">Auto-Grading Active</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Assignments &{" "}
              <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-white bg-clip-text text-transparent">
                MCQ Assessment Suite
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-400 max-w-xl font-normal leading-relaxed">
              {isTeacher
                ? "Design multiple-choice assignments for your cohorts, evaluate student attempts in real time, and inspect student response analytics."
                : "Manage class assignments, create MCQ assessments, and review graded submissions across all batches."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {isTeacherOrAdmin && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-bold text-slate-950 shadow-md hover:bg-slate-100 transition-all cursor-pointer whitespace-nowrap"
              >
                <span>+</span> Create Assignment & MCQs
              </button>
            )}

            <Link
              href="/classes"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-all"
            >
              <span>🗓️</span> Class Schedule
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs text-center">
          <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 font-mono">
            {assignments.length}
          </p>
          <p className="mt-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
            Total Assignments
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs text-center">
          <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-indigo-600 font-mono">
            {totalMCQs}
          </p>
          <p className="mt-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
            Total MCQs
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs text-center">
          <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-emerald-600 font-mono">
            {totalSubmissions}
          </p>
          <p className="mt-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
            Graded Submissions
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs text-center">
          <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-purple-600 font-mono">
            {batches.length}
          </p>
          <p className="mt-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
            Active Cohorts
          </p>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="">All Cohorts / Batches</option>
            {batches.map((b) => (
              <option key={b.id} value={String(b.id)}>
                {b.name} ({b.course})
              </option>
            ))}
          </select>
        </div>

        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Search assignment title or course..."
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

      {/* Assignments List / Grid */}
      {filteredAssignments.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <span className="text-4xl">📝</span>
          <h3 className="mt-3 text-base font-bold text-slate-900">
            No assignments found
          </h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            {selectedBatchId || searchQuery
              ? "No assignments matching your filters."
              : "No assignments have been created yet. Create an MCQ quiz to evaluate students."}
          </p>
          {isTeacherOrAdmin && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"
            >
              <span>+</span> Create First Assignment
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAssignments.map((assignment) => (
            <div
              key={assignment.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                {/* Cohort & Class Session Badges */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                    {assignment.batch_name || "Batch"}
                  </span>
                  {assignment.class_title ? (
                    <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 truncate max-w-[150px]">
                      Class: {assignment.class_title}
                    </span>
                  ) : (
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-medium text-slate-600">
                      General Batch Quiz
                    </span>
                  )}
                </div>

                {/* Title & Description */}
                <h3 className="mt-3 text-base font-bold text-slate-900 leading-snug">
                  {assignment.title}
                </h3>
                {assignment.description && (
                  <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                    {assignment.description}
                  </p>
                )}

                {/* Meta details */}
                <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block uppercase">
                      Questions
                    </span>
                    <span className="text-sm font-bold text-slate-800">
                      {assignment.questions_count || 0} MCQs
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block uppercase">
                      Total Points
                    </span>
                    <span className="text-sm font-bold text-indigo-600">
                      {assignment.total_points || 0} pts
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block uppercase">
                      Attempts
                    </span>
                    <span className="text-sm font-bold text-emerald-600">
                      {assignment.submissions_count || 0}
                    </span>
                  </div>
                </div>

                {/* Due Date Indicator */}
                {assignment.due_date && (
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                    <span>⏰</span>
                    <span>Due Date: {assignment.due_date}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <button
                  onClick={() => openAttemptModal(assignment)}
                  className="rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  ✍️ Attempt Quiz
                </button>

                {isTeacherOrAdmin && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openSubmissionsModal(assignment)}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      📊 Submissions ({assignment.submissions_count || 0})
                    </button>
                    <button
                      onClick={() => handleDeleteAssignment(assignment)}
                      title="Delete assignment"
                      className="rounded-xl border border-rose-100 p-2 text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: Create Assignment & MCQ Questions               */}
      {/* ========================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 p-6 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Create Assignment & MCQ Quiz
                </h3>
                <p className="text-xs text-slate-400">
                  Add multiple-choice questions for students to complete and submit.
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body / Form */}
            <form
              onSubmit={handleCreateAssignment}
              className="flex-1 overflow-y-auto p-6 space-y-5"
            >
              {/* Batch & Class Session Link */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Cohort / Batch *
                  </label>
                  <select
                    required
                    value={assignmentForm.batch_id}
                    onChange={(e) =>
                      setAssignmentForm({
                        ...assignmentForm,
                        batch_id: e.target.value,
                        class_id: "",
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {batches.map((b) => (
                      <option key={b.id} value={String(b.id)}>
                        {b.name} ({b.course})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Link to Class Session (Optional)
                  </label>
                  <select
                    value={assignmentForm.class_id}
                    onChange={(e) =>
                      setAssignmentForm({
                        ...assignmentForm,
                        class_id: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">General Batch Assignment</option>
                    {availableClassesForBatch.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title} ({c.date})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Title & Due Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Assignment Title *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Chapter 4: Thermodynamics MCQ Assessment"
                    value={assignmentForm.title}
                    onChange={(e) =>
                      setAssignmentForm({
                        ...assignmentForm,
                        title: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={assignmentForm.due_date}
                    onChange={(e) =>
                      setAssignmentForm({
                        ...assignmentForm,
                        due_date: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Instructions / Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Instructions for students before answering..."
                  value={assignmentForm.description}
                  onChange={(e) =>
                    setAssignmentForm({
                      ...assignmentForm,
                      description: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* MCQ Questions Builder Header */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span>Multiple Choice Questions</span>
                    <span className="rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-[10px] font-bold">
                      {questionsForm.length} Questions
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Total Evaluation: {computedTotalPoints} Points
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 cursor-pointer"
                >
                  <span>+</span> Add Question
                </button>
              </div>

              {/* Questions List */}
              <div className="space-y-4">
                {questionsForm.map((q, qIdx) => (
                  <div
                    key={qIdx}
                    className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3"
                  >
                    {/* Question Header */}
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-bold text-blue-700">
                        Question #{qIdx + 1}
                      </span>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <label className="text-[11px] text-slate-500 font-medium">
                            Points:
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={q.points}
                            onChange={(e) => {
                              const updated = [...questionsForm];
                              updated[qIdx].points = Number(e.target.value) || 1;
                              setQuestionsForm(updated);
                            }}
                            className="w-14 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-center font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        {questionsForm.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveQuestion(qIdx)}
                            className="text-rose-500 hover:text-rose-700 text-xs font-bold cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Question Prompt */}
                    <div>
                      <input
                        required
                        type="text"
                        placeholder="Type the question prompt here..."
                        value={q.question_text}
                        onChange={(e) => {
                          const updated = [...questionsForm];
                          updated[qIdx].question_text = e.target.value;
                          setQuestionsForm(updated);
                        }}
                        className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Options (Choices) */}
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold text-slate-500">
                        Options (Mark the radio button for the correct answer):
                      </p>
                      {q.options.map((opt, oIdx) => {
                        const isCorrect = q.correct_option === oIdx;
                        return (
                          <div
                            key={oIdx}
                            className={`flex items-center gap-2 rounded-xl p-2 transition-colors ${
                              isCorrect
                                ? "bg-emerald-50 border border-emerald-200"
                                : "bg-white border border-slate-200"
                            }`}
                          >
                            <input
                              type="radio"
                              name={`correct-opt-${qIdx}`}
                              checked={isCorrect}
                              onChange={() => {
                                const updated = [...questionsForm];
                                updated[qIdx].correct_option = oIdx;
                                setQuestionsForm(updated);
                              }}
                              className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                            <span className="text-xs font-bold text-slate-500 w-5 text-center">
                              {String.fromCharCode(65 + oIdx)}.
                            </span>
                            <input
                              required
                              type="text"
                              placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                              value={opt}
                              onChange={(e) =>
                                handleOptionChange(qIdx, oIdx, e.target.value)
                              }
                              className="flex-1 bg-transparent text-xs text-slate-800 focus:outline-none"
                            />
                            {isCorrect && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                Correct Answer
                              </span>
                            )}
                            {q.options.length > 2 && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleRemoveOptionFromQuestion(qIdx, oIdx)
                                }
                                className="text-slate-400 hover:text-rose-500 text-xs px-1 cursor-pointer"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        );
                      })}

                      {q.options.length < 6 && (
                        <button
                          type="button"
                          onClick={() => handleAddOptionToQuestion(qIdx)}
                          className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                        >
                          + Add Option Choice
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  + Add Another Question
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createSubmitting}
                    className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                  >
                    {createSubmitting ? "Publishing Quiz..." : "Publish Assignment"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: Attempt MCQ Assignment (Student Test Taking)     */}
      {/* ========================================================= */}
      {attemptTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 p-6 pb-4">
              <div>
                <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 uppercase">
                  {attemptTarget.batch_name}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  {attemptTarget.title}
                </h3>
                <p className="text-xs text-slate-400">
                  Total Points: {attemptTarget.total_points} pts • Answer all MCQ questions below.
                </p>
              </div>
              <button
                onClick={() => {
                  setAttemptTarget(null);
                  setAttemptResult(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {loadingAttempt ? (
                <div className="py-16 text-center text-sm font-semibold text-slate-400">
                  Loading assignment questions...
                </div>
              ) : attemptResult ? (
                /* Post-Submission Results Display */
                <div className="space-y-6 animate-in fade-in duration-200">
                  {/* Score Hero Card */}
                  <div
                    className={`rounded-3xl p-6 text-center border ${
                      attemptResult.percentage >= 60
                        ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                        : "bg-amber-50 border-amber-200 text-amber-900"
                    }`}
                  >
                    <span className="text-4xl">
                      {attemptResult.percentage >= 80
                        ? "🏆"
                        : attemptResult.percentage >= 60
                        ? "🎉"
                        : "📚"}
                    </span>
                    <h4 className="mt-2 text-xl font-extrabold">
                      {attemptResult.percentage >= 60
                        ? "Assessment Submitted Successfully!"
                        : "Assessment Submitted!"}
                    </h4>
                    <p className="text-xs opacity-80 mt-1">
                      Candidate: {attemptResult.student_name}
                    </p>

                    <div className="mt-4 inline-flex items-center gap-3 rounded-2xl bg-white px-6 py-3 shadow-sm">
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase block">
                          Final Score
                        </span>
                        <span className="text-2xl font-black text-slate-900">
                          {attemptResult.score} / {attemptResult.total_points}
                        </span>
                      </div>
                      <div className="h-8 w-px bg-slate-200" />
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase block">
                          Percentage
                        </span>
                        <span
                          className={`text-2xl font-black ${
                            attemptResult.percentage >= 60
                              ? "text-emerald-600"
                              : "text-amber-600"
                          }`}
                        >
                          {attemptResult.percentage}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Question Breakdown */}
                  <div className="space-y-4">
                    <h5 className="text-sm font-bold text-slate-800">
                      Answer Review & Explanations:
                    </h5>
                    {attemptResult.answers?.map((ans, idx) => (
                      <div
                        key={ans.question_id}
                        className={`rounded-2xl border p-4 space-y-2 ${
                          ans.is_correct
                            ? "bg-emerald-50/40 border-emerald-200"
                            : "bg-rose-50/40 border-rose-200"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800">
                            Question #{idx + 1}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                              ans.is_correct
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {ans.is_correct
                              ? `+${ans.points_awarded} pts (Correct)`
                              : "0 pts (Incorrect)"}
                          </span>
                        </div>

                        <p className="text-xs font-semibold text-slate-800">
                          {ans.question_text}
                        </p>

                        <div className="text-xs space-y-1 pt-1">
                          <p className="text-slate-600">
                            Your Choice:{" "}
                            <span
                              className={`font-bold ${
                                ans.is_correct
                                  ? "text-emerald-700"
                                  : "text-rose-700"
                              }`}
                            >
                              {ans.selected_option >= 0
                                ? `Option ${String.fromCharCode(
                                    65 + ans.selected_option
                                  )}`
                                : "No Option Selected"}
                            </span>
                          </p>
                          {!ans.is_correct && ans.correct_option !== undefined && (
                            <p className="text-emerald-700 font-medium">
                              Correct Choice: Option{" "}
                              {String.fromCharCode(65 + ans.correct_option)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-slate-100 text-right">
                    <button
                      onClick={() => {
                        setAttemptTarget(null);
                        setAttemptResult(null);
                      }}
                      className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 cursor-pointer"
                    >
                      Close Assessment
                    </button>
                  </div>
                </div>
              ) : (
                /* Attempt Form */
                <form onSubmit={handleAttemptSubmit} className="space-y-6">
                  {/* Candidate / Student Picker */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Select Student Candidate *
                    </label>
                    <select
                      required
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {students
                        .filter(
                          (s) =>
                            String(s.batch_id) === String(attemptTarget.batch_id)
                        )
                        .map((s) => (
                          <option key={s.id} value={String(s.id)}>
                            {s.name} ({s.email})
                          </option>
                        ))}
                      {/* Fallback to any student if batch filter is empty */}
                      {students
                        .filter(
                          (s) =>
                            String(s.batch_id) !== String(attemptTarget.batch_id)
                        )
                        .map((s) => (
                          <option key={s.id} value={String(s.id)}>
                            {s.name} ({s.email}) - Other Batch
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Questions */}
                  <div className="space-y-5">
                    {attemptQuestions.map((q, qIdx) => (
                      <div
                        key={q.id}
                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-blue-700">
                            Question {qIdx + 1} of {attemptQuestions.length}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-400">
                            {q.points} pt{q.points > 1 ? "s" : ""}
                          </span>
                        </div>

                        <p className="text-sm font-bold text-slate-900 leading-relaxed">
                          {q.question_text}
                        </p>

                        <div className="space-y-2 pt-2">
                          {q.options.map((opt, oIdx) => {
                            const isSelected = studentAnswers[q.id] === oIdx;
                            return (
                              <label
                                key={oIdx}
                                className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-all ${
                                  isSelected
                                    ? "border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20"
                                    : "border-slate-200 hover:bg-slate-50/80"
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`question-${q.id}`}
                                  checked={isSelected}
                                  onChange={() =>
                                    setStudentAnswers({
                                      ...studentAnswers,
                                      [q.id]: oIdx,
                                    })
                                  }
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                                <span className="text-xs font-bold text-slate-500 w-5">
                                  {String.fromCharCode(65 + oIdx)}.
                                </span>
                                <span className="text-xs text-slate-800 font-medium flex-1">
                                  {opt}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Submit bar */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <span className="text-xs font-semibold text-slate-500">
                      Answered: {Object.keys(studentAnswers).length} /{" "}
                      {attemptQuestions.length}
                    </span>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setAttemptTarget(null)}
                        className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={attemptSubmitting}
                        className="rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer shadow-sm"
                      >
                        {attemptSubmitting
                          ? "Grading Assessment..."
                          : "Submit Final Answers"}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: View Submissions & Teacher Grading Hub           */}
      {/* ========================================================= */}
      {submissionsTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 p-6 pb-4">
              <div>
                <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 uppercase">
                  {submissionsTarget.batch_name}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  Submissions: {submissionsTarget.title}
                </h3>
                <p className="text-xs text-slate-400">
                  Inspect candidate scores, submission timestamps, and full response breakdowns.
                </p>
              </div>
              <button
                onClick={() => setSubmissionsTarget(null)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {loadingSubmissions ? (
                <div className="py-16 text-center text-sm font-semibold text-slate-400">
                  Loading candidate submissions...
                </div>
              ) : !submissionsData ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No submission data available.
                </div>
              ) : (
                <>
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">
                        Submissions
                      </span>
                      <span className="text-2xl font-extrabold text-blue-600">
                        {submissionsData.submitted_count} / {submissionsData.total_enrolled}
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        Students Completed
                      </span>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">
                        Average Score
                      </span>
                      <span className="text-2xl font-extrabold text-indigo-600">
                        {submissionsData.average_score} pts
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        Out of {submissionsData.assignment.total_points}
                      </span>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">
                        Pending
                      </span>
                      <span className="text-2xl font-extrabold text-amber-600">
                        {submissionsData.pending_students.length}
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        Awaiting Submission
                      </span>
                    </div>
                  </div>

                  {/* Submissions Table / Cards */}
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 mb-3">
                      Completed Student Submissions ({submissionsData.submissions.length})
                    </h4>

                    {submissionsData.submissions.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
                        No students have submitted this assignment yet.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {submissionsData.submissions.map((sub) => {
                          const isExpanded = expandedSubmissionId === sub.id;
                          return (
                            <div
                              key={sub.id}
                              className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-xs"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                  <h5 className="text-sm font-bold text-slate-900">
                                    {sub.student_name}
                                  </h5>
                                  <p className="text-xs text-slate-400">
                                    {sub.student_email || "No email"} • Submitted:{" "}
                                    {new Date(sub.submitted_at).toLocaleString()}
                                  </p>
                                </div>

                                <div className="flex items-center gap-3">
                                  <div className="text-right">
                                    <span className="text-sm font-black text-slate-900">
                                      {sub.score} / {sub.total_points}
                                    </span>
                                    <span
                                      className={`block text-[11px] font-bold ${
                                        sub.percentage >= 60
                                          ? "text-emerald-600"
                                          : "text-amber-600"
                                      }`}
                                    >
                                      {sub.percentage}%
                                    </span>
                                  </div>

                                  <button
                                    onClick={() =>
                                      setExpandedSubmissionId(
                                        isExpanded ? null : sub.id
                                      )
                                    }
                                    className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                                  >
                                    {isExpanded ? "Hide Answers ↑" : "Inspect Answers ↓"}
                                  </button>
                                </div>
                              </div>

                              {/* Expanded Answers Breakdown */}
                              {isExpanded && (
                                <div className="mt-3 pt-3 border-t border-slate-100 space-y-2.5 animate-in fade-in duration-150">
                                  <p className="text-xs font-bold text-slate-700">
                                    Detailed MCQ Responses:
                                  </p>
                                  {sub.answers?.map((ans, idx) => (
                                    <div
                                      key={ans.question_id || idx}
                                      className={`rounded-xl p-3 text-xs flex items-center justify-between gap-3 ${
                                        ans.is_correct
                                          ? "bg-emerald-50/50 border border-emerald-200 text-emerald-900"
                                          : "bg-rose-50/50 border border-rose-200 text-rose-900"
                                      }`}
                                    >
                                      <div className="space-y-0.5">
                                        <p className="font-semibold">
                                          Q{idx + 1}: {ans.question_text}
                                        </p>
                                        <p className="text-[11px] opacity-80">
                                          Marked:{" "}
                                          <span className="font-bold">
                                            {ans.selected_option >= 0
                                              ? `Option ${String.fromCharCode(
                                                  65 + ans.selected_option
                                                )}`
                                              : "Unanswered"}
                                          </span>
                                          {!ans.is_correct &&
                                            ans.correct_option !== undefined && (
                                              <span className="ml-2 text-emerald-700 font-bold">
                                                (Correct: Option{" "}
                                                {String.fromCharCode(
                                                  65 + ans.correct_option
                                                )}
                                                )
                                              </span>
                                            )}
                                        </p>
                                      </div>

                                      <span
                                        className={`font-black text-xs whitespace-nowrap ${
                                          ans.is_correct
                                            ? "text-emerald-700"
                                            : "text-rose-700"
                                        }`}
                                      >
                                        {ans.is_correct
                                          ? `+${ans.points_awarded} pt`
                                          : "0 pt"}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Pending Students */}
                  {submissionsData.pending_students.length > 0 && (
                    <div className="pt-2">
                      <h4 className="text-sm font-bold text-slate-900 mb-2">
                        Pending Students ({submissionsData.pending_students.length})
                      </h4>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                        <div className="flex flex-wrap gap-2">
                          {submissionsData.pending_students.map((p) => (
                            <span
                              key={p.id}
                              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs"
                            >
                              {p.name} {p.email ? `(${p.email})` : ""}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

