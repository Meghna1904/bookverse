import { api } from "@/lib/data-api";
import type { Id } from "@/lib/db-types";
import {
  BookCover,
  PageHeader,
  SectionHeading,
  Stars,
} from "@/components/bookverse/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CURATED_BOOKS,
  GENRES,
  LANGUAGES,
  bookPayload,
  errorMessage,
  fromGoogleVolume,
  type CatalogueBook,
  type GoogleVolume,
} from "@/lib/bookverse";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "@/lib/data-hooks";
import {
  ArrowRight,
  BookOpen,
  Bookmark,
  CheckCheck,
  Compass,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

type DiscoverBook = CatalogueBook & { rating?: number };

function CoverUrlPreview({ url, title }: { url?: string | null; title: string }) {
  const [failed, setFailed] = useState(!url);

  useEffect(() => setFailed(!url), [url]);

  return (
    <div className="flex aspect-[2/3] w-full max-w-28 items-center justify-center overflow-hidden rounded-md border border-border/70 bg-secondary/50 p-2 text-center text-[0.65rem] text-muted-foreground">
      {url && !failed ? (
        <img
          src={url}
          alt={`Cover preview for ${title || "book"}`}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span>Cover preview appears here</span>
      )}
    </div>
  );
}

type Filters = {
  genre: string;
  language: string;
  era: string;
  format: string;
  reading: string;
  minRating: number;
  fromYear: string;
  toYear: string;
};

const DEFAULT_FILTERS: Filters = {
  genre: "all",
  language: "all",
  era: "all",
  format: "either",
  reading: "any",
  minRating: 0,
  fromYear: "",
  toYear: "",
};

function matches(book: DiscoverBook, filters: Filters) {
  if (filters.genre !== "all" && book.genre !== filters.genre) return false;
  if (filters.language !== "all" && book.language !== filters.language) return false;
  if (filters.era === "classic" && !(book.publishedYear && book.publishedYear < 1970)) {
    return false;
  }
  if (filters.era === "contemporary" && !(book.publishedYear && book.publishedYear >= 1970)) {
    return false;
  }
  if (filters.format !== "either" && book.format && book.format !== filters.format) {
    return false;
  }
  if (filters.reading === "together" && (book.pageCount ?? 0) > 420) return false;
  if (filters.minRating > 0 && (book.rating ?? 0) < filters.minRating) return false;
  const fromYear = Number(filters.fromYear);
  const toYear = Number(filters.toYear);
  if (fromYear && (book.publishedYear ?? 0) < fromYear) return false;
  if (toYear && (book.publishedYear ?? 9999) > toYear) return false;
  return true;
}

function CatalogueCard({ book, onOpen }: { book: DiscoverBook; onOpen: () => void }) {
  return (
    <article className="group cursor-pointer" onClick={onOpen}>
      <div className="relative">
        <BookCover
          title={book.title}
          author={book.author}
          coverUrl={book.coverUrl}
          className="w-full transition-transform duration-500 group-hover:-translate-y-1.5"
        />
        <div className="absolute inset-0 rounded-[3px] ring-1 ring-black/5 ring-inset" />
      </div>
      <div className="mt-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display line-clamp-2 text-[1.02rem] leading-snug group-hover:text-terracotta">
            {book.title}
          </h3>
          {book.rating ? (
            <span className="mt-0.5 inline-flex shrink-0 items-center gap-0.5 text-[0.65rem] text-muted-foreground">
              <Stars value={book.rating} size={10} />
              {book.rating.toFixed(1)}
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 line-clamp-1 text-[0.72rem] text-muted-foreground">{book.author}</p>
        <p className="mt-1.5 line-clamp-2 text-[0.7rem] leading-relaxed text-muted-foreground/90">
          {book.description ?? "No description available for this edition."}
        </p>
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.62rem] tracking-[0.08em] text-muted-foreground/80 uppercase">
          <span>{book.genre ?? "Catalogue"}</span>
          {book.pageCount ? <span>· {book.pageCount} pp</span> : null}
          {book.language ? <span>· {book.language}</span> : null}
        </p>
      </div>
    </article>
  );
}

export default function Discover() {
  const bootstrap = useQuery(api.households.bootstrap);
  const recent = useQuery(api.books.recentDiscoveries);
  const startReading = useMutation(api.books.startReading);
  const markAsRead = useMutation(api.books.markAsRead);
  const addWish = useMutation(api.wishlist.add);

  const household =
    bootstrap && "hasHousehold" in bootstrap && bootstrap.hasHousehold ? bootstrap : null;
  const readers = (household?.members ?? []).map((member) => ({
    userId: member.userId,
    displayName: member.displayName,
    isSample: member.isSample,
  }));
  const myUserId = household?.me?.userId;

  const [query, setQuery] = useState("");
  const [remote, setRemote] = useState<DiscoverBook[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [active, setActive] = useState<DiscoverBook | null>(null);
  const [draft, setDraft] = useState<DiscoverBook | null>(null);
  const [editingDetails, setEditingDetails] = useState(false);
  const [priority, setPriority] = useState<"someday" | "soon" | "next">("soon");
  const [busy, setBusy] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  useEffect(() => {
    if (active) {
      setPriority("soon");
    }
    setDraft(active ? { ...active } : null);
    setEditingDetails(false);
  }, [active]);

  const updateDraftText = (
    field: Exclude<keyof CatalogueBook, "pageCount" | "publishedYear">,
    value: string,
  ) => setDraft((current) => current ? { ...current, [field]: value } : current);
  const updateDraftNumber = (field: "pageCount" | "publishedYear", value: string) =>
    setDraft((current) => current ? { ...current, [field]: value ? Number(value) : undefined } : current);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setRemote([]);
      setSearching(false);
      setSearchError(null);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        const response = await fetch(
          `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(term)}&maxResults=24&printType=books`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error(`Catalogue returned ${response.status}`);
        const payload = (await response.json()) as { items?: GoogleVolume[] };
        const volumes = (payload.items ?? []).map(fromGoogleVolume);
        if (!volumes.length) throw new Error("empty");
        setRemote(volumes);
      } catch {
        if (controller.signal.aborted) return;
        try {
          const fallback = await fetch(
            `https://openlibrary.org/search.json?q=${encodeURIComponent(term)}&limit=24&fields=key,title,author_name,first_publish_year,cover_i,number_of_pages_median,isbn,subject,publisher`,
            { signal: controller.signal },
          );
          if (!fallback.ok) throw new Error("Open Library unavailable");
          const payload = (await fallback.json()) as {
            docs?: Array<{
              key: string;
              title?: string;
              author_name?: string[];
              first_publish_year?: number;
              cover_i?: number;
              number_of_pages_median?: number;
              isbn?: string[];
              subject?: string[];
              publisher?: string[];
            }>;
          };
          setRemote(
            (payload.docs ?? []).map((doc) => ({
              title: doc.title ?? "Untitled",
              author: doc.author_name?.join(", ") ?? "Unknown author",
              isbn: doc.isbn?.[0],
              coverUrl: doc.cover_i
                ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
                : undefined,
              genre: doc.subject?.[0],
              pageCount: doc.number_of_pages_median,
              publishedYear: doc.first_publish_year,
              publisher: doc.publisher?.[0],
              externalRef: `openlibrary:${doc.key}`,
            })),
          );
        } catch {
          if (controller.signal.aborted) return;
          setRemote([]);
          setSearchError(
            "The external catalogue could not be reached. Our curated catalogue, your saved books and manual entry still work.",
          );
        }
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 420);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  const localResults = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return CURATED_BOOKS.filter((book) =>
      [book.title, book.author, book.isbn, book.genre, book.publisher, book.series]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [query]);

  const results = useMemo(() => {
    const seen = new Set<string>();
    const merged: DiscoverBook[] = [];
    for (const book of [...localResults, ...remote]) {
      const key = `${book.title.toLowerCase().trim()}|${book.author.toLowerCase().trim()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (matches(book, filters)) merged.push(book);
    }
    return merged;
  }, [localResults, remote, filters]);

  const bookInDialog = draft ?? active;

  const sections = useMemo(() => {
    const curated = CURATED_BOOKS.filter((book) => matches(book, filters));
    const byIsbn = (isbn: string) => curated.find((book) => book.isbn === isbn);
    return {
      popular: [
        "9780571258246",
        "9780006550686",
        "9781400033416",
        "9781455563937",
        "9780393356687",
        "9780375842207",
        "9780060883287",
        "9780141439549",
      ]
        .map(byIsbn)
        .filter((book): book is CatalogueBook => Boolean(book)),
      classics: curated.filter((book) => (book.publishedYear ?? 3000) < 1950).slice(0, 6),
      fresh: curated
        .filter((book) => (book.publishedYear ?? 0) >= 2010)
        .sort((a, b) => (b.publishedYear ?? 0) - (a.publishedYear ?? 0))
        .slice(0, 6),
      shared: curated.filter((book) => (book.pageCount ?? 999) <= 340).slice(0, 4),
    };
  }, [filters]);

  const runAction = async (action: "start" | "wishlist" | "together" | "read") => {
    if (!active) return;
    if (action === "together" && readers.length < 2) {
      toast.error("This household has one reader so far. Invite your partner first.");
      return;
    }
    const readerIds = action === "together"
      ? readers.map((reader) => reader.userId)
      : myUserId ? [myUserId] : [];
    if (!readerIds.length) {
      toast.error("Choose your reader on the PIN login screen first.");
      return;
    }
    const bookDetails = draft ?? active;
    if (!bookDetails.title.trim()) {
      toast.error("Add a title before saving this book.");
      return;
    }
    const payload = bookPayload({
      ...bookDetails,
      title: bookDetails.title.trim(),
      author: bookDetails.author.trim() || "Unknown author",
    });
    setBusy(true);
    try {
      if (action === "wishlist") {
        await addWish({ book: payload, readerIds, priority, updateBookDetails: true });
        toast.success("Saved to the wishlist.");
      } else if (action === "read") {
        await markAsRead({ book: payload, readerIds, updateBookDetails: true });
        toast.success("Marked as read and added to your shelf.");
      } else {
        await startReading({
          book: payload,
          readerIds,
          mode: readerIds.length > 1 ? "together" : "individual",
          updateBookDetails: true,
        });
        toast.success(
          readerIds.length > 1
            ? "Added to Currently Reading — reading together."
            : "Added to Currently Reading.",
        );
      }
      setActive(null);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pb-6">
      <PageHeader
        eyebrow="Discover"
        title="Find the next book you'll both argue about."
        description="Search the wider catalogue by title, author, ISBN, series, genre or publisher — then shelve it for one reader or both. Identical books are never duplicated."
        action={
          <Button
            variant="outline"
            className="rounded-full border-forest/25"
            onClick={() => setManualOpen(true)}
          >
            <Plus className="mr-2 size-4" /> Add manually
          </Button>
        }
      />

      <div className="paper-card rounded-lg p-4 sm:p-5">
        <div className="relative">
          <Search className="absolute top-3.5 left-4 size-5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="A title, an author, an ISBN, a series…"
            className="h-12 rounded-full pl-12 text-[0.95rem]"
            aria-label="Search the catalogue"
          />
          {searching ? (
            <Loader2 className="absolute top-4 right-4 size-4 animate-spin text-muted-foreground" />
          ) : null}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Select
            value={filters.genre}
            onValueChange={(value) => setFilters({ ...filters, genre: value })}
          >
            <SelectTrigger className="h-8 w-[150px] rounded-full text-[0.72rem]">
              <SelectValue placeholder="Genre" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All genres</SelectItem>
              {[...new Set([...GENRES, ...CURATED_BOOKS.map((book) => book.genre ?? "")])]
                .filter(Boolean)
                .sort()
                .map((genre) => (
                  <SelectItem key={genre} value={genre}>
                    {genre}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.language}
            onValueChange={(value) => setFilters({ ...filters, language: value })}
          >
            <SelectTrigger className="h-8 w-[130px] rounded-full text-[0.72rem]">
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All languages</SelectItem>
              {LANGUAGES.map((language) => (
                <SelectItem key={language} value={language}>
                  {language}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.era}
            onValueChange={(value) => setFilters({ ...filters, era: value })}
          >
            <SelectTrigger className="h-8 w-[145px] rounded-full text-[0.72rem]">
              <SelectValue placeholder="Era" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Classic & modern</SelectItem>
              <SelectItem value="classic">Classics (pre-1970)</SelectItem>
              <SelectItem value="contemporary">Contemporary</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.reading}
            onValueChange={(value) => setFilters({ ...filters, reading: value })}
          >
            <SelectTrigger className="h-8 w-[150px] rounded-full text-[0.72rem]">
              <SelectValue placeholder="Reading" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any reading style</SelectItem>
              <SelectItem value="together">Suited to reading together</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.format}
            onValueChange={(value) => setFilters({ ...filters, format: value })}
          >
            <SelectTrigger className="h-8 w-[130px] rounded-full text-[0.72rem]">
              <SelectValue placeholder="Format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="either">Any format</SelectItem>
              <SelectItem value="physical">Physical</SelectItem>
              <SelectItem value="digital">Digital</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={String(filters.minRating)}
            onValueChange={(value) => setFilters({ ...filters, minRating: Number(value) })}
          >
            <SelectTrigger className="h-8 w-[125px] rounded-full text-[0.72rem]">
              <SelectValue placeholder="Rating" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Any rating</SelectItem>
              <SelectItem value="3">3 stars +</SelectItem>
              <SelectItem value="4">4 stars +</SelectItem>
              <SelectItem value="4.5">4.5 stars +</SelectItem>
            </SelectContent>
          </Select>
          <Input
            value={filters.fromYear}
            onChange={(event) => setFilters({ ...filters, fromYear: event.target.value })}
            placeholder="Year from"
            inputMode="numeric"
            className="h-8 w-[100px] rounded-full text-[0.72rem]"
            aria-label="Published from year"
          />
          <Input
            value={filters.toYear}
            onChange={(event) => setFilters({ ...filters, toYear: event.target.value })}
            placeholder="Year to"
            inputMode="numeric"
            className="h-8 w-[100px] rounded-full text-[0.72rem]"
            aria-label="Published to year"
          />
          <button
            type="button"
            onClick={() => setFilters(DEFAULT_FILTERS)}
            className="h-8 rounded-full px-3 text-[0.7rem] text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Clear filters
          </button>
        </div>
        <p className="mt-2 text-[0.66rem] text-muted-foreground">
          Format and reading-style filters apply to editions that carry that information;
          most external catalogue entries do not. Year, genre and language filter everything.
        </p>
      </div>

      {query.trim().length >= 2 ? (
        <section className="mt-8">
          <SectionHeading
            eyebrow="Catalogue search"
            title={`${results.length} edition${results.length === 1 ? "" : "s"} found`}
            description="Results combine our curated catalogue with Google Books and Open Library. No external catalogue holds every book or cover — use manual entry when something is missing."
          />
          {searchError ? (
            <p className="mt-3 rounded-md border border-terracotta/30 bg-terracotta/8 px-3 py-2 text-[0.75rem] text-terracotta">
              {searchError}
            </p>
          ) : null}
          {searching && !results.length ? (
            <div className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="animate-pulse">
                  <div className="aspect-[2/3] rounded bg-secondary" />
                  <div className="mt-3 h-3 w-4/5 rounded bg-secondary" />
                  <div className="mt-2 h-2 w-3/5 rounded bg-secondary" />
                </div>
              ))}
            </div>
          ) : results.length ? (
            <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-9 sm:grid-cols-3 lg:grid-cols-5">
              {results.map((book) => (
                <CatalogueCard
                  key={`${book.title}-${book.author}-${book.isbn ?? book.externalRef ?? ""}`}
                  book={book}
                  onOpen={() => setActive(book)}
                />
              ))}
            </div>
          ) : (
            <div className="paper-panel mt-6 rounded-lg px-6 py-12 text-center">
              <Compass className="mx-auto size-6 text-olive" />
              <h3 className="font-display mt-3 text-xl">Nothing matched that search</h3>
              <p className="mx-auto mt-2 max-w-md text-[0.8rem] leading-relaxed text-muted-foreground">
                Try a shorter title or the author's surname. If the book is missing from
                every catalogue, add it by hand — title, author and page count are enough.
              </p>
              <Button
                className="mt-5 rounded-full bg-forest text-primary-foreground"
                onClick={() => setManualOpen(true)}
              >
                Add this book manually
              </Button>
            </div>
          )}
        </section>
      ) : (
        <>
          <section className="mt-9">
            <SectionHeading
              eyebrow="Popular books"
              title="What everyone is reading"
              description="A rotating set of much-loved editions from the shared catalogue."
            />
            <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-9 sm:grid-cols-3 lg:grid-cols-6">
              {sections.popular.map((book) => (
                <CatalogueCard key={book.title} book={book} onOpen={() => setActive(book)} />
              ))}
            </div>
          </section>

          <section className="mt-12">
            <SectionHeading eyebrow="Timeless classics" title="Books that outlast their century" />
            <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-9 sm:grid-cols-3 lg:grid-cols-6">
              {sections.classics.map((book) => (
                <CatalogueCard key={book.title} book={book} onOpen={() => setActive(book)} />
              ))}
            </div>
          </section>

          <section className="mt-12">
            <SectionHeading eyebrow="New & noteworthy" title="Recently published, worth a shelf" />
            <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-9 sm:grid-cols-3 lg:grid-cols-6">
              {sections.fresh.map((book) => (
                <CatalogueCard key={book.title} book={book} onOpen={() => setActive(book)} />
              ))}
            </div>
          </section>

          <div className="mt-12 grid gap-8 lg:grid-cols-[1.2fr_1fr]">
            <section>
              <SectionHeading
                eyebrow="Explore by genre"
                title="Choose a mood"
                description="Pick a shelf and the catalogue above narrows to it."
              />
              <div className="mt-5 flex flex-wrap gap-2">
                {[
                  "Literary Fiction",
                  "Classics",
                  "Poetry",
                  "Historical Fiction",
                  "Memoir",
                  "Mythology",
                  "Science Fiction",
                  "Non-fiction",
                ].map((genre) => (
                  <button
                    key={genre}
                    type="button"
                    onClick={() =>
                      setFilters({
                        ...filters,
                        genre: filters.genre === genre ? "all" : genre,
                      })
                    }
                    className={cn(
                      "rounded-full border px-4 py-2 text-[0.75rem] transition",
                      filters.genre === genre
                        ? "border-forest bg-forest text-primary-foreground"
                        : "border-border bg-card text-muted-foreground hover:border-olive/50 hover:text-foreground",
                    )}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </section>
            <section>
              <SectionHeading
                eyebrow="Shared reading"
                title="Good for two"
                description="Shorter books that suit reading at the same pace."
              />
              <div className="mt-5 space-y-3">
                {sections.shared.map((book) => (
                  <button
                    key={book.title}
                    type="button"
                    onClick={() => setActive(book)}
                    className="paper-card flex w-full items-center gap-3 rounded-md p-2.5 text-left transition hover:border-olive/40"
                  >
                    <BookCover
                      title={book.title}
                      author={book.author}
                      coverUrl={book.coverUrl}
                      className="w-10 shrink-0"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="font-display block truncate text-[0.95rem]">
                        {book.title}
                      </span>
                      <span className="block truncate text-[0.68rem] text-muted-foreground">
                        {book.author} · {book.pageCount} pages
                      </span>
                    </span>
                    <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </section>
          </div>

          {recent && recent.length ? (
            <section className="mt-12">
              <SectionHeading
                eyebrow="Recently discovered"
                title="Already saved in your universe"
                description="Books you or your partner added from this catalogue."
              />
              <div className="mt-5 flex gap-3 overflow-x-auto pb-2">
                {recent.map((book) => (
                  <Link
                    key={book._id}
                    to={`/book/${book._id}`}
                    className="paper-card w-32 shrink-0 rounded-md p-2.5 transition hover:border-olive/40"
                  >
                    <BookCover title={book.title} author={book.author} coverUrl={book.coverUrl} />
                    <p className="font-display mt-2 line-clamp-2 text-[0.8rem] leading-snug">
                      {book.title}
                    </p>
                    <p className="truncate text-[0.62rem] text-muted-foreground">{book.author}</p>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-5 text-[0.72rem] text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <Sparkles className="size-3.5 text-gold" />
          Catalogue data and covers come from Google Books and Open Library.
        </span>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={() => setManualOpen(true)}
        >
          <Plus className="mr-1.5 size-3.5" /> Can't find it? Add manually
        </Button>
      </div>

      <Dialog open={Boolean(active)} onOpenChange={(open) => !open && setActive(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto bg-card sm:max-w-2xl">
          {active ? (
            <>
              <DialogHeader>
                <p className="label-caps">{bookInDialog?.genre ?? "Catalogue edition"}</p>
                <DialogTitle className="font-display text-2xl leading-tight">
                  {bookInDialog?.title ?? active.title}
                </DialogTitle>
                <DialogDescription>{bookInDialog?.author ?? active.author}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-5 py-2 sm:grid-cols-[150px_1fr]">
                <div>
                  <BookCover
                    title={bookInDialog?.title ?? active.title}
                    author={bookInDialog?.author ?? active.author}
                    coverUrl={bookInDialog?.coverUrl}
                  />
                  <div className="mt-3 space-y-1 text-[0.7rem] text-muted-foreground">
                    {bookInDialog?.pageCount ? <p>{bookInDialog.pageCount} pages</p> : null}
                    {bookInDialog?.language ? <p>{bookInDialog.language}</p> : null}
                    {bookInDialog?.publishedYear ? (
                      <p>
                        {bookInDialog.publishedYear}
                        {bookInDialog.publisher ? ` · ${bookInDialog.publisher}` : ""}
                      </p>
                    ) : null}
                    {bookInDialog?.isbn ? <p className="font-mono">ISBN {bookInDialog.isbn}</p> : null}
                    {bookInDialog?.series ? <p>{bookInDialog.series}</p> : null}
                    {active.rating ? (
                      <span className="inline-flex items-center gap-1">
                        <Stars value={active.rating} size={11} />
                        {active.rating.toFixed(1)} catalogue rating
                      </span>
                    ) : null}
                  </div>
                </div>
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <p className="max-h-32 flex-1 overflow-y-auto text-[0.8rem] leading-relaxed text-muted-foreground">
                      {bookInDialog?.description ??
                        "No description is available for this edition. You can add your own notes after saving it."}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="shrink-0 rounded-full text-[0.7rem]"
                      onClick={() => setEditingDetails((current) => !current)}
                    >
                      {editingDetails ? "Done editing" : "Edit details"}
                    </Button>
                  </div>
                  {editingDetails && draft ? (
                    <div className="mt-3 grid gap-3 rounded-lg border border-border/70 bg-secondary/35 p-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="discover-title" className="label-caps">Title</Label>
                        <Input id="discover-title" value={draft.title} onChange={(event) => updateDraftText("title", event.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="discover-author" className="label-caps">Author</Label>
                        <Input id="discover-author" value={draft.author} onChange={(event) => updateDraftText("author", event.target.value)} />
                      </div>
                      <div className="grid grid-cols-[5rem_minmax(0,1fr)] items-start gap-3 sm:col-span-2 sm:grid-cols-[7rem_minmax(0,1fr)]">
                        <CoverUrlPreview url={draft.coverUrl} title={draft.title} />
                        <div className="space-y-1.5">
                          <Label htmlFor="discover-cover" className="label-caps">Cover image URL</Label>
                          <Input
                            id="discover-cover"
                            type="url"
                            value={draft.coverUrl ?? ""}
                            onChange={(event) => updateDraftText("coverUrl", event.target.value)}
                            placeholder="Paste a Google Books image URL"
                          />
                          {active.coverUrl ? (
                            <Button
                              type="button"
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-xs"
                              onClick={() => updateDraftText("coverUrl", active.coverUrl ?? "")}
                            >
                              Use catalogue cover
                            </Button>
                          ) : null}
                          <p className="text-[0.65rem] text-muted-foreground">Leave the original link as-is, or paste a direct image URL to use another cover.</p>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="discover-isbn" className="label-caps">ISBN</Label>
                        <Input id="discover-isbn" value={draft.isbn ?? ""} onChange={(event) => updateDraftText("isbn", event.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="discover-genre" className="label-caps">Genre</Label>
                        <Input id="discover-genre" value={draft.genre ?? ""} onChange={(event) => updateDraftText("genre", event.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="discover-language" className="label-caps">Language</Label>
                        <Input id="discover-language" value={draft.language ?? ""} onChange={(event) => updateDraftText("language", event.target.value)} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="discover-pages" className="label-caps">Pages</Label>
                          <Input id="discover-pages" type="number" min={1} value={draft.pageCount ?? ""} onChange={(event) => updateDraftNumber("pageCount", event.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="discover-year" className="label-caps">Year</Label>
                          <Input id="discover-year" type="number" value={draft.publishedYear ?? ""} onChange={(event) => updateDraftNumber("publishedYear", event.target.value)} />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="discover-publisher" className="label-caps">Publisher</Label>
                        <Input id="discover-publisher" value={draft.publisher ?? ""} onChange={(event) => updateDraftText("publisher", event.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="discover-series" className="label-caps">Series</Label>
                        <Input id="discover-series" value={draft.series ?? ""} onChange={(event) => updateDraftText("series", event.target.value)} />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor="discover-format" className="label-caps">Format</Label>
                        <Input id="discover-format" value={draft.format ?? ""} onChange={(event) => updateDraftText("format", event.target.value)} placeholder="Paperback, ebook, audiobook…" />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor="discover-description" className="label-caps">Description</Label>
                        <Textarea id="discover-description" rows={3} value={draft.description ?? ""} onChange={(event) => updateDraftText("description", event.target.value)} />
                      </div>
                    </div>
                  ) : null}
                  <div className="mt-5 space-y-3">
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <Select
                        value={priority}
                        onValueChange={(value) =>
                          setPriority(value as "someday" | "soon" | "next")
                        }
                      >
                        <SelectTrigger className="h-8 w-[130px] text-[0.72rem]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="someday">Someday</SelectItem>
                          <SelectItem value="soon">Soon</SelectItem>
                          <SelectItem value="next">Next</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-[0.68rem] text-muted-foreground">
                        wishlist priority
                      </span>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    <Button
                      className="rounded-full bg-forest text-primary-foreground hover:bg-forest/90"
                      disabled={busy}
                      onClick={() => runAction("start")}
                    >
                      <BookOpen className="mr-2 size-4" /> Add to Currently Reading
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-full"
                      disabled={busy}
                      onClick={() => runAction("wishlist")}
                    >
                      <Bookmark className="mr-2 size-4" /> Add to Wishlist
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-full"
                      disabled={busy}
                      onClick={() => runAction("read")}
                    >
                      <CheckCheck className="mr-2 size-4" /> Mark as Read
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-full sm:col-span-2"
                      disabled={busy}
                      onClick={() => runAction("together")}
                    >
                      <Users className="mr-2 size-4" /> Read Together
                    </Button>
                  </div>
                  <p className="mt-3 text-[0.66rem] leading-relaxed text-muted-foreground">
                    Saving an existing book adds a reading record to the same central volume
                    instead of creating a duplicate spine.
                  </p>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <ManualAddDialog
        open={manualOpen}
        onOpenChange={setManualOpen}
        defaultReader={myUserId}
      />
    </div>
  );
}

function ManualAddDialog({
  open,
  onOpenChange,
  defaultReader,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultReader?: Id<"users">;
}) {
  const startReading = useMutation(api.books.startReading);
  const markAsRead = useMutation(api.books.markAsRead);
  const addWish = useMutation(api.wishlist.add);
  const [form, setForm] = useState({
    title: "",
    author: "",
    isbn: "",
    genre: "Literary Fiction",
    language: "English",
    pageCount: "",
    publishedYear: "",
    coverUrl: "",
    description: "",
  });
  const [busy, setBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<DiscoverBook[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestionChecked, setSuggestionChecked] = useState(false);
  const [selectedSuggestionTitle, setSelectedSuggestionTitle] = useState("");

  useEffect(() => {
    const title = form.title.trim();
    if (!open || title.length < 2 || title.toLowerCase() === selectedSuggestionTitle) {
      setSuggestions([]);
      setSuggesting(false);
      setSuggestionChecked(false);
      return;
    }

    setSuggestions([]);
    setSuggestionChecked(false);
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSuggesting(true);
      try {
        let matches: DiscoverBook[] = [];
        try {
          const response = await fetch(
            `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(title)}&maxResults=5&printType=books`,
            { signal: controller.signal },
          );
          if (!response.ok) throw new Error("Google Books search failed");
          const result = (await response.json()) as { items?: GoogleVolume[] };
          matches = (result.items ?? []).map(fromGoogleVolume);
        } catch {
          if (controller.signal.aborted) return;
        }

        if (!matches.length && !controller.signal.aborted) {
          const response = await fetch(
            `https://openlibrary.org/search.json?q=${encodeURIComponent(title)}&limit=5&fields=key,title,author_name,first_publish_year,cover_i,number_of_pages_median,isbn,subject,publisher`,
            { signal: controller.signal },
          );
          if (!response.ok) throw new Error("Open Library search failed");
          const result = (await response.json()) as {
            docs?: Array<{
              key: string;
              title?: string;
              author_name?: string[];
              first_publish_year?: number;
              cover_i?: number;
              number_of_pages_median?: number;
              isbn?: string[];
              subject?: string[];
              publisher?: string[];
            }>;
          };
          matches = (result.docs ?? []).map((book) => ({
            title: book.title ?? "Untitled",
            author: book.author_name?.join(", ") ?? "Unknown author",
            isbn: book.isbn?.[0],
            coverUrl: book.cover_i
              ? `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg`
              : undefined,
            genre: book.subject?.[0],
            pageCount: book.number_of_pages_median,
            publishedYear: book.first_publish_year,
            publisher: book.publisher?.[0],
            externalRef: `openlibrary:${book.key}`,
          }));
        }
        if (!controller.signal.aborted) setSuggestions(matches);
      } catch {
        if (!controller.signal.aborted) setSuggestions([]);
      } finally {
        if (!controller.signal.aborted) {
          setSuggesting(false);
          setSuggestionChecked(true);
        }
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, form.title, selectedSuggestionTitle]);

  const useSuggestion = (book: DiscoverBook) => {
    setSelectedSuggestionTitle(book.title.trim().toLowerCase());
    setForm((current) => ({
      ...current,
      title: book.title,
      author: book.author,
      isbn: book.isbn ?? current.isbn,
      genre: GENRES.find((genre) => genre.toLowerCase() === book.genre?.toLowerCase())
        ?? current.genre,
      language: LANGUAGES.find((language) => language.toLowerCase() === book.language?.toLowerCase())
        ?? current.language,
      pageCount: book.pageCount ? String(book.pageCount) : current.pageCount,
      publishedYear: book.publishedYear ? String(book.publishedYear) : current.publishedYear,
      coverUrl: book.coverUrl ?? current.coverUrl,
      description: book.description ?? current.description,
    }));
    setSuggestions([]);
  };

  const submit = async (mode: "reading" | "wishlist" | "read") => {
    if (!form.title.trim()) {
      toast.error("A title is required.");
      return;
    }
    if (!defaultReader) {
      toast.error("Choose your reader on the PIN login screen first.");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        title: form.title,
        author: form.author || "Unknown author",
        isbn: form.isbn || undefined,
        genre: form.genre || undefined,
        language: form.language || undefined,
        pageCount: Number(form.pageCount) || undefined,
        publishedYear: Number(form.publishedYear) || undefined,
        coverUrl: form.coverUrl || undefined,
        description: form.description || undefined,
      };
      const readerIds = [defaultReader];
      if (mode === "wishlist") {
        await addWish({ book: payload, readerIds, priority: "soon", updateBookDetails: true });
        toast.success("Added to the wishlist.");
      } else if (mode === "read") {
        await markAsRead({ book: payload, readerIds, updateBookDetails: true });
        toast.success("Marked as read and added to your shelf.");
      } else {
        await startReading({
          book: payload,
          readerIds,
          mode: "individual",
          updateBookDetails: true,
        });
        toast.success("Added to Currently Reading.");
      }
      onOpenChange(false);
      setForm({
        title: "",
        author: "",
        isbn: "",
        genre: "Literary Fiction",
        language: "English",
        pageCount: "",
        publishedYear: "",
        coverUrl: "",
        description: "",
      });
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto bg-card sm:max-w-lg">
        <DialogHeader>
          <p className="label-caps">Manual entry</p>
          <DialogTitle className="font-display text-2xl">Add a book by hand</DialogTitle>
          <DialogDescription>
            Use this when a catalogue does not list your edition. Only a title is required.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="relative space-y-1.5">
            <Label htmlFor="manual-title" className="label-caps">
              Title
            </Label>
            <Input
              id="manual-title"
              value={form.title}
              onChange={(event) => {
                setSelectedSuggestionTitle("");
                setForm({ ...form, title: event.target.value });
              }}
              autoComplete="off"
              aria-autocomplete="list"
              aria-controls="manual-book-suggestions"
              placeholder="The book's title"
            />
            {form.title.trim().length >= 2 &&
            (suggesting || suggestions.length > 0 || suggestionChecked) ? (
              <div
                id="manual-book-suggestions"
                role="listbox"
                aria-label="Catalogue suggestions"
                className="absolute inset-x-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground"
              >
                {suggesting && !suggestions.length ? (
                  <p className="px-3 py-2 text-xs text-muted-foreground">Looking for matching books…</p>
                ) : null}
                {suggestionChecked && !suggesting && !suggestions.length ? (
                  <p className="px-3 py-2 text-xs text-muted-foreground">
                    No catalogue matches found. You can keep entering the book details manually.
                  </p>
                ) : null}
                {suggestions.map((book, index) => (
                  <button
                    key={`${book.isbn ?? book.title}-${index}`}
                    type="button"
                    role="option"
                    aria-selected={false}
                    onClick={() => useSuggestion(book)}
                    className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-secondary"
                  >
                    <BookCover
                      title={book.title}
                      author={book.author}
                      coverUrl={book.coverUrl}
                      className="w-9 shrink-0"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{book.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {book.author}{book.publishedYear ? ` · ${book.publishedYear}` : ""}
                      </span>
                    </span>
                    {book.pageCount ? (
                      <span className="shrink-0 text-[0.65rem] text-muted-foreground">{book.pageCount} pp</span>
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}
            <p className="text-[0.65rem] text-muted-foreground">
              Suggestions are optional. You can keep typing your own details.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="manual-author" className="label-caps">
                Author
              </Label>
              <Input
                id="manual-author"
                value={form.author}
                onChange={(event) => setForm({ ...form, author: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="manual-isbn" className="label-caps">
                ISBN
              </Label>
              <Input
                id="manual-isbn"
                value={form.isbn}
                onChange={(event) => setForm({ ...form, isbn: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="manual-pages" className="label-caps">
                Pages
              </Label>
              <Input
                id="manual-pages"
                type="number"
                min={1}
                value={form.pageCount}
                onChange={(event) => setForm({ ...form, pageCount: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="manual-year" className="label-caps">
                Publication year
              </Label>
              <Input
                id="manual-year"
                type="number"
                value={form.publishedYear}
                onChange={(event) => setForm({ ...form, publishedYear: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="label-caps">Genre</Label>
              <Select value={form.genre} onValueChange={(value) => setForm({ ...form, genre: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GENRES.map((genre) => (
                    <SelectItem key={genre} value={genre}>
                      {genre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="label-caps">Language</Label>
              <Select
                value={form.language}
                onValueChange={(value) => setForm({ ...form, language: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((language) => (
                    <SelectItem key={language} value={language}>
                      {language}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-[5rem_minmax(0,1fr)] items-start gap-3 sm:grid-cols-[7rem_minmax(0,1fr)]">
            <CoverUrlPreview url={form.coverUrl} title={form.title} />
            <div className="space-y-1.5">
              <Label htmlFor="manual-cover" className="label-caps">
                Cover image URL
              </Label>
              <Input
                id="manual-cover"
                type="url"
                value={form.coverUrl}
                onChange={(event) => setForm({ ...form, coverUrl: event.target.value })}
                placeholder="https://… (optional)"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="manual-description" className="label-caps">
              Description
            </Label>
            <Textarea
              id="manual-description"
              rows={3}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </div>
        </div>
        <div className="mt-2 flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="outline" disabled={busy} onClick={() => submit("wishlist")}>
            <Bookmark className="mr-2 size-4" /> Wishlist
          </Button>
          <Button variant="outline" disabled={busy} onClick={() => submit("read")}>
            <CheckCheck className="mr-2 size-4" /> Mark as read
          </Button>
          <Button
            className="rounded-full bg-forest text-primary-foreground hover:bg-forest/90"
            disabled={busy}
            onClick={() => submit("reading")}
          >
            <BookOpen className="mr-2 size-4" /> Start reading
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
