import { api } from "@/lib/data-api";
import type { Doc, Id } from "@/lib/db-types";
import { BookSpine, PageHeader } from "@/components/bookverse/primitives";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { errorMessage } from "@/lib/bookverse";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "@/lib/data-hooks";
import {
  ArrowDownAZ,
  ArrowRight,
  ArrowUpAZ,
  BookOpen,
  Check,
  Paintbrush,
  RotateCcw,
  Search,
  Sprout,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";

const PER_ROW = 6;

const SPINE_COLORS = [
  { name: "Forest", value: "#40523b" },
  { name: "Olive", value: "#75805f" },
  { name: "Sage", value: "#9aa786" },
  { name: "Terracotta", value: "#a75f3d" },
  { name: "Rust", value: "#8b4e32" },
  { name: "Antique gold", value: "#b99a55" },
  { name: "Ochre", value: "#c39a52" },
  { name: "Walnut", value: "#6e4b2f" },
  { name: "Ink", value: "#313339" },
  { name: "Dusty rose", value: "#b9857b" },
  { name: "Plum", value: "#6e5568" },
  { name: "Cream", value: "#dfcfb2" },
];

type Reader = {
  userId: Id<"users">;
  displayName: string;
};

type ShelfEntry = {
  book: Doc<"books">;
  records: Doc<"readingRecords">[];
};

function hashTitle(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 9973;
  }
  return hash;
}

function chunkRows(entries: ShelfEntry[]) {
  const rows: ShelfEntry[][] = [];
  for (let index = 0; index < entries.length; index += PER_ROW) {
    rows.push(entries.slice(index, index + PER_ROW));
  }
  return rows;
}

function PottedPlant() {
  return (
    <svg
      viewBox="0 0 82 96"
      className="h-full w-auto overflow-visible drop-shadow-[0_6px_6px_rgba(30,18,8,0.28)]"
      aria-hidden
    >
      <path
        d="M28 66c-3-14 1-27 11-36M32 60C24 48 19 35 22 22M39 62c2-16 11-27 22-33M42 56c9-9 20-13 31-11"
        fill="none"
        stroke="#566447"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M22 25c-8-4-12-13-8-21 8 0 14 6 15 15-1 5-4 7-7 6ZM65 26c1-11 8-17 16-16 2 9-3 18-12 21-2-1-3-3-4-5ZM23 46c-9-1-15-7-14-16 9-1 16 4 19 12 0 3-2 4-5 4ZM74 52c-2-9 2-16 11-18 3 8-1 16-9 20-1 0-1-1-2-2ZM31 57c-7-5-9-13-4-20 7 3 11 10 9 18-1 1-3 2-5 2Z"
        fill="#75805f"
        opacity="0.86"
      />
      <path
        d="M25 70h31l-4 22H29l-4-22Z"
        fill="#a75f3d"
      />
      <path d="M25 70h31l-1.2 6H26.2L25 70Z" fill="#bb7450" />
      <path d="M30 70v22M40 70v22M50 70v22" stroke="#8f4e33" strokeWidth="0.7" opacity="0.55" />
      <ellipse cx="40.5" cy="92" rx="12" ry="2.2" fill="#5a3a25" opacity="0.35" />
    </svg>
  );
}

function ReadingLamp() {
  return (
    <svg
      viewBox="0 0 92 78"
      className="h-full w-auto overflow-visible drop-shadow-[0_5px_5px_rgba(30,18,8,0.25)]"
      aria-hidden
    >
      <defs>
        <radialGradient id="lamp-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f1d9a5" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#f1d9a5" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="brass" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#dcc08a" />
          <stop offset="42%" stopColor="#b79455" />
          <stop offset="100%" stopColor="#8a6a35" />
        </linearGradient>
      </defs>
      <ellipse cx="52" cy="44" rx="33" ry="26" fill="url(#lamp-glow)" />
      <ellipse cx="40" cy="72" rx="17" ry="3.5" fill="#3e2b19" opacity="0.35" />
      <path d="M40 70V39" stroke="url(#brass)" strokeWidth="2.2" strokeLinecap="round" />
      <ellipse cx="40" cy="70" rx="15" ry="5.5" fill="url(#brass)" />
      <ellipse cx="40" cy="68.4" rx="13.2" ry="4.2" fill="#c5a46a" />
      <path d="M28 39h24l8 16H20l8-16Z" fill="url(#brass)" />
      <path d="M20 55h40" stroke="#7d5d2d" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M28 39c2-7 20-7 24 0" fill="#e2c994" opacity="0.65" />
      <path d="M20 55c-3 5-1 9 3 10M60 55c3 5 1 9-3 10" stroke="#8a6a35" strokeWidth="1" fill="none" opacity="0.6" />
    </svg>
  );
}

function EmptySecondShelf() {
  return (
    <section aria-label="The second reader shelf" className="relative z-10 h-full px-1 pt-2 pb-5">
      <div className="reader-plaque-row">
        <div className="flex flex-col items-center gap-1.5">
          <div className="wood-nameplate opacity-80">
            <span className="wood-nameplate-label">Right shelf</span>
            <span className="wood-nameplate-name">Waiting for your reader</span>
          </div>
          <span className="text-[0.62rem] tracking-[0.14em] text-[#e7d4b2]/65 uppercase">
            0 volumes · one seat open
          </span>
        </div>
      </div>
      <div className="shelf-stage">
        <div className="shelf-scroll">
          <div className="shelf-empty-note flex-col gap-2">
            <span className="inline-flex items-center gap-2 text-[0.68rem] tracking-[0.1em] uppercase">
              <Users className="size-3.5 opacity-70" />
              Every reader keeps their own shelf
            </span>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="pointer-events-auto rounded-full border-[#c9ab6d]/35 bg-transparent text-[#f0e2c8] hover:bg-[#c9ab6d]/10 hover:text-[#f7ecda]"
            >
              <Link to="/profiles">
                Room access
                <ArrowRight className="ml-1.5 size-3.5" />
              </Link>
            </Button>
          </div>
        </div>
        <div className="wood-board" />
      </div>
    </section>
  );
}

function ReaderShelf({
  reader,
  entries,
  position,
  emptyMessage,
  filtered,
  paintMode,
  onPaint,
}: {
  reader: Reader;
  entries: ShelfEntry[];
  position: "left" | "right";
  emptyMessage: string;
  filtered: boolean;
  paintMode: boolean;
  onPaint: (entry: ShelfEntry) => void;
}) {
  const navigate = useNavigate();
  const rows = chunkRows(entries);
  const volumeLabel = `${entries.length} volume${entries.length === 1 ? "" : "s"}`;

  return (
    <section
      aria-label={`${reader.displayName}'s shelf`}
      className="relative z-10 h-full px-1 pt-2 pb-3"
    >
      <div className="reader-plaque-row">
        <div className="flex flex-col items-center gap-1.5">
          <div className="wood-nameplate">
            <span className="wood-nameplate-label">
              {position === "left" ? "Left shelf" : "Right shelf"}
            </span>
            <span className="wood-nameplate-name">{reader.displayName}</span>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[0.62rem] tracking-[0.14em] text-[#e7d4b2]/70 uppercase">
            {volumeLabel}
            {filtered ? <span className="normal-case tracking-normal opacity-75">· filtered</span> : null}
          </span>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="shelf-stage">
          <div className="shelf-scroll">
            <div className="shelf-empty-note">{emptyMessage}</div>
          </div>
          <div className="wood-board" />
        </div>
      ) : (
        rows.map((row, rowIndex) => (
          <div key={`${reader.userId}-${rowIndex}`} className="shelf-stage">
            <div className="shelf-scroll">
              <div className="shelf-grid">
                {Array.from({ length: PER_ROW }).map((_, slotIndex) => {
                  const entry = row[slotIndex];
                  if (entry) {
                    const hash = hashTitle(entry.book.title);
                    const width = 92 + (hash % 9);
                    const height = 186 + (hash % 45);
                    return (
                      <BookSpine
                        key={entry.book._id}
                        title={entry.book.title}
                        author={entry.book.author}
                        spineColor={entry.book.spineColor}
                        onClick={() =>
                          paintMode
                            ? onPaint(entry)
                            : navigate(`/book/${entry.book._id}`)
                        }
                        className={cn(
                          "justify-self-center hover:-translate-y-1.5 hover:brightness-105 focus-visible:-translate-y-1.5 focus-visible:brightness-110",
                          paintMode &&
                            "ring-2 ring-[#d8ba80]/80 ring-offset-1 ring-offset-[#4b3424]",
                        )}
                        style={{
                          width: `${width}%`,
                          height: `${height}px`,
                        }}
                      />
                    );
                  }
                  if (slotIndex === row.length && row.length < PER_ROW) {
                    return (
                      <span
                        key={`bookend-${rowIndex}`}
                        aria-hidden
                        className="shelf-bookend"
                      />
                    );
                  }
                  return <span key={`empty-${slotIndex}`} aria-hidden />;
                })}
              </div>
            </div>
            <div className="wood-board" />
          </div>
        ))
      )}
    </section>
  );
}

export default function Shelf() {
  const data = useQuery(api.books.shelf);
  const setSpineColor = useMutation(api.books.setSpineColor);
  const navigate = useNavigate();
  const [titleQuery, setTitleQuery] = useState("");
  const [authorQuery, setAuthorQuery] = useState("");
  const [sort, setSort] = useState<"az" | "za">("az");
  const [readerFilter, setReaderFilter] = useState("all");
  const [paintMode, setPaintMode] = useState(false);
  const [colorTarget, setColorTarget] = useState<ShelfEntry | null>(null);
  const [savingColor, setSavingColor] = useState(false);

  const items: ShelfEntry[] = data?.items ?? [];
  const readers: Reader[] = data?.readers ?? [];

  const sections = useMemo(() => {
    const title = titleQuery.trim().toLowerCase();
    const author = authorQuery.trim().toLowerCase();
    return readers.map((reader) => {
      const byBook = new Map<string, ShelfEntry>();
      for (const entry of items) {
        const belongs = entry.records.some((record) => record.readerId === reader.userId);
        if (!belongs) continue;
        if (title && !entry.book.title.toLowerCase().includes(title)) continue;
        if (author && !entry.book.author.toLowerCase().includes(author)) continue;
        if (!byBook.has(entry.book._id)) byBook.set(entry.book._id, entry);
      }
      const entries = [...byBook.values()].sort((a, b) =>
        sort === "az"
          ? a.book.title.localeCompare(b.book.title)
          : b.book.title.localeCompare(a.book.title),
      );
      return { reader, entries };
    });
  }, [items, readers, titleQuery, authorQuery, sort]);

  const totalByReader = useMemo(() => {
    const counts = new Map<string, number>();
    for (const reader of readers) {
      const ids = new Set<string>();
      for (const entry of items) {
        if (entry.records.some((record) => record.readerId === reader.userId)) {
          ids.add(entry.book._id);
        }
      }
      counts.set(reader.userId, ids.size);
    }
    return counts;
  }, [items, readers]);

  const visibleSections =
    readerFilter === "all"
      ? sections
      : sections.filter((section) => section.reader.userId === readerFilter);

  const filtered = Boolean(titleQuery.trim() || authorQuery.trim());
  const hasAnyBooks = items.length > 0;

  return (
    <div className="pb-8">
      <PageHeader
        eyebrow="Our Shelf"
        title="Two shelves, one story."
        description={`The books each of you has finished, kept as real spines on two walnut shelves — six to a row, alphabetically. A title read by both of you appears on both shelves, joined to one book record. ${
          items.length
        } volume${items.length === 1 ? "" : "s"} in the house.`}
        action={
          <Button asChild variant="outline" className="rounded-full border-forest/25">
            <Link to="/discover">
              <BookOpen className="mr-2 size-4" /> Add another book
            </Link>
          </Button>
        }
      />

      <div className="paper-card mb-5 flex flex-wrap items-end gap-x-4 gap-y-3 rounded-lg px-4 py-3.5">
        <div className="relative min-w-[170px] flex-1">
          <Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
          <Input
            value={titleQuery}
            onChange={(event) => setTitleQuery(event.target.value)}
            placeholder="Search by title"
            className="h-9 pl-9"
            aria-label="Search by book title"
          />
        </div>
        <div className="relative min-w-[170px] flex-1">
          <Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
          <Input
            value={authorQuery}
            onChange={(event) => setAuthorQuery(event.target.value)}
            placeholder="Search by author"
            className="h-9 pl-9"
            aria-label="Search by author"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setReaderFilter("all")}
            className={cn(
              "rounded-full border px-3 py-1.5 text-[0.7rem] transition",
              readerFilter === "all"
                ? "border-forest bg-forest text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:border-forest/40",
            )}
          >
            Both shelves
          </button>
          {readers.map((reader) => (
            <button
              key={reader.userId}
              type="button"
              onClick={() => setReaderFilter(reader.userId)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.7rem] transition",
                readerFilter === reader.userId
                  ? "border-forest bg-forest text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-forest/40",
              )}
            >
              {reader.displayName}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[0.55rem] tabular-nums",
                  readerFilter === reader.userId
                    ? "bg-primary-foreground/15"
                    : "bg-secondary text-muted-foreground",
                )}
              >
                {totalByReader.get(reader.userId) ?? 0}
              </span>
            </button>
          ))}
        </div>

        <Button
          variant={paintMode ? "default" : "outline"}
          size="sm"
          className={cn(
            "h-9 gap-1.5 rounded-full text-[0.72rem]",
            paintMode
              ? "bg-forest text-primary-foreground"
              : "border-border",
          )}
          onClick={() => setPaintMode((current) => !current)}
          aria-pressed={paintMode}
        >
          <Paintbrush className="size-3.5" />
          {paintMode ? "Painting spines" : "Paint spines"}
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 rounded-full border-border text-[0.72rem]"
          onClick={() => setSort((current) => (current === "az" ? "za" : "az"))}
          aria-label={`Sort ${sort === "az" ? "Z to A" : "A to Z"}`}
        >
          {sort === "az" ? (
            <ArrowDownAZ className="size-3.5" />
          ) : (
            <ArrowUpAZ className="size-3.5" />
          )}
          {sort === "az" ? "A–Z" : "Z–A"}
        </Button>
      </div>

      {paintMode ? (
        <p className="mb-5 flex flex-wrap items-center gap-2 rounded-md border border-gold/30 bg-gold/8 px-3 py-2 text-[0.7rem] text-muted-foreground">
          <Paintbrush className="size-3.5 shrink-0 text-gold" />
          Painting mode is on. Choose any spine to give it a new colour; the change is
          saved for both readers.
        </p>
      ) : null}

      {!hasAnyBooks && data !== undefined ? (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gold/25 bg-gold/8 px-4 py-3">
          <p className="text-[0.78rem] text-muted-foreground">
            The shelves are waiting for their first finished book. Start one from Discover, or
            upload a PDF in the Library.
          </p>
          <Button asChild size="sm" className="rounded-full bg-forest text-primary-foreground">
            <Link to="/discover">Discover books</Link>
          </Button>
        </div>
      ) : null}

      {data === undefined ? (
        <div className="wood-bookcase h-[38rem] animate-pulse opacity-80" />
      ) : (
        <div className="relative mx-auto mt-4 max-w-[62rem] pt-14 sm:pt-16">
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex h-14 items-end justify-between px-4 sm:h-16 sm:px-8">
            <div className="h-full">
              <PottedPlant />
            </div>
            <div className="hidden h-full sm:block">
              <ReadingLamp />
            </div>
          </div>

          <div className="wood-bookcase">
            <div className="wood-crown" />
            <div className="relative mt-1.5">
              <div className="wood-side wood-side-left" />
              <div className="wood-side wood-side-right" />
              <div className="wood-interior mx-[0.95rem]">
                <div className="shelf-pair">
                  {visibleSections.map((section, index) => (
                    <div className="shelf-column" key={section.reader.userId}>
                      <ReaderShelf
                        reader={section.reader}
                        entries={section.entries}
                        position={index === 0 ? "left" : "right"}
                        filtered={filtered}
                        paintMode={paintMode}
                        onPaint={setColorTarget}
                        emptyMessage={
                          filtered
                            ? `No finished books on ${section.reader.displayName}'s shelf match these searches.`
                            : "Finish a book and its spine will find its place here."
                        }
                      />
                    </div>
                  ))}
                  {readerFilter === "all" && readers.length < 2 ? (
                    <div className="shelf-column">
                      <EmptySecondShelf />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="wood-plinth mt-1.5" />
          </div>

          <p className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-[0.64rem] tracking-[0.13em] text-muted-foreground/80 uppercase">
            <span className="inline-flex items-center gap-1.5">
              <Sprout className="size-3 text-olive" />
              {paintMode ? "Choose a spine to paint" : "Click a spine to open the book"}
            </span>
            <span className="text-border">·</span>
            <span>Sorted {sort === "az" ? "A to Z" : "Z to A"}</span>
            <span className="text-border">·</span>
            <span>Six spines a row, side by side</span>
            <span className="text-border">·</span>
            <span className="inline-flex items-center gap-1.5">
              <Paintbrush className="size-3 text-gold" /> Paint a spine
            </span>
          </p>
        </div>
      )}

      <Dialog open={Boolean(colorTarget)} onOpenChange={(open) => !open && setColorTarget(null)}>
        <DialogContent className="bg-card sm:max-w-md">
          <DialogHeader>
            <p className="label-caps">Spine colours</p>
            <DialogTitle className="font-display text-2xl">
              {colorTarget?.book.title ?? "Choose a colour"}
            </DialogTitle>
            <DialogDescription>
              Pick a book-cloth colour for this spine. Both readers will see it on the
              shared shelf.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-4 gap-2 pt-1 sm:grid-cols-6">
            {SPINE_COLORS.map((color) => {
              const selected = colorTarget?.book.spineColor === color.value;
              return (
                <button
                  key={color.value}
                  type="button"
                  title={color.name}
                  aria-label={color.name}
                  aria-pressed={selected}
                  disabled={savingColor}
                  onClick={async () => {
                    if (!colorTarget) return;
                    setSavingColor(true);
                    try {
                      await setSpineColor({
                        bookId: colorTarget.book._id,
                        color: color.value,
                      });
                      setColorTarget(null);
                      toast.success(`Spine painted ${color.name.toLowerCase()}.`);
                    } catch (error) {
                      toast.error(errorMessage(error));
                    } finally {
                      setSavingColor(false);
                    }
                  }}
                  className={cn(
                    "relative aspect-square rounded-md border-2 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
                    selected
                      ? "border-forest ring-2 ring-forest/25 ring-offset-2"
                      : "border-background",
                  )}
                  style={{ backgroundColor: color.value }}
                >
                  {selected ? (
                    <span className="absolute inset-0 m-auto flex size-5 items-center justify-center rounded-full bg-white/90 text-forest shadow-sm">
                      <Check className="size-3" strokeWidth={2.5} />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex items-center justify-between gap-3 border-t border-border/70 pt-3">
            <span className="text-[0.64rem] text-muted-foreground">
              {colorTarget?.book.spineColor
                ? "This spine has a custom colour."
                : "This spine is wearing its natural colour."}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
              disabled={savingColor || !colorTarget?.book.spineColor}
              onClick={async () => {
                if (!colorTarget) return;
                setSavingColor(true);
                try {
                  await setSpineColor({ bookId: colorTarget.book._id, color: null });
                  setColorTarget(null);
                  toast.success("Natural spine colour restored.");
                } catch (error) {
                  toast.error(errorMessage(error));
                } finally {
                  setSavingColor(false);
                }
              }}
            >
              <RotateCcw className="mr-2 size-3.5" /> Natural colour
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
