import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="max-w-sm rounded border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-slate-950">Page not found</h1>
        <p className="mt-2 text-sm text-slate-600">The admin page you opened does not exist.</p>
        <Link href="/dashboard/daily-verses" className="mt-5 inline-block rounded bg-slate-950 px-4 py-2 font-medium text-white hover:bg-slate-800">
          Back to daily verses
        </Link>
      </div>
    </main>
  );
}
