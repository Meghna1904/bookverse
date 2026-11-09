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

export default function BookDetail() {
  const { bookId } = useParams<{ bookId: string }>();
  const data = useQuery(
    api.books.bookDetail,
    bookId ? { bookId: bookId as Id<"books"> } : "skip",
  );
  const startReading = useMutation(api.books.startReading);
  const completeRecord = useMutation(api.books.completeRecord);
  const [progressOpen, setProgressOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [starting, setStarting] = useState(false);

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

                  {record.readerId === myUserId && record.status === "completed" ? (
                    <div className="mt-4 flex justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-[0.7rem]"
                        onClick={() => setReviewOpen(true)}
                      >
                        <PenLine className="mr-1.5 size-3.5" /> Edit review
                      </Button>
                    </div>
                  ) : null}
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
