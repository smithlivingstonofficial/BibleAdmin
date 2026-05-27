import Link from 'next/link';

export type DailyVerseFormValues = {
  id?: string;
  verse_date?: string;
  reference?: string;
  verse_text?: string;
  is_published?: boolean;
  background_image_url?: string | null;
};

type Props = {
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  values?: DailyVerseFormValues;
};

export default function DailyVerseForm({ action, submitLabel, values }: Props) {
  return (
    <form action={action} className="space-y-5 rounded border border-slate-200 bg-white p-5 shadow-sm">
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Date</span>
        <input
          required
          type="date"
          name="verse_date"
          defaultValue={values?.verse_date ?? ''}
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 focus:border-slate-900 focus:outline-none"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Reference</span>
        <input
          required
          name="reference"
          defaultValue={values?.reference ?? ''}
          placeholder="John 3:16"
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 focus:border-slate-900 focus:outline-none"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Verse text</span>
        <textarea
          required
          name="verse_text"
          rows={7}
          defaultValue={values?.verse_text ?? ''}
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 focus:border-slate-900 focus:outline-none"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Background image</span>
        <input
          type="file"
          name="background_image"
          accept="image/jpeg,image/png,image/webp"
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
        />
        {values?.background_image_url ? (
          <span className="mt-2 block text-sm text-slate-500">Current image is kept unless a new file is uploaded.</span>
        ) : null}
      </label>

      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          name="is_published"
          defaultChecked={Boolean(values?.is_published)}
          className="h-4 w-4 rounded border-slate-300"
        />
        <span className="text-sm font-medium text-slate-700">Published</span>
      </label>

      <div className="flex items-center gap-3">
        <button className="rounded bg-slate-950 px-4 py-2 font-medium text-white hover:bg-slate-800">
          {submitLabel}
        </button>
        <Link href="/dashboard/daily-verses" className="rounded border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50">
          Cancel
        </Link>
      </div>
    </form>
  );
}
