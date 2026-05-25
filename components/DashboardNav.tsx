import Link from 'next/link';
import { signOut } from '@/app/actions/auth';

type Props = {
  userEmail?: string | null;
};

function getInitial(email?: string | null) {
  const value = email?.trim();
  return value ? value.charAt(0).toUpperCase() : 'A';
}

export default function DashboardNav({ userEmail }: Props) {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/85 shadow-sm shadow-slate-950/5 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-2.5 sm:px-4 sm:py-3">
        <Link href="/dashboard/daily-verses" className="group flex min-w-0 items-center gap-2.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-sm font-black text-white shadow-lg shadow-slate-950/15 ring-1 ring-white">
            BA
          </span>
          <span className="min-w-0">
            <span className="block truncate text-base font-black leading-5 text-slate-950 sm:text-lg">
              Bible Admin
            </span>
            <span className="hidden text-xs font-semibold uppercase tracking-[0.18em] text-blue-700 sm:block">
              Verse console
            </span>
          </span>
        </Link>

        <nav className="flex shrink-0 items-center gap-2 text-sm sm:gap-3">
          <Link
            href="/dashboard/daily-verses"
            className="hidden min-h-10 items-center rounded-full bg-blue-50 px-4 py-2 font-bold text-blue-700 ring-1 ring-blue-100 transition hover:bg-blue-100 hover:text-blue-800 min-[380px]:inline-flex"
          >
            Daily verses
          </Link>

          <details className="group relative">
            <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full bg-white text-sm font-black text-slate-950 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 hover:ring-slate-300 marker:hidden">
              <span className="sr-only">Open profile menu</span>
              {getInitial(userEmail)}
            </summary>
            <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-950/10 ring-1 ring-white">
              <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Signed in</p>
                <p className="mt-1 truncate text-sm font-bold text-slate-950">{userEmail || 'Admin'}</p>
              </div>
              <form action={signOut} className="p-2">
                <button className="flex min-h-11 w-full items-center justify-center rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-bold text-red-700 transition hover:bg-red-100">
                  Sign out
                </button>
              </form>
            </div>
          </details>
        </nav>
      </div>
    </header>
  );
}
