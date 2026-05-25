export default function SetupNotice() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="max-w-lg rounded border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-950">Admin setup required</h1>
        <p className="mt-2 text-sm text-slate-600">
          Create <code className="rounded bg-slate-100 px-1 py-0.5">bible-admin/.env.local</code> with your
          Supabase and Cloudflare R2 values, then restart the dev server.
        </p>
        <pre className="mt-4 overflow-x-auto rounded bg-slate-950 p-4 text-xs text-white">
{`NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

CLOUDFLARE_R2_ACCOUNT_ID=
CLOUDFLARE_R2_ACCESS_KEY_ID=
CLOUDFLARE_R2_SECRET_ACCESS_KEY=
CLOUDFLARE_R2_BUCKET=
CLOUDFLARE_R2_PUBLIC_URL=`}
        </pre>
      </div>
    </main>
  );
}
