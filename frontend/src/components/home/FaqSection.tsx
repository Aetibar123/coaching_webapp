"use client";

import { useState } from "react";

interface FaqItem {
  question: string;
  answer: string;
}

const faqs: FaqItem[] = [
  {
    question: "How does batch capacity management work?",
    answer:
      "When creating a batch, you can specify the maximum seat limit (e.g., 30 students). CoachingHub tracks how many students are enrolled and warns you before you exceed physical classroom space.",
  },
  {
    question: "How long does it take to mark daily attendance?",
    answer:
      "Just a few seconds. Select your batch, click 'All Present', toggle any students who are absent or late, and save. It works smoothly right from your phone or laptop during class.",
  },
  {
    question: "Can teachers and students have separate accounts?",
    answer:
      "Yes. Institute administrators have full access to manage batches and review teachers. Teachers can view their assigned batches, schedule lectures, mark attendance, and create MCQ assignments. Students can log in to view their schedule, check attendance, and take quizzes.",
  },
  {
    question: "Can teachers create MCQ quizzes and assignments?",
    answer:
      "Yes. Teachers can create multiple-choice question (MCQ) quizzes with custom options and correct answers. Students attempt them from their dashboard, and scores are recorded immediately without manual grading.",
  },
  {
    question: "Can I review past attendance history?",
    answer:
      "Yes. You can filter and view attendance records by batch and date at any time, making it easy to see student consistency and share updates with parents.",
  },
  {
    question: "Do I need to install any software?",
    answer:
      "No installation is required. CoachingHub works directly in your web browser across mobile phones, tablets, and computers. Simply sign in with Google to get started.",
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

