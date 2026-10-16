"use client";

import { useState } from "react";

interface FaqItem {
  question: string;
  answer: string;
}

const faqs: FaqItem[] = [
  {
    question: "How does the batch capacity enforcement work?",
    answer:
      "When creating a batch, administrators define a maximum seat capacity (e.g., 30 students). Whenever a student is assigned to that batch, the backend automatically calculates the active enrollment count. If the batch has reached its limit, the system rejects additional enrollments with a clear capacity alert, preventing physical classroom overcrowding.",
  },
  {
    question: "How does bulk attendance insertion work with Supabase?",
    answer:
      "Teachers mark all students on a single screen using quick actions like 'All Present' or individual toggles. The client validates the payload and dispatches a single request. The backend transforms the roster using .map() and executes a bulk PostgreSQL INSERT query into the attendance table, checking for duplicate IDs and recording the session in under 50 milliseconds.",
  },
  {
    question: "Can multiple students be enrolled or transferred between batches?",
    answer:
      "Yes. Students can be reassigned to different batches at any time. When a student is transferred, their past attendance records for previous batches remain intact in the database for historical audits.",
  },
  {
    question: "Is Google OAuth required for faculty and admin access?",
    answer:
      "Google OAuth 2.0 provides frictionless, enterprise-grade sign-in without requiring passwords. Instructors and institute staff authenticate directly using their official Google accounts. In addition, Supabase Row Level Security (RLS) and session tokens protect all backend API routes.",
  },
  {
    question: "Can attendance be exported or queried for custom dates?",
    answer:
      "Yes. The backend provides filtered query endpoints allowing administrators to retrieve attendance records by batch, by date, or by individual student ID across any timeframe.",
  },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <div className="mx-auto max-w-3xl divide-y divide-slate-200/80 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
      {faqs.map((faq, idx) => {
        const isOpen = openIndex === idx;
        return (
          <div key={idx} className="py-4 first:pt-0 last:pb-0">
            <button
              type="button"
              onClick={() => toggle(idx)}
              className="flex w-full items-center justify-between text-left font-bold text-slate-900 hover:text-blue-600 transition-colors cursor-pointer text-sm sm:text-base gap-4"
            >
              <span>{faq.question}</span>
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-500 font-mono">
                {isOpen ? "−" : "+"}
              </span>
            </button>
            {isOpen && (
              <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed pr-8">
                {faq.answer}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

