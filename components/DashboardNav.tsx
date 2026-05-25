import Link from 'next/link';
import { signOut } from '@/app/actions/auth';

export default function DashboardNav() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-3 sm:px-4 sm:py-4">
        <Link href="/dashboard/daily-verses" className="min-w-0 truncate text-lg font-bold text-slate-950">
          Bible Admin
        </Link>
        <nav className="flex shrink-0 items-center gap-2 text-sm sm:gap-3">
          <Link href="/dashboard/daily-verses" className="hidden font-medium text-slate-700 hover:text-slate-950 min-[380px]:inline">
            Daily verses
          </Link>
          <form action={signOut}>
            <button className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 font-medium text-slate-700 shadow-sm hover:bg-slate-50">
              Sign out
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
