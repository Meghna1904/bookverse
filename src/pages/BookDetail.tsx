import { api } from "@/lib/data-api";
import type { Id } from "@/lib/db-types";
import {
  BookCover,
  SectionHeading,
  Stars,
} from "@/components/bookverse/primitives";
import {
  FinishDialog,
  ProgressDialog,
  ReviewDialog,
} from "@/components/bookverse/dialogs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { errorMessage, formatDate, formatDayKey, formatMinutes } from "@/lib/bookverse";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "@/lib/data-hooks";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  FileText,
  Loader2,
  PenLine,
  Star,
} from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { toast } from "sonner";

function toDateInput(value?: number | null) {
  if (!value) return "";
  const date = new Date(value);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function fromDateInput(value: string) {
  return value ? new Date(`${value}T12:00:00`).getTime() : null;
}

type BookEditDraft = Record<string, string>;
type RecordEditDraft = {
  status: string;
  mode: string;
  source: string;
  startDate: string;
  completionDate: string;
  currentPage: string;
  rating: string;
  review: string;
  notes: string;
};

export default function BookDetail() {
  const { bookId } = useParams<{ bookId: string }>();
  const data = useQuery(
    api.books.bookDetail,
    bookId ? { bookId: bookId as Id<"books"> } : "skip",
  );
  const startReading = useMutation(api.books.startReading);
  const updateBookDetails = useMutation(api.books.updateDetails);
  const updateReadingRecord = useMutation(api.books.updateRecord);
  const completeRecord = useMutation(api.books.completeRecord);
  const [progressOpen, setProgressOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [bookEditOpen, setBookEditOpen] = useState(false);
  const [bookDraft, setBookDraft] = useState<BookEditDraft | null>(null);
  const [recordEditOpen, setRecordEditOpen] = useState(false);
  const [recordDraft, setRecordDraft] = useState<RecordEditDraft | null>(null);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  if (data === undefined) {
    return <div className="h-96 animate-pulse rounded-lg bg-secondary/60" />;
  }
  if (data === null) {
    return (
      <div className="paper-panel rounded-lg px-6 py-16 text-center">
        <h1 className="font-display text-2xl">This book is not on your shelves.</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Either it was removed, or it belongs to another household.
        </p>
        <Button asChild className="mt-5 rounded-full bg-forest text-primary-foreground">
          <Link to="/shelf">Back to Our Shelf</Link>
        </Button>
      </div>
    );
  }

  const { book, records, readers, wishes, documents, myUserId } = data;
  const nameFor = (id: string) =>
    readers.find((reader) => reader.userId === id)?.displayName ?? "Reader";
  const myRecord = records.find(
    (record) => record.readerId === myUserId && record.status === "reading",
  );
  const myCompleted = records.find(
    (record) => record.readerId === myUserId && record.status === "completed",
  );
  const totalPages = book.pageCount ?? 0;
  const readerIds = new Set(records.map((record) => record.readerId));

  const startMyRecord = async () => {
    setStarting(true);
    try {
      await startReading({
        book: {
          title: book.title,
          author: book.author,
          isbn: book.isbn,
          description: book.description,
          coverUrl: book.coverUrl,
          genre: book.genre,
          language: book.language,
          pageCount: book.pageCount,
          publisher: book.publisher,
          publishedYear: book.publishedYear,
          series: book.series,
          externalRef: book.externalRef,
        },
        readerIds: [myUserId],
        mode: "individual",
      });
      toast.success("Your reading record is open.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setStarting(false);
    }
  };

  const openBookEditor = () => {
    setBookDraft({
      title: book.title ?? "",
      author: book.author ?? "",
      isbn: book.isbn ?? "",
      description: book.description ?? "",
      coverUrl: book.coverUrl ?? "",
      genre: book.genre ?? "",
      language: book.language ?? "",
      pageCount: book.pageCount == null ? "" : String(book.pageCount),
      publisher: book.publisher ?? "",
      publishedYear: book.publishedYear == null ? "" : String(book.publishedYear),
      series: book.series ?? "",
      externalRef: book.externalRef ?? "",
      format: book.format ?? "",
      spineColor: book.spineColor ?? "",
    });
    setBookEditOpen(true);
  };

  const openRecordEditor = (record: (typeof records)[number]) => {
    setEditingRecordId(record._id);
    setRecordDraft({
      status: record.status ?? "reading",
      mode: record.mode ?? "individual",
      source: record.source ?? "physical",
      startDate: toDateInput(record.startDate),
      completionDate: toDateInput(record.completionDate),
      currentPage: String(record.currentPage ?? 0),
      rating: record.rating == null ? "" : String(record.rating),
      review: record.review ?? "",
      notes: record.notes ?? "",
    });
    setRecordEditOpen(true);
  };

  const saveBookDetails = async () => {
    if (!bookDraft) return;
    setSavingEdit(true);
    try {
      await updateBookDetails({ bookId: book._id, details: bookDraft });
      toast.success("Book details updated.");
      setBookEditOpen(false);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSavingEdit(false);
    }
  };

  const saveRecordDetails = async () => {
    if (!recordDraft || !editingRecordId) return;
    if (recordDraft.status === "completed" && !recordDraft.completionDate) {
      toast.error("Choose the date you finished reading.");
      return;
    }
    setSavingEdit(true);
    try {
      await updateReadingRecord({
        recordId: editingRecordId,
        record: {
          ...recordDraft,
          startDate: fromDateInput(recordDraft.startDate),
          completionDate: fromDateInput(recordDraft.completionDate),
        },
      });
      toast.success("Reading record updated.");
      setRecordEditOpen(false);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSavingEdit(false);
    }
  };

  const finishRecord = myRecord ?? myCompleted;

  return (
    <div className="pb-6">
      <Link
        to="/shelf"
        className="inline-flex items-center gap-2 text-[0.72rem] text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Back to Our Shelf
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[300px_1fr]">
        <div>
          <div className="mx-auto w-full max-w-[240px] lg:max-w-none">
            <BookCover
              title={book.title}
              author={book.author}
              coverUrl={data.coverUrl ?? book.coverUrl}
            />
          </div>
          <div className="mt-6 space-y-3 text-[0.78rem]">
            <div className="flex justify-between gap-3 border-b border-border/60 pb-2">
              <span className="text-muted-foreground">Genre</span>
              <span className="text-right">{book.genre ?? "Unclassified"}</span>
            </div>
            <div className="flex justify-between gap-3 border-b border-border/60 pb-2">
              <span className="text-muted-foreground">Language</span>
              <span>{book.language ?? "—"}</span>
            </div>
            <div className="flex justify-between gap-3 border-b border-border/60 pb-2">
              <span className="text-muted-foreground">Pages</span>
              <span>{book.pageCount ?? "—"}</span>
            </div>
            <div className="flex justify-between gap-3 border-b border-border/60 pb-2">
              <span className="text-muted-foreground">Published</span>
              <span>
                {book.publishedYear ?? "—"}
                {book.publisher ? ` · ${book.publisher}` : ""}
              </span>
            </div>
            {book.isbn ? (
              <div className="flex justify-between gap-3 border-b border-border/60 pb-2">
                <span className="text-muted-foreground">ISBN</span>
                <span className="font-mono text-[0.7rem]">{book.isbn}</span>
              </div>
            ) : null}
            {book.series ? (
              <div className="flex justify-between gap-3 border-b border-border/60 pb-2">
                <span className="text-muted-foreground">Series</span>
                <span className="text-right">{book.series}</span>
              </div>
            ) : null}
          </div>
          {documents.length ? (
            <div className="mt-5 space-y-2">
              <p className="label-caps">Digital copies</p>
              {documents.map((doc) => (
                <Button
                  key={doc._id}
                  asChild
                  variant="outline"
                  className="w-full justify-start rounded-md text-[0.75rem]"
                >
                  <Link to={`/read/${doc._id}`}>
                    <FileText className="mr-2 size-3.5" />
                    Read the PDF ({doc.totalPages} pages)
                  </Link>
                </Button>
              ))}
            </div>
          ) : null}
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="label-caps">{book.genre ?? "From your shelves"}</p>
            {book.format === "digital" ? (
              <span className="rounded-full border border-border px-2 py-0.5 text-[0.6rem] tracking-[0.12em] text-muted-foreground uppercase">
                Digital
              </span>
            ) : null}
          </div>
          <h1 className="font-display mt-2 text-[2.3rem] leading-[1.02] text-balance sm:text-[2.8rem]">
            {book.title}
          </h1>
          <p className="font-display-italic mt-1 text-lg text-muted-foreground">
            {book.author}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4 rounded-full"
            onClick={openBookEditor}
          >
            <PenLine className="mr-2 size-3.5" /> Edit book details
          </Button>
          {book.description ? (
            <p className="mt-5 max-w-2xl text-[0.88rem] leading-relaxed text-muted-foreground">
              {book.description}
            </p>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-2">
            {myRecord ? (
              <>
                <Button
                  className="rounded-full bg-forest text-primary-foreground hover:bg-forest/90"
                  onClick={() => setProgressOpen(true)}
                >
                  <BookOpen className="mr-2 size-4" />
                  Continue at page {myRecord.currentPage}
                </Button>
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={() => setFinishOpen(true)}
                >
                  <Star className="mr-2 size-4" /> Mark finished
                </Button>
              </>
            ) : null}
            {myCompleted ? (
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => setReviewOpen(true)}
              >
                <PenLine className="mr-2 size-4" /> Edit my review
              </Button>
            ) : null}
            {!readerIds.has(myUserId) ? (
              <Button
                className="rounded-full bg-forest text-primary-foreground hover:bg-forest/90"
                onClick={startMyRecord}
                disabled={starting}
              >
                {starting ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <BookOpen className="mr-2 size-4" />
                )}
                Start my own reading record
              </Button>
            ) : null}
          </div>

          {wishes.length ? (
            <div className="mt-6 rounded-md border border-gold/30 bg-gold/8 px-4 py-3">
              <p className="label-caps">On the wishlist</p>
              <p className="mt-1 text-[0.8rem]">
                Wanted by{" "}
                {wishes
                  .map((wish) => `${nameFor(wish.readerId)} (${wish.priority})`)
                  .join(", ")}
              </p>
              {wishes.find((wish) => wish.note) ? (
                <p className="mt-1 text-[0.75rem] text-muted-foreground italic">
                  “{wishes.find((wish) => wish.note)?.note}”
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="mt-9">
            <SectionHeading
              eyebrow="Reading records"
              title="Who read it, and what they thought."
              description="Each reader keeps a separate record inside this one book."
            />
            <div className="mt-4 space-y-4">
              {records.map((record) => (
                <article key={record._id} className="paper-card rounded-lg p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-lg">
                        {nameFor(record.readerId)}
                        {record.readerId === myUserId ? " (you)" : ""}
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.68rem] text-muted-foreground">
                        <span className="capitalize">{record.mode} reading</span>
                        <span>·</span>
                        <span className="capitalize">{record.source} copy</span>
                        <span>·</span>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1",
                            record.status === "completed" ? "text-olive" : "text-terracotta",
                          )}
                        >
                          <span className="size-1.5 rounded-full bg-current" />
                          {record.status === "completed" ? "Completed" : "Reading"}
                        </span>
                      </p>
                    </div>
                    {record.rating ? (
                      <div className="text-right">
                        <Stars value={record.rating} />
                        <p className="mt-1 text-[0.65rem] text-muted-foreground">
                          {record.rating} / 5
                        </p>
                      </div>
                    ) : (
                      <span className="text-[0.68rem] text-muted-foreground italic">
                        Not yet rated
                      </span>
                    )}
                  </div>

                  <div className="mt-4 grid gap-3 text-[0.75rem] sm:grid-cols-3">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="size-3.5 text-muted-foreground" />
                      <span>
                        Started {formatDate(record.startDate)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BookOpen className="size-3.5 text-muted-foreground" />
                      <span>
                        {record.currentPage}
                        {totalPages ? ` of ${totalPages}` : ""} pages
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Star className="size-3.5 text-muted-foreground" />
                      <span>
                        {record.completionDate
                          ? `Finished ${formatDate(record.completionDate)}`
                          : "In progress"}
                      </span>
                    </div>
                  </div>

                  {record.review ? (
                    <blockquote className="mt-4 border-l-2 border-gold/60 pl-4 text-[0.83rem] leading-relaxed text-foreground/90 italic">
                      {record.review}
                    </blockquote>
                  ) : record.status === "completed" ? (
                    <p className="mt-4 text-[0.75rem] text-muted-foreground italic">
                      No review written for this one.
                    </p>
                  ) : null}

                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-[0.7rem]"
                      onClick={() => openRecordEditor(record)}
                    >
                      <PenLine className="mr-1.5 size-3.5" /> Edit reading record
                    </Button>
                    {record.readerId === myUserId && record.status === "completed" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-[0.7rem]"
                        onClick={() => setReviewOpen(true)}
                      >
                        <PenLine className="mr-1.5 size-3.5" /> Edit review
                      </Button>
                    ) : null}
                  </div>
                </article>
              ))}
              {records.length === 0 ? (
                <p className="paper-panel rounded-lg px-5 py-8 text-center text-[0.8rem] text-muted-foreground">
                  No reading records yet. Start one to begin tracking pages.
                </p>
              ) : null}
            </div>
          </div>

          {data.history.length ? (
            <div className="mt-8">
              <SectionHeading
                eyebrow="Reading history"
                title="The days that made up this book."
                description="Every counted session for this title, newest first."
              />
              <ul className="paper-card mt-4 divide-y divide-border/60 rounded-lg px-5 py-2">
                {data.history.map((session) => (
                  <li
                    key={session._id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-[0.75rem]"
                  >
                    <span className="text-muted-foreground">
                      <span className="text-foreground">
                        {nameFor(session.readerId)}
                      </span>{" "}
                      read on {formatDayKey(session.dayKey)}
                    </span>
                    <span className="flex items-center gap-3 text-muted-foreground">
                      <span>{session.pages} pages</span>
                      {session.minutes ? <span>{formatMinutes(session.minutes)}</span> : null}
                      <span className="rounded-full border border-border px-1.5 py-0.5 text-[0.55rem] tracking-[0.1em] uppercase">
                        {session.source}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      <Dialog open={bookEditOpen} onOpenChange={setBookEditOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto bg-card sm:max-w-2xl">
          <DialogHeader>
            <p className="label-caps">Book details</p>
            <DialogTitle className="font-display text-2xl">Edit this book</DialogTitle>
            <DialogDescription>
              Update the shared book information shown across your shelves.
            </DialogDescription>
          </DialogHeader>
          {bookDraft ? (
            <div className="space-y-4 py-1">
              <div className="grid grid-cols-[5rem_minmax(0,1fr)] items-start gap-3 sm:grid-cols-[7rem_minmax(0,1fr)]">
                <BookCover
                  title={bookDraft.title || "Book cover"}
                  author={bookDraft.author}
                  coverUrl={bookDraft.coverUrl}
                  className="max-w-28"
                />
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="book-edit-cover">Cover image URL</Label>
                    <Input
                      id="book-edit-cover"
                      type="url"
                      value={bookDraft.coverUrl}
                      onChange={(event) => setBookDraft({ ...bookDraft, coverUrl: event.target.value })}
                      placeholder="https://…"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">The preview updates when you paste a valid image link.</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="book-edit-title">Title</Label>
                  <Input id="book-edit-title" value={bookDraft.title} onChange={(event) => setBookDraft({ ...bookDraft, title: event.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="book-edit-author">Author</Label>
                  <Input id="book-edit-author" value={bookDraft.author} onChange={(event) => setBookDraft({ ...bookDraft, author: event.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="book-edit-isbn">ISBN</Label>
                  <Input id="book-edit-isbn" value={bookDraft.isbn} onChange={(event) => setBookDraft({ ...bookDraft, isbn: event.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="book-edit-genre">Genre</Label>
                  <Input id="book-edit-genre" value={bookDraft.genre} onChange={(event) => setBookDraft({ ...bookDraft, genre: event.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="book-edit-language">Language</Label>
                  <Input id="book-edit-language" value={bookDraft.language} onChange={(event) => setBookDraft({ ...bookDraft, language: event.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="book-edit-pages">Pages</Label>
                    <Input id="book-edit-pages" type="number" min={1} value={bookDraft.pageCount} onChange={(event) => setBookDraft({ ...bookDraft, pageCount: event.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="book-edit-year">Published year</Label>
                    <Input id="book-edit-year" type="number" min={1} value={bookDraft.publishedYear} onChange={(event) => setBookDraft({ ...bookDraft, publishedYear: event.target.value })} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="book-edit-publisher">Publisher</Label>
                  <Input id="book-edit-publisher" value={bookDraft.publisher} onChange={(event) => setBookDraft({ ...bookDraft, publisher: event.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="book-edit-series">Series</Label>
                  <Input id="book-edit-series" value={bookDraft.series} onChange={(event) => setBookDraft({ ...bookDraft, series: event.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="book-edit-format">Format</Label>
                  <Input id="book-edit-format" value={bookDraft.format} onChange={(event) => setBookDraft({ ...bookDraft, format: event.target.value })} placeholder="Paperback, ebook, audiobook…" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="book-edit-spine">Spine color</Label>
                  <Input id="book-edit-spine" value={bookDraft.spineColor} onChange={(event) => setBookDraft({ ...bookDraft, spineColor: event.target.value })} placeholder="#6b754b" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="book-edit-description">Description</Label>
                  <Textarea id="book-edit-description" rows={4} value={bookDraft.description} onChange={(event) => setBookDraft({ ...bookDraft, description: event.target.value })} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="book-edit-external">Catalogue reference</Label>
                  <Input id="book-edit-external" value={bookDraft.externalRef} onChange={(event) => setBookDraft({ ...bookDraft, externalRef: event.target.value })} />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setBookEditOpen(false)}>Cancel</Button>
                <Button type="button" disabled={savingEdit} onClick={saveBookDetails} className="rounded-full bg-forest text-primary-foreground hover:bg-forest/90">
                  {savingEdit ? <Loader2 className="mr-2 size-4 animate-spin" /> : null} Save book details
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={recordEditOpen} onOpenChange={setRecordEditOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto bg-card sm:max-w-lg">
          <DialogHeader>
            <p className="label-caps">Reading record</p>
            <DialogTitle className="font-display text-2xl">Edit reading details</DialogTitle>
            <DialogDescription>
              Change the reader’s progress, dates, status, rating and notes.
            </DialogDescription>
          </DialogHeader>
          {recordDraft ? (
            <div className="space-y-4 py-1">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="record-edit-status">Status</Label>
                  <select id="record-edit-status" className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={recordDraft.status} onChange={(event) => setRecordDraft({ ...recordDraft, status: event.target.value })}>
                    <option value="reading">Currently reading</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="record-edit-mode">Reading together</Label>
                  <select id="record-edit-mode" className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={recordDraft.mode} onChange={(event) => setRecordDraft({ ...recordDraft, mode: event.target.value })}>
                    <option value="individual">Individual</option>
                    <option value="together">Together</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="record-edit-source">Copy type</Label>
                  <select id="record-edit-source" className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={recordDraft.source} onChange={(event) => setRecordDraft({ ...recordDraft, source: event.target.value })}>
                    <option value="physical">Physical copy</option>
                    <option value="digital">Digital copy</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="record-edit-page">Current page</Label>
                  <Input id="record-edit-page" type="number" min={0} max={book.pageCount ?? undefined} value={recordDraft.currentPage} onChange={(event) => setRecordDraft({ ...recordDraft, currentPage: event.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="record-edit-start">Started reading</Label>
                  <Input id="record-edit-start" type="date" value={recordDraft.startDate} onChange={(event) => setRecordDraft({ ...recordDraft, startDate: event.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="record-edit-finish">Finished reading</Label>
                  <Input id="record-edit-finish" type="date" value={recordDraft.completionDate} onChange={(event) => setRecordDraft({ ...recordDraft, completionDate: event.target.value })} disabled={recordDraft.status !== "completed"} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="record-edit-rating">Rating (½–5 stars)</Label>
                  <Input id="record-edit-rating" type="number" min={0.5} max={5} step={0.5} value={recordDraft.rating} onChange={(event) => setRecordDraft({ ...recordDraft, rating: event.target.value })} placeholder="Optional" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="record-edit-review">Review</Label>
                  <Textarea id="record-edit-review" rows={3} value={recordDraft.review} onChange={(event) => setRecordDraft({ ...recordDraft, review: event.target.value })} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="record-edit-notes">Private notes</Label>
                  <Textarea id="record-edit-notes" rows={3} value={recordDraft.notes} onChange={(event) => setRecordDraft({ ...recordDraft, notes: event.target.value })} />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setRecordEditOpen(false)}>Cancel</Button>
                <Button type="button" disabled={savingEdit} onClick={saveRecordDetails} className="rounded-full bg-forest text-primary-foreground hover:bg-forest/90">
                  {savingEdit ? <Loader2 className="mr-2 size-4 animate-spin" /> : null} Save reading record
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {myRecord ? (
        <ProgressDialog
          open={progressOpen}
          onOpenChange={setProgressOpen}
          recordId={myRecord._id}
          book={{ _id: book._id, title: book.title, pageCount: book.pageCount }}
          totalPages={totalPages || 1}
          initialPage={myRecord.currentPage}
        />
      ) : null}

      {finishRecord ? (
        <FinishDialog
          open={finishOpen}
          onOpenChange={setFinishOpen}
          title={book.title}
          onComplete={async (input) => {
            await completeRecord({ recordId: finishRecord._id, ...input });
          }}
        />
      ) : null}

      {myCompleted ? (
        <ReviewDialog
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          recordId={myCompleted._id}
          title={book.title}
          initialRating={myCompleted.rating}
          initialReview={myCompleted.review}
          initialNotes={myCompleted.notes}
        />
      ) : null}
    </div>
  );
}
