import { NextRequest, NextResponse } from 'next/server';
import { getTamilBiblePickerData } from '@/lib/tamil-bible';

export const runtime = 'nodejs';

export function GET(request: NextRequest) {
  const book = request.nextUrl.searchParams.get('book');
  const chapter = request.nextUrl.searchParams.get('chapter');

  return NextResponse.json(getTamilBiblePickerData(book, chapter));
}
