'use client';

import Link from 'next/link';

type Props = {
  editHref: string;
  downloadHref: string;
  duplicateAction: () => Promise<void>;
  deleteAction: () => Promise<void>;
  reference: string;
};

const buttonClass =
  'flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-2 py-2 text-center text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-100 min-[380px]:text-sm';

export default function DailyVerseDashboardActions({
  editHref,
  downloadHref,
  duplicateAction,
  deleteAction,
  reference,
}: Props) {
  return (
    <>
      <Link href={editHref} className={buttonClass}>
        Edit
      </Link>

      <a href={downloadHref} className={buttonClass}>
        Download
      </a>

      <form action={duplicateAction}>
        <button className={`${buttonClass} w-full`} type="submit">
          Duplicate
        </button>
      </form>

      <form
        action={deleteAction}
        onSubmit={(event) => {
          const confirmed = window.confirm(
            `Delete ${reference || 'this daily verse'}? This cannot be undone.`
          );

          if (!confirmed) {
            event.preventDefault();
          }
        }}
      >
        <button
          className="min-h-11 w-full rounded-lg border border-red-200 bg-white px-2 py-2 text-xs font-bold text-red-700 shadow-sm transition hover:bg-red-50 min-[380px]:text-sm"
          type="submit"
        >
          Delete
        </button>
      </form>
    </>
  );
}
