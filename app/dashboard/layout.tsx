import { redirect } from 'next/navigation';
import DashboardNavGate from '@/components/DashboardNavGate';
import SetupNotice from '@/components/SetupNotice';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured()) {
    return <SetupNotice />;
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef6ff_46%,#f8fafc_100%)]">
      <DashboardNavGate userEmail={data.user.email} />
      {children}
    </div>
  );
}
