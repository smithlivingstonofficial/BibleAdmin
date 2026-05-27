import { NextRequest, NextResponse } from 'next/server';
import { getTamilBiblePickerData } from '@/lib/tamil-bible';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const book = request.nextUrl.searchParams.get('book');
  const chapter = request.nextUrl.searchParams.get('chapter');

  try {
    return NextResponse.json(await getTamilBiblePickerData(book, chapter));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load Tamil Bible picker.';
    return NextResponse.json({ message }, { status: 500 });
  }
}
