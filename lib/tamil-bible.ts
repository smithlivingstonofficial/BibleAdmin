import { existsSync, readFileSync } from 'fs';
import path from 'path';

type RawVerse = {
  _: string;
  $: {
    vnumber: string;
  };
};

type RawChapter = {
  $: {
    cnumber: string;
  };
  VERS: RawVerse[];
};

type RawBook = {
  $: {
    bnumber: string;
    bname: string;
    bsname?: string;
  };
  CHAPTER: RawChapter[];
};

type RawBible = {
  XMLBIBLE: {
    BIBLEBOOK: RawBook[];
  };
};

export type TamilBibleBookOption = {
  number: string;
  name: string;
  shortName: string;
};

export type TamilBibleChapterOption = {
  number: string;
};

export type TamilBibleVerseOption = {
  number: string;
  text: string;
};

let cachedBooks: RawBook[] | null = null;

function getLocalBiblePath() {
  const adminDataPath = path.resolve(process.cwd(), 'data', 'tamil-bible.json');
  if (existsSync(adminDataPath)) return adminDataPath;

  return path.resolve(process.cwd(), '..', 'TamilBible', 'app', 'data', 'bible.json');
}

async function fetchRemoteBible(url: string) {
  const response = await fetch(url, {
    cache: 'force-cache',
    next: { revalidate: 60 * 60 * 24 },
  });

  if (!response.ok) {
    throw new Error(`Tamil Bible JSON request failed with status ${response.status}.`);
  }

  return response.json() as Promise<RawBible>;
}

async function getBooks() {
  if (cachedBooks) return cachedBooks;

  const remoteBibleUrl = process.env.TAMIL_BIBLE_JSON_URL?.trim();
  const bible = remoteBibleUrl
    ? await fetchRemoteBible(remoteBibleUrl)
    : JSON.parse(readFileSync(getLocalBiblePath(), 'utf8')) as RawBible;

  cachedBooks = bible.XMLBIBLE.BIBLEBOOK;
  return cachedBooks;
}

export async function getTamilBiblePickerData(bookNumber?: string | null, chapterNumber?: string | null) {
  const books = await getBooks();
  const selectedBook = books.find((book) => book.$.bnumber === bookNumber) || null;
  const selectedChapter = selectedBook?.CHAPTER.find((chapter) => chapter.$.cnumber === chapterNumber) || null;

  return {
    books: books.map<TamilBibleBookOption>((book) => ({
      number: book.$.bnumber,
      name: book.$.bname,
      shortName: book.$.bsname || book.$.bname,
    })),
    chapters: selectedBook
      ? selectedBook.CHAPTER.map<TamilBibleChapterOption>((chapter) => ({
          number: chapter.$.cnumber,
        }))
      : [],
    verses: selectedChapter
      ? selectedChapter.VERS.map<TamilBibleVerseOption>((verse) => ({
          number: verse.$.vnumber,
          text: verse._,
        }))
      : [],
  };
}
