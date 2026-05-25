'use client';

type Props = {
  action: () => void;
  isPublished: boolean;
  publishedReference?: string | null;
};

export default function PublishDailyVerseButton({ action, isPublished, publishedReference }: Props) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (isPublished || !publishedReference) return;

        const confirmed = window.confirm(
          `${publishedReference} is already public. Publishing this verse will unpublish it. Continue?`
        );

        if (!confirmed) {
          event.preventDefault();
        }
      }}
    >
      <button className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-100 min-[380px]:text-sm">
        {isPublished ? 'Unpublish' : 'Publish'}
      </button>
    </form>
  );
}
