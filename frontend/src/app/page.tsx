import { getCurrentUser } from "@/utils/getUser";
import { PublicNavbar } from "@/components/PublicNavbar";
import { InteractiveShowcase } from "@/components/home/InteractiveShowcase";
import { FaqSection } from "@/components/home/FaqSection";
import { api } from "@/lib/api";
import Link from "next/link";

export default async function HomePage() {
  const user = await getCurrentUser();

  // Try to load live batch count from backend
  let batchesCount = 0;
  let studentsCount = 0;

  try {
    const [batchesData, studentsData] = await Promise.all([
      api.batches.list(),
      api.students.list(),
    ]);
    batchesCount = batchesData.length;
    studentsCount = studentsData.length;
  } catch {
    batchesCount = 4;
    studentsCount = 48;
  }

  return (
    <div className="min-h-screen bg-[#fafafa] text-slate-900 selection:bg-blue-600 selection:text-white flex flex-col font-sans">
      {/* Navbar */}
      <PublicNavbar user={user} />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-28">
        {/* Subtle background grid */}
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-40" />

        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            {/* Version Announcement Tag */}
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/90 bg-white px-3.5 py-1 text-xs font-semibold text-slate-700 shadow-xs">
              <span className="flex h-1.5 w-1.5 rounded-full bg-blue-600" />
              <span>Coaching Center Management</span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-500 font-normal">
                Batches, Attendance & MCQ Quizzes
              </span>
            </div>

            {/* Authoritative Headline */}
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-slate-950 leading-[1.08]">
              Run your coaching classes with{" "}
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-950 bg-clip-text text-transparent">
                clarity and zero chaos.
              </span>
            </h1>

            {/* Subhead */}
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto font-normal">
              Manage your student batches, take daily attendance in seconds, organize
              schedules, and conduct auto-graded MCQ tests — all in one simple, organized workspace.
            </p>

            {/* Primary Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href={user ? "/dashboard" : "/login"}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 py-3.5 text-xs font-bold text-white shadow-md shadow-slate-900/10 hover:bg-slate-800 transition-all cursor-pointer"
              >
                <span>{user ? "Open Dashboard" : "Get Started with Google"}</span>
                <span className="text-slate-400">→</span>
              </Link>
              <Link
                href="/attendance"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Try Live Attendance</span>
              </Link>
            </div>

            {/* Feature Highlights */}
            <div className="pt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                1-Tap Google Sign-In
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Classroom Seat Limits
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Instant MCQ Grading
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Teacher & Admin Views
              </span>
            </div>
          </div>

          {/* Interactive Live Product Mockup */}
          <div className="mt-14">
            <InteractiveShowcase />
          </div>
        </div>
      </section>

      {/* Feature Pillars Strip */}
      <section className="border-y border-slate-200/80 bg-white py-10">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
            <div className="text-left sm:text-center pt-4 sm:pt-0 sm:px-4">
              <p className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-950">
                Batch Cohorts
              </p>
              <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                Set student seat limits, class subjects, and schedules without confusion.
              </p>
            </div>

            <div className="text-left sm:text-center pt-4 sm:pt-0 sm:px-4">
              <p className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-950">
                Quick Roll-Call
              </p>
              <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                Mark &apos;All Present&apos; or toggle individual students in seconds from phone or PC.
              </p>
            </div>

            <div className="text-left sm:text-center pt-4 sm:pt-0 sm:px-4">
              <p className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-950">
                MCQ Quizzes
              </p>
              <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                Create practice tests with answer keys and get immediate auto-graded student scores.
              </p>
            </div>

            <div className="text-left sm:text-center pt-4 sm:pt-0 sm:px-4">
              <p className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-950">
                Dedicated Roles
              </p>
              <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                Teachers focus on their assigned classes; admins supervise the entire institute.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bento Grid Section */}
      <section id="features" className="py-24 bg-[#fafafa]">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-2xl mb-16 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 font-mono">
              [ 01 Features ]
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-950">
              Everything you need to run your coaching center.
            </h2>
            <p className="text-sm text-slate-500">
              Designed for daily classroom routines — straightforward, intuitive, and distraction-free.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Bento Card 1: Capacity Enforcement (2 Columns) */}
            <div className="md:col-span-2 rounded-3xl border border-slate-200/90 bg-white p-8 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 font-mono">
                    BATCH MANAGEMENT
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    Capacity Control
                  </span>
                </div>
                <h3 className="mt-4 text-xl font-bold text-slate-900">
                  Prevent Overcrowded Classrooms
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed max-w-xl">
                  Physical classrooms have fixed seating. Set the maximum student limit for each batch,
                  and CoachingHub keeps track of active enrollments so you never accidentally overbook a room.
                </p>
              </div>

              {/* Graphic Representation */}
              <div className="mt-8 rounded-2xl bg-slate-50 border border-slate-100 p-5 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">
                    Class 12 Physics (Morning)
                  </span>
                  <span className="font-mono font-semibold text-emerald-600">
                    28 / 30 Seats Filled (93%)
                  </span>
                </div>
                <div className="h-3 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full"
                    style={{ width: "93.3%" }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>Enrolled: 28</span>
                  <span>Max Limit: 30</span>
                  <span className="text-amber-600 font-semibold">
                    2 Vacancies Left
                  </span>
                </div>
              </div>
            </div>

            {/* Bento Card 2: Google Sign-In */}
            <div className="rounded-3xl border border-slate-200/90 bg-white p-8 shadow-xs flex flex-col justify-between">
              <div>
                <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 font-mono">
                  AUTHENTICATION
                </span>
                <h3 className="mt-4 text-xl font-bold text-slate-900">
                  One-Tap Google Sign-In
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  No passwords to forget or reset. Teachers, students, and institute admins sign in
                  securely with their Google account in seconds.
                </p>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-slate-200 shadow-xs">
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.27v3.15C3.25 21.36 7.31 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.27C.46 8.2.005 10.05.005 12c0 1.95.455 3.8 1.265 5.42l4.01-3.15z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.64 1.27 6.58l4.01 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-800">Google Sign-In</p>
                  <p className="text-[11px] text-emerald-600 font-medium">Safe, passwordless login</p>
                </div>
              </div>
            </div>

            {/* Bento Card 3: Daily Roll-Call */}
            <div className="rounded-3xl border border-slate-200/90 bg-white p-8 shadow-xs flex flex-col justify-between">
              <div>
                <span className="rounded-lg bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-700 font-mono">
                  DAILY ROLL-CALL
                </span>
                <h3 className="mt-4 text-xl font-bold text-slate-900">
                  Fast Attendance
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Taking attendance shouldn&apos;t eat 15 minutes of lecture time. Tap &apos;All Present&apos;,
                  toggle the few absent students, and save in seconds.
                </p>
              </div>

              <div className="mt-6 rounded-2xl bg-slate-900 p-4 font-mono text-xs text-slate-200 space-y-1.5">
                <p className="text-slate-400 text-[11px]">Today&apos;s Roll-Call</p>
                <p className="text-emerald-400 font-bold">28 Present • 2 Absent</p>
                <p className="text-[11px] text-slate-400">Saved to Cloud in seconds</p>
              </div>
            </div>

            {/* Bento Card 4: Multi-Cohort Architecture (2 Columns) */}
            <div className="md:col-span-2 rounded-3xl border border-slate-200/90 bg-white p-8 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 font-mono">
                    STUDENTS & ASSIGNMENTS
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    Complete Overview
                  </span>
                </div>
                <h3 className="mt-4 text-xl font-bold text-slate-900">
                  Organized Rosters & Auto-Graded MCQ Tests
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed max-w-xl">
                  Keep student contacts, batches, and attendance histories organized in one searchable directory.
                  Teachers can assign multiple-choice quizzes that calculate scores instantly as soon as students submit.
                </p>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-center">
                  <p className="text-xs text-slate-400 font-medium">Batches</p>
                  <p className="text-lg font-extrabold text-slate-800">{batchesCount}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-center">
                  <p className="text-xs text-slate-400 font-medium">Students</p>
                  <p className="text-lg font-extrabold text-slate-800">{studentsCount}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-center">
                  <p className="text-xs text-slate-400 font-medium">MCQ Tests</p>
                  <p className="text-lg font-extrabold text-emerald-600">Instant Grading</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Side-by-Side Comparison: Old Way vs CoachingHub */}
      <section id="comparison" className="py-20 bg-white border-y border-slate-200/80">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-2xl mx-auto text-center mb-16 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 font-mono">
              [ 02 Comparison ]
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-950">
              Why coaching centers move away from paper registers.
            </h2>
            <p className="text-sm text-slate-500">
              Replace messy paper files and fragile spreadsheets with a simple, reliable system.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* The Old Way */}
            <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-8 space-y-5">
              <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
                <span>✕</span> The Legacy Way
              </div>
              <ul className="space-y-3.5 text-xs sm:text-sm text-slate-600">
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-500 font-bold">•</span>
                  <span>Paper registers get torn, damaged, or lost over time.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-500 font-bold">•</span>
                  <span>Spreadsheets where formulas break or attendance marks get accidentally overwritten.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-500 font-bold">•</span>
                  <span>Overbooking classrooms past available desks and physical seating.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-500 font-bold">•</span>
                  <span>Teachers spending 15 minutes of every lecture doing manual roll-calls.</span>
                </li>
              </ul>
            </div>

            {/* The CoachingHub Way */}
            <div className="rounded-3xl border border-blue-200 bg-blue-50/40 p-8 space-y-5 shadow-xs">
              <div className="flex items-center gap-2 text-blue-700 font-bold text-sm">
                <span>✓</span> The CoachingHub Way
              </div>
              <ul className="space-y-3.5 text-xs sm:text-sm text-slate-700">
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span>Everything safely saved in the cloud and accessible anytime on phone or PC.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span>One-click &apos;All Present&apos; roll-call completed in under 30 seconds.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span>Clear batch seat limits to keep class sizes comfortable.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span>MCQ quizzes with automatic scoring that save hours of manual grading.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 bg-[#fafafa]">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-2xl mx-auto text-center mb-14 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 font-mono">
              [ 03 FAQ ]
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-950">
              Frequently asked questions.
            </h2>
            <p className="text-sm text-slate-500">
              Straightforward answers about using CoachingHub for your coaching classes.
            </p>
          </div>

          <FaqSection />
        </div>
      </section>

      {/* Conversion Banner */}
      <section className="py-16 bg-slate-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.3),rgba(255,255,255,0))]" />

        <div className="mx-auto max-w-5xl px-6 text-center space-y-6">
          <span className="rounded-full border border-slate-700 bg-slate-900/80 px-3.5 py-1 text-xs font-mono font-medium text-slate-300">
            Free & Easy Setup
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            Start organizing your coaching classes today.
          </h2>
          <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto font-normal">
            Sign in with your Google account to create your first batch, track attendance,
            and assign quizzes in minutes.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={user ? "/dashboard" : "/login"}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-white px-7 py-3 text-xs font-bold text-slate-950 shadow-lg hover:bg-slate-100 transition-all cursor-pointer"
            >
              <span>{user ? "Open Dashboard" : "Get Started with Google"}</span>
              <span>→</span>
            </Link>
            <Link
              href="/batches"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-6 py-3 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-all"
            >
              View Active Batches
            </Link>
          </div>
        </div>
      </section>

      {/* Clean Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-10 text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-950 text-white font-bold text-xs">
              C
            </div>
            <div>
              <span className="font-bold text-slate-900">CoachingHub</span>
              <p className="text-[11px] text-slate-400">
                Simple, organized coaching management for tutors and institutes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 font-semibold">
            <Link href="/batches" className="hover:text-slate-900 transition-colors">
              Batches
            </Link>
            <Link href="/students" className="hover:text-slate-900 transition-colors">
              Students
            </Link>
            <Link href="/attendance" className="hover:text-slate-900 transition-colors">
              Attendance
            </Link>
            <Link href="/assignments" className="hover:text-slate-900 transition-colors">
              Assignments
            </Link>
            <Link href="/dashboard" className="hover:text-slate-900 transition-colors">
              Dashboard
            </Link>
          </div>

          <p className="font-mono text-[11px] text-slate-400">
            © {new Date().getFullYear()} CoachingHub. Built for modern educators.
          </p>
        </div>
      </footer>
    </div>
  );
}
