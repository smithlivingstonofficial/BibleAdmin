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
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form action={signIn} className="w-full max-w-sm rounded border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-950">Admin login</h1>
        {searchParams.error ? (
          <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
            Check your email and password, then try again.
          </p>
        ) : null}
        <label className="mt-5 block">
          <span className="text-sm font-medium text-slate-700">Email</span>
          <input
            required
            type="email"
            name="email"
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 focus:border-slate-900 focus:outline-none"
          />
        </label>
        <label className="mt-4 block">
          <span className="text-sm font-medium text-slate-700">Password</span>
          <input
            required
            type="password"
            name="password"
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 focus:border-slate-900 focus:outline-none"
          />
        </label>
        <button className="mt-6 w-full rounded bg-slate-950 px-4 py-2 font-medium text-white hover:bg-slate-800">
          Sign in
        </button>
      </form>
    </main>
  );
}
