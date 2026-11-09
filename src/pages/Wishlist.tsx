import { api } from "@/lib/data-api";
import type { Id } from "@/lib/db-types";
import {
  BookCover,
  EmptyState,
  PageHeader,
  ReaderPicker,
  SectionHeading,
  Stars,
} from "@/components/bookverse/primitives";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { errorMessage, formatDate } from "@/lib/bookverse";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "@/lib/data-hooks";
import {
  Bookmark,
  BookOpen,
  CalendarDays,
  Loader2,
  Pencil,
  Search,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

const PRIORITY_ORDER: Record<string, number> = { next: 0, soon: 1, someday: 2 };
const PRIORITY_STYLE: Record<string, string> = {
  next: "border-terracotta/40 bg-terracotta/10 text-terracotta",
  soon: "border-olive/40 bg-olive/10 text-forest",
  someday: "border-border bg-secondary/60 text-muted-foreground",
};

type WishlistEntry = {
  item: {
    _id: Id<"wishlistItems">;
    bookId: Id<"books">;
    readerId: Id<"users">;
    priority: "someday" | "soon" | "next";
    note?: string;
    addedAt: number;
  };
  book: {
    _id: Id<"books">;
    title: string;
    author: string;
    coverUrl?: string;
    genre?: string;
    language?: string;
    pageCount?: number;
    description?: string;
    isSample?: boolean;
  };
};

export default function Wishlist() {
  const data = useQuery(api.wishlist.list);
  const start = useMutation(api.wishlist.start);
  const combine = useMutation(api.wishlist.combine);
  const [tab, setTab] = useState<"all" | "together" | "mine" | "partner">("all");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [genreFilter, setGenreFilter] = useState("all");
  const [languageFilter, setLanguageFilter] = useState("all");
  const [sort, setSort] = useState("recent");
  const [active, setActive] = useState<WishlistEntry | null>(null);

  const items = (data?.items ?? []) as WishlistEntry[];
  const readers = data?.readers ?? [];
  const myUserId = data?.myUserId;
  const nameFor = (id: string) =>
    id === myUserId ? "You" : (readers.find((reader) => reader.userId === id)?.displayName ?? "Reader");

  const grouped = new Map<string, WishlistEntry[]>();
  for (const entry of items) {
    const list = grouped.get(entry.book._id) ?? [];
    list.push(entry);
    grouped.set(entry.book._id, list);
  }

  const books = [...grouped.entries()]
    .map(([bookId, entries]) => ({
      bookId,
      entries,
      book: entries[0].book,
      readerIds: new Set(entries.map((entry) => entry.item.readerId)),
    }))
    .filter((group) => {
      const query = search.trim().toLowerCase();
      if (
        query &&
        !group.book.title.toLowerCase().includes(query) &&
        !group.book.author.toLowerCase().includes(query)
      ) {
        return false;
      }
      if (genreFilter !== "all" && group.book.genre !== genreFilter) return false;
      if (languageFilter !== "all" && group.book.language !== languageFilter) return false;
      if (priorityFilter !== "all") {
        if (!group.entries.some((entry) => entry.item.priority === priorityFilter)) {
          return false;
        }
      }
      if (tab === "together" && group.readerIds.size < 2) return false;
      if (tab === "mine" && !group.readerIds.has(myUserId as Id<"users">)) return false;
      if (tab === "partner") {
        if (group.readerIds.has(myUserId as Id<"users">)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sort === "alphabetical") return a.book.title.localeCompare(b.book.title);
      if (sort === "priority") {
        const priorityOf = (group: typeof a) =>
          Math.min(...group.entries.map((entry) => PRIORITY_ORDER[entry.item.priority]));
        return priorityOf(a) - priorityOf(b);
      }
      const latest = (group: typeof a) =>
        Math.max(...group.entries.map((entry) => entry.item.addedAt));
      return latest(b) - latest(a);
    });

  const genres = [...new Set(items.map((entry) => entry.book.genre).filter(Boolean))].sort();
  const languages = [
    ...new Set(items.map((entry) => entry.book.language).filter(Boolean)),
  ].sort();

  return (
    <div className="pb-6">
      <PageHeader
        eyebrow="Wishlist"
        title="Stories waiting their turn."
        description="A shared plan for future reading: three shelves of intention, three levels of urgency, and no duplicates when you both want the same book."
        action={
          <Button asChild variant="outline" className="rounded-full border-forest/25">
            <Link to="/discover">
              <Sparkles className="mr-2 size-4" /> Find something to want
            </Link>
          </Button>
        }
      />

      <div className="paper-card rounded-lg px-4 py-3.5">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { value: "all", label: "All books" },
            { value: "together", label: "Together" },
            { value: "mine", label: "My Wishlist" },
            { value: "partner", label: "Partner's Wishlist" },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setTab(option.value as typeof tab)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-[0.72rem] transition",
                tab === option.value
                  ? "border-forest bg-forest text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-forest/40",
              )}
            >
              {option.label}
            </button>
          ))}
          <div className="relative ml-auto min-w-[180px] flex-1 sm:max-w-xs">
            <Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title or author"
              className="h-9 pl-9"
            />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="h-8 w-[140px] rounded-full text-[0.72rem]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any priority</SelectItem>
              <SelectItem value="next">Next</SelectItem>
              <SelectItem value="soon">Soon</SelectItem>
              <SelectItem value="someday">Someday</SelectItem>
            </SelectContent>
          </Select>
          <Select value={genreFilter} onValueChange={setGenreFilter}>
            <SelectTrigger className="h-8 w-[140px] rounded-full text-[0.72rem]">
              <SelectValue placeholder="Genre" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All genres</SelectItem>
              {genres.map((genre) => (
                <SelectItem key={genre} value={genre as string}>
                  {genre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={languageFilter} onValueChange={setLanguageFilter}>
            <SelectTrigger className="h-8 w-[135px] rounded-full text-[0.72rem]">
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All languages</SelectItem>
              {languages.map((language) => (
                <SelectItem key={language} value={language as string}>
                  {language}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="h-8 w-[150px] rounded-full text-[0.72rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Recently added</SelectItem>
              <SelectItem value="alphabetical">Alphabetical</SelectItem>
              <SelectItem value="priority">By priority</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {data === undefined ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-36 animate-pulse rounded-lg bg-secondary/60" />
          ))}
        </div>
      ) : books.length === 0 ? (
        <EmptyState
          className="mt-6"
          title={items.length === 0 ? "Nothing is waiting yet" : "No wishes match those filters"}
          description={
            items.length === 0
              ? "Save a book from Discover. If you both want the same title, it stays one entry with two wishes inside it."
              : "Try clearing the reader, priority, genre or language filters."
          }
          icon={<Bookmark className="size-4" />}
          action={
            <Button asChild className="rounded-full bg-forest text-primary-foreground">
              <Link to="/discover">Discover books</Link>
            </Button>
          }
        />
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {books.map((group) => {
            const primary = group.entries[0];
            const notes = group.entries
              .map((entry) => entry.item.note)
              .filter((note): note is string => Boolean(note));
            return (
              <article
                key={group.bookId}
                className="paper-card paper-card flex cursor-pointer gap-4 rounded-lg p-4 transition hover:border-olive/40"
                onClick={() => setActive(primary)}
              >
                <div className="w-[82px] shrink-0">
                  <BookCover
                    title={group.book.title}
                    author={group.book.author}
                    coverUrl={group.book.coverUrl}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1">
                    {group.entries.map((entry) => (
                      <span
                        key={entry.item._id}
                        className={cn(
                          "rounded-full border px-1.5 py-0.5 text-[0.55rem] tracking-[0.1em] uppercase",
                          PRIORITY_STYLE[entry.item.priority],
                        )}
                      >
                        {entry.item.priority}
                      </span>
                    ))}
                    {group.readerIds.size > 1 ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-forest/25 bg-olive/10 px-1.5 py-0.5 text-[0.55rem] tracking-[0.1em] text-forest uppercase">
                        <Users className="size-2.5" /> together
                      </span>
                    ) : null}
                  </div>
                  <h3 className="font-display mt-1.5 line-clamp-2 text-[1.05rem] leading-snug">
                    {group.book.title}
                  </h3>
                  <p className="truncate text-[0.72rem] text-muted-foreground">
                    {group.book.author}
                  </p>
                  <p className="mt-1.5 text-[0.68rem] text-muted-foreground">
                    Wanted by{" "}
                    {group.entries.map((entry) => nameFor(entry.item.readerId)).join(" & ")}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-[0.63rem] text-muted-foreground/80">
                    <CalendarDays className="size-3" />
                    {formatDate(Math.max(...group.entries.map((e) => e.item.addedAt)))}
                    {group.book.pageCount ? ` · ${group.book.pageCount} pp` : ""}
                  </p>
                  {notes[0] ? (
                    <p className="mt-1.5 line-clamp-2 text-[0.68rem] text-muted-foreground italic">
                      “{notes[0]}”
                    </p>
                  ) : null}
                  <div className="mt-2 flex gap-1.5">
                    <Button
                      size="sm"
                      className="h-6 rounded-full bg-forest px-2.5 text-[0.63rem] text-primary-foreground hover:bg-forest/90"
                      onClick={(event) => {
                        event.stopPropagation();
                        setActive(primary);
                      }}
                    >
                      Open
                    </Button>
                    {group.readerIds.size === 1 && readers.length > 1 ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 rounded-full px-2.5 text-[0.63rem]"
                        onClick={async (event) => {
                          event.stopPropagation();
                          try {
                            await combine({ bookId: group.bookId as Id<"books"> });
                            toast.success("Combined into a Together wish.");
                          } catch (error) {
                            toast.error(errorMessage(error));
                          }
                        }}
                      >
                        Combine
                      </Button>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {active ? (
        <WishDetail
          entry={active}
          entries={grouped.get(active.book._id) ?? [active]}
          readers={readers}
          myUserId={myUserId}
          nameFor={nameFor}
          open={Boolean(active)}
          onOpenChange={(open) => !open && setActive(null)}
          onStart={async (bookId, readerIds) => {
            await start({
              bookId,
              readerIds,
              mode: readerIds.length > 1 ? "together" : "individual",
            });
          }}
        />
      ) : null}
    </div>
  );
}

function WishDetail({
  entry,
  entries,
  readers,
  myUserId,
  nameFor,
  open,
  onOpenChange,
  onStart,
}: {
  entry: WishlistEntry;
  entries: WishlistEntry[];
  readers: Array<{ userId: Id<"users">; displayName: string; isSample?: boolean }>;
  myUserId?: Id<"users">;
  nameFor: (id: string) => string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStart: (bookId: Id<"books">, readerIds: Id<"users">[]) => Promise<void>;
}) {
  const update = useMutation(api.wishlist.update);
  const remove = useMutation(api.wishlist.remove);
  const markAlreadyRead = useMutation(api.wishlist.markAlreadyRead);
  const myEntry = entries.find((wish) => wish.item.readerId === myUserId);
  const [selected, setSelected] = useState<Id<"users">[]>(
    entries.map((wish) => wish.item.readerId),
  );
  const [busy, setBusy] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState(myEntry?.item.note ?? "");
  const [readOpen, setReadOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");

  const startReading = async (all: boolean) => {
    setBusy(true);
    try {
      const ids = all ? readers.map((reader) => reader.userId) : selected;
      if (!ids.length) {
        toast.error("Choose at least one reader.");
        return;
      }
      await onStart(entry.book._id, ids);
      toast.success(all ? "Moved to Currently Reading — together." : "Moved to Currently Reading.");
      onOpenChange(false);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[92vh] overflow-y-auto bg-card sm:max-w-2xl">
          <DialogHeader>
            <p className="label-caps">A wish for later</p>
            <DialogTitle className="font-display text-2xl leading-tight">
              {entry.book.title}
            </DialogTitle>
            <DialogDescription>{entry.book.author}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-1 sm:grid-cols-[160px_1fr]">
            <div>
              <BookCover
                title={entry.book.title}
                author={entry.book.author}
                coverUrl={entry.book.coverUrl}
              />
              <div className="mt-3 space-y-1 text-[0.7rem] text-muted-foreground">
                {entry.book.genre ? <p>{entry.book.genre}</p> : null}
                {entry.book.language ? <p>{entry.book.language}</p> : null}
                {entry.book.pageCount ? <p>{entry.book.pageCount} pages</p> : null}
                <p>Added {formatDate(entry.item.addedAt)}</p>
              </div>
            </div>
            <div>
              {entry.book.description ? (
                <p className="line-clamp-4 text-[0.8rem] leading-relaxed text-muted-foreground">
                  {entry.book.description}
                </p>
              ) : null}
              <div className="mt-4 space-y-3">
                {entries.map((wish) => (
                  <div
                    key={wish.item._id}
                    className="rounded-md border border-border/70 bg-background/60 px-3 py-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[0.8rem]">
                        <span className="font-medium">{nameFor(wish.item.readerId)}</span>{" "}
                        <span className="text-muted-foreground">wants to read this</span>
                      </p>
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[0.58rem] tracking-[0.12em] uppercase",
                          PRIORITY_STYLE[wish.item.priority],
                        )}
                      >
                        {wish.item.priority}
                      </span>
                    </div>
                    {wish.item.note ? (
                      <p className="mt-1 text-[0.72rem] text-muted-foreground italic">
                        “{wish.item.note}”
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-2">
                <Label className="label-caps">Start with</Label>
                <ReaderPicker readers={readers} value={selected} onChange={setSelected} />
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <Button
                  className="rounded-full bg-forest text-primary-foreground hover:bg-forest/90"
                  disabled={busy}
                  onClick={() => startReading(false)}
                >
                  <BookOpen className="mr-2 size-4" /> Start Reading
                </Button>
                <Button
                  variant="outline"
                  className="rounded-full"
                  disabled={busy}
                  onClick={() => startReading(true)}
                >
                  <Users className="mr-2 size-4" /> Read Together
                </Button>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Select
                  value={myEntry?.item.priority ?? "soon"}
                  onValueChange={async (value) => {
                    if (!myEntry) return;
                    try {
                      await update({
                        itemId: myEntry.item._id,
                        priority: value as "someday" | "soon" | "next",
                      });
                      toast.success("Priority changed.");
                    } catch (error) {
                      toast.error(errorMessage(error));
                    }
                  }}
                  disabled={!myEntry}
                >
                  <SelectTrigger className="h-8 w-[140px] text-[0.7rem]">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="someday">Someday</SelectItem>
                    <SelectItem value="soon">Soon</SelectItem>
                    <SelectItem value="next">Next</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-full text-[0.7rem]"
                  disabled={!myEntry}
                  onClick={() => {
                    setNote(myEntry?.item.note ?? "");
                    setNoteOpen(true);
                  }}
                >
                  <Pencil className="mr-1.5 size-3.5" /> Edit note
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-full text-[0.7rem]"
                  onClick={() => setReadOpen(true)}
                >
                  Already read
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-full text-[0.7rem] text-destructive hover:text-destructive"
                  disabled={!myEntry}
                  onClick={async () => {
                    if (!myEntry) return;
                    try {
                      await remove({ itemId: myEntry.item._id });
                      toast.success("Removed from your wishlist.");
                      onOpenChange(false);
                    } catch (error) {
                      toast.error(errorMessage(error));
                    }
                  }}
                >
                  <Trash2 className="mr-1.5 size-3.5" /> Remove
                </Button>
              </div>
              {!myEntry ? (
                <p className="mt-2 text-[0.68rem] text-muted-foreground italic">
                  This is your partner's wish. Start or combine it, but only they can
                  remove or re-note it.
                </p>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent className="bg-card sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Your note</DialogTitle>
            <DialogDescription>
              A private reminder of why this book is waiting. Only you can edit it.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={4}
            maxLength={1000}
            placeholder="Read this when the rain starts…"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setNoteOpen(false)}>
              Cancel
            </Button>
            <Button
              className="rounded-full bg-forest text-primary-foreground"
              onClick={async () => {
                if (!myEntry) return;
                try {
                  await update({ itemId: myEntry.item._id, note });
                  toast.success("Note saved.");
                  setNoteOpen(false);
                } catch (error) {
                  toast.error(errorMessage(error));
                }
              }}
            >
              Save note
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={readOpen} onOpenChange={setReadOpen}>
        <DialogContent className="bg-card sm:max-w-md">
          <DialogHeader>
            <p className="label-caps">Already read</p>
            <DialogTitle className="font-display text-2xl">{entry.book.title}</DialogTitle>
            <DialogDescription>
              This creates your completion record and puts the book on Our Shelf.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <Stars value={rating} onChange={setRating} size={24} />
            <Textarea
              rows={3}
              value={review}
              onChange={(event) => setReview(event.target.value)}
              placeholder="A short review (optional)"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setReadOpen(false)}>
              Cancel
            </Button>
            <Button
              className="rounded-full bg-forest text-primary-foreground"
              onClick={async () => {
                if (!rating) {
                  toast.error("Choose a rating first.");
                  return;
                }
                try {
                  await markAlreadyRead({
                    bookId: entry.book._id,
                    rating,
                    review: review.trim() || undefined,
                  });
                  toast.success("Marked as read and added to Our Shelf.");
                  setReadOpen(false);
                  onOpenChange(false);
                } catch (error) {
                  toast.error(errorMessage(error));
                }
              }}
            >
              Mark as read
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
