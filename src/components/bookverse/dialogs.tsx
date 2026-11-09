import { api } from "@/lib/data-api";
import type { Doc, Id } from "@/lib/db-types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { errorMessage, formatDate, localDayKey, readingPercent } from "@/lib/bookverse";
import { cn } from "@/lib/utils";
import { useMutation } from "@/lib/data-hooks";
import { Loader2, Minus, Plus, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Stars } from "./primitives";

type BookRef = { _id: Id<"books">; title: string; pageCount?: number };

export function ProgressDialog({
  open,
  onOpenChange,
  recordId,
  book,
  totalPages,
  initialPage,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recordId: Id<"readingRecords">;
  book: BookRef;
  totalPages: number;
  initialPage: number;
}) {
  const updateProgress = useMutation(api.books.updateProgress);
  const [page, setPage] = useState(initialPage);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setPage(initialPage);
  }, [open, initialPage]);

  const submit = async () => {
    setBusy(true);
    try {
      await updateProgress({
        recordId,
        currentPage: page,
        dayKey: localDayKey(),
      });
      toast.success(
        page >= totalPages
          ? "You reached the last page — mark it finished when you're ready."
          : `Saved at page ${page} of ${totalPages}.`,
      );
      onOpenChange(false);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card sm:max-w-md">
        <DialogHeader>
          <p className="label-caps">Reading progress</p>
          <DialogTitle className="font-display text-2xl">{book.title}</DialogTitle>
          <DialogDescription>
            Pages you save here also count as reading activity for today's streak.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-1">
          <div className="flex items-center justify-center gap-4">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="rounded-full"
              onClick={() => setPage((current) => Math.max(0, current - 1))}
            >
              <Minus className="size-4" />
            </Button>
            <div className="text-center">
              <Input
                type="number"
                value={page}
                min={initialPage}
                max={totalPages}
                onChange={(event) =>
                  setPage(
                    Math.max(
                      initialPage,
                      Math.min(totalPages, Number(event.target.value) || 0),
                    ),
                  )
                }
                className="h-12 w-24 text-center font-display text-2xl"
              />
              <p className="mt-1 text-[0.66rem] text-muted-foreground">
                of {totalPages} pages · {readingPercent(page, totalPages)}%
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="rounded-full"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              <Plus className="size-4" />
            </Button>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-olive transition-all"
              style={{ width: `${readingPercent(page, totalPages)}%` }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={totalPages}
            value={page}
            onChange={(event) => setPage(Number(event.target.value))}
            className="w-full accent-[var(--olive)]"
            aria-label="Reading progress"
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={busy}
            className="rounded-full bg-forest text-primary-foreground hover:bg-forest/90"
          >
            {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Save progress
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function FinishDialog({
  open,
  onOpenChange,
  title,
  onComplete,
  isDigital = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  isDigital?: boolean;
  onComplete: (input: {
    rating: number;
    review?: string;
    notes?: string;
    completionDate: number;
  }) => Promise<unknown>;
}) {
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(localDayKey());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setRating(0);
      setReview("");
      setNotes("");
      setDate(localDayKey());
    }
  }, [open]);

  const submit = async () => {
    if (!rating) {
      toast.error("Choose a rating from one to five stars.");
      return;
    }
    setBusy(true);
    try {
      await onComplete({
        rating,
        review: review.trim() || undefined,
        notes: notes.trim() || undefined,
        completionDate: new Date(`${date}T12:00:00`).getTime(),
      });
      toast.success(`“${title}” is now on Our Shelf.`);
      onOpenChange(false);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card sm:max-w-lg">
        <DialogHeader>
          <p className="label-caps">Finish a book</p>
          <DialogTitle className="font-display text-2xl">{title}</DialogTitle>
          <DialogDescription>
            {isDigital
              ? "This closes your reading record and adds the book to Our Shelf, keeping its digital history."
              : "Your reading record closes and the book moves to Our Shelf automatically."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="space-y-2">
            <Label className="label-caps">Your rating</Label>
            <Stars value={rating} onChange={setRating} size={26} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="finish-review" className="label-caps">
              Review <span className="normal-case opacity-60">(optional)</span>
            </Label>
            <Textarea
              id="finish-review"
              value={review}
              onChange={(event) => setReview(event.target.value)}
              rows={3}
              placeholder="What stays with you?"
              maxLength={4000}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="finish-date" className="label-caps">
                Completion date
              </Label>
              <Input
                id="finish-date"
                type="date"
                value={date}
                max={localDayKey()}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="finish-notes" className="label-caps">
                Private notes
              </Label>
              <Input
                id="finish-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Only you can see these"
                maxLength={2000}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Not yet
          </Button>
          <Button
            onClick={submit}
            disabled={busy}
            className="rounded-full bg-forest text-primary-foreground hover:bg-forest/90"
          >
            {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            <Star className="mr-1.5 size-3.5" />
            Mark as finished
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ReviewDialog({
  open,
  onOpenChange,
  recordId,
  title,
  initialRating,
  initialReview,
  initialNotes,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recordId: Id<"readingRecords">;
  title: string;
  initialRating?: number;
  initialReview?: string;
  initialNotes?: string;
}) {
  const saveReview = useMutation(api.books.saveReview);
  const [rating, setRating] = useState(initialRating ?? 0);
  const [review, setReview] = useState(initialReview ?? "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setRating(initialRating ?? 0);
      setReview(initialReview ?? "");
    }
  }, [open, initialRating, initialReview]);

  const submit = async () => {
    setBusy(true);
    try {
      await saveReview({
        recordId,
        rating: rating || undefined,
        review: review.trim() || undefined,
        notes: initialNotes,
      });
      toast.success("Your review is saved.");
      onOpenChange(false);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card sm:max-w-md">
        <DialogHeader>
          <p className="label-caps">Your reading record</p>
          <DialogTitle className="font-display text-2xl">{title}</DialogTitle>
          <DialogDescription>Only your own rating and review change here.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <Stars value={rating} onChange={setRating} size={24} />
          <Textarea
            value={review}
            onChange={(event) => setReview(event.target.value)}
            rows={4}
            placeholder="Your review"
            maxLength={4000}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={busy}
            className="rounded-full bg-forest text-primary-foreground hover:bg-forest/90"
          >
            {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Save review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CheckInDialog({
  open,
  onOpenChange,
  books,
  documents = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  books: BookRef[];
  documents?: Array<{ _id: Id<"libraryDocuments">; title: string; totalPages: number }>;
}) {
  const checkIn = useMutation(api.sessions.checkIn);
  const [selection, setSelection] = useState<string>("none");
  const [pages, setPages] = useState("24");
  const [minutes, setMinutes] = useState("30");
  const [date, setDate] = useState(localDayKey());
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [ruleHint, setRuleHint] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSelection("none");
      setPages("24");
      setMinutes("30");
      setDate(localDayKey());
      setNote("");
      setRuleHint(null);
    }
  }, [open]);

  const submit = async () => {
    const pagesValue = Number(pages) || 0;
    const minutesValue = Number(minutes) || 0;
    if (!pagesValue && !minutesValue) {
      toast.error("Log at least some pages or minutes.");
      return;
    }
    setBusy(true);
    try {
      const [kind, id] = selection.split(":");
      const result = await checkIn({
        bookId: kind === "book" ? (id as Id<"books">) : undefined,
        documentId:
          kind === "doc" ? (id as Id<"libraryDocuments">) : undefined,
        pages: pagesValue,
        minutes: minutesValue,
        dayKey: date,
        note: note.trim() || undefined,
      });
      setRuleHint(
        result.qualifies
          ? `Logged. ${result.dayPages} pages and ${result.dayMinutes} minutes today — this day counts toward your streak.`
          : `Logged. ${result.dayPages} pages and ${result.dayMinutes} minutes today. Reach 5 pages or 10 minutes for the day to count.`,
      );
      toast.success("Reading session recorded.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card sm:max-w-lg">
        <DialogHeader>
          <p className="label-caps">Daily check-in</p>
          <DialogTitle className="font-display text-2xl">Log a reading session</DialogTitle>
          <DialogDescription>
            For print books and moments the app cannot track. A day counts at 10 minutes or
            5 pages.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="space-y-2">
            <Label className="label-caps">Book</Label>
            <Select value={selection} onValueChange={setSelection}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a book" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">General reading (no specific book)</SelectItem>
                {books.map((book) => (
                  <SelectItem key={book._id} value={`book:${book._id}`}>
                    {book.title}
                  </SelectItem>
                ))}
                {documents.map((doc) => (
                  <SelectItem key={doc._id} value={`doc:${doc._id}`}>
                    {doc.title} · PDF
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="checkin-pages" className="label-caps">
                Pages read
              </Label>
              <Input
                id="checkin-pages"
                type="number"
                min={0}
                max={1000}
                value={pages}
                onChange={(event) => setPages(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="checkin-minutes" className="label-caps">
                Minutes read
              </Label>
              <Input
                id="checkin-minutes"
                type="number"
                min={0}
                max={720}
                value={minutes}
                onChange={(event) => setMinutes(event.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="checkin-date" className="label-caps">
                Date
              </Label>
              <Input
                id="checkin-date"
                type="date"
                value={date}
                max={localDayKey()}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="checkin-note" className="label-caps">
                Note
              </Label>
              <Input
                id="checkin-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Where were you reading?"
                maxLength={200}
              />
            </div>
          </div>
          {ruleHint ? (
            <p
              className={cn(
                "rounded-md border px-3 py-2 text-[0.75rem] leading-relaxed",
                "border-olive/30 bg-olive/10 text-forest",
              )}
            >
              {ruleHint}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            onClick={submit}
            disabled={busy}
            className="rounded-full bg-forest text-primary-foreground hover:bg-forest/90"
          >
            {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Save session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RecordSummary({ record }: { record: Doc<"readingRecords"> }) {
  return (
    <p className="text-[0.72rem] text-muted-foreground">
      {record.status === "completed"
        ? `Finished ${formatDate(record.completionDate)}`
        : `${record.currentPage} pages read`}
    </p>
  );
}
