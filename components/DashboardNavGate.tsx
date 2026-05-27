'use client';

import { usePathname } from 'next/navigation';
import DashboardNav from './DashboardNav';

type Props = {
  userEmail?: string | null;
};

function isEditorPath(pathname: string) {
  return pathname === '/dashboard/daily-verses/new' ||
    /^\/dashboard\/daily-verses\/[^/]+\/edit$/.test(pathname);
}

export default function DashboardNavGate({ userEmail }: Props) {
  const pathname = usePathname();

  if (isEditorPath(pathname)) return null;

  return <DashboardNav userEmail={userEmail} />;
}
