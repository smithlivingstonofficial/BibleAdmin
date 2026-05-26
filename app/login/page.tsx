import { redirect } from 'next/navigation';
import { signIn } from '@/app/actions/auth';
import SetupNotice from '@/components/SetupNotice';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  if (!isSupabaseConfigured()) {
    return <SetupNotice />;
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (data.user) {
    redirect('/dashboard/daily-verses');
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff7ed_0,_#fff_36%,_#f8fafc_78%)] px-4 py-6 sm:flex sm:items-center sm:justify-center">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md flex-col justify-center sm:min-h-0">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-600 text-2xl font-black text-white shadow-lg shadow-orange-200">
            B
          </div>
          <p className="mt-5 text-sm font-semibold uppercase tracking-[0.18em] text-orange-700">
            Daily Verse Admin
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
            Welcome back
          </h1>
          <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-slate-600">
            Sign in to manage daily verses, artwork, and publishing from one calm dashboard.
          </p>
        </div>

        <form
          action={signIn}
          className="w-full rounded-3xl border border-white/80 bg-white/95 p-5 shadow-2xl shadow-slate-200/80 ring-1 ring-slate-900/5 backdrop-blur sm:p-7"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-950">Admin login</h2>
              <p className="mt-1 text-sm text-slate-500">Secure access for editors</p>
            </div>
            <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100">
              Secure
            </div>
          </div>

        {searchParams.error ? (
          <p className="mt-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            Check your email and password, then try again.
          </p>
        ) : null}

        <label className="mt-6 block">
          <span className="text-sm font-bold text-slate-700">Email</span>
          <input
            required
            type="email"
            name="email"
            placeholder="admin@example.com"
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-950 shadow-inner shadow-slate-100 transition focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-100"
          />
        </label>

        <label className="mt-4 block">
          <span className="text-sm font-bold text-slate-700">Password</span>
          <input
            required
            type="password"
            name="password"
            placeholder="Enter your password"
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-950 shadow-inner shadow-slate-100 transition focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-100"
          />
        </label>

        <button className="mt-6 w-full rounded-2xl bg-slate-950 px-4 py-3.5 text-base font-extrabold text-white shadow-lg shadow-slate-300 transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-300">
          Sign in
        </button>

          <p className="mt-5 text-center text-xs font-medium text-slate-500">
            Authorized Bible Admin users only
          </p>
        </form>
      </section>
    </main>
  );
}
