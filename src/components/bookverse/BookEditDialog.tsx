import { api, type DbRow } from "@/lib/data-api";
import { errorMessage } from "@/lib/bookverse";
import { useMutation } from "@/lib/data-hooks";
import { BookCover } from "@/components/bookverse/primitives";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Pencil, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type BookEditDraft = Record<string, string>;

export function EditBookButton({
  onClick,
  title,
  className,
}: {
  onClick: () => void;
  title: string;
  className?: string;
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      aria-label={`Edit ${title}`}
      title={`Edit ${title}`}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={cn("size-7 rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground", className)}
    >
      <Pencil className="size-3.5" />
    </Button>
  );
}

export function BookEditDialog({
  book,
  open,
  onOpenChange,
}: {
  book: DbRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const updateDetails = useMutation(api.books.updateDetails);
  const [draft, setDraft] = useState<BookEditDraft | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !book) return;
    setDraft({
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
  }, [book, open]);

  const save = async () => {
    if (!book || !draft) return;
    setSaving(true);
    try {
      await updateDetails({ bookId: book._id, details: draft });
      toast.success("Book details updated.");
      onOpenChange(false);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const update = (field: string, value: string) =>
    setDraft((current) => current ? { ...current, [field]: value } : current);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto bg-card sm:max-w-2xl">
        <DialogHeader>
          <p className="label-caps">Book details</p>
          <DialogTitle className="font-display text-2xl">Edit this book</DialogTitle>
          <DialogDescription>
            Changes apply anywhere this book appears in your reading lists.
          </DialogDescription>
        </DialogHeader>
        {book && draft ? (
          <div className="space-y-4 py-1">
            <div className="grid grid-cols-[5rem_minmax(0,1fr)] items-start gap-3 sm:grid-cols-[7rem_minmax(0,1fr)]">
              <BookCover
                title={draft.title || "Book cover"}
                author={draft.author}
                coverUrl={draft.coverUrl}
                className="max-w-28"
              />
              <div className="space-y-1.5">
                <Label htmlFor="shared-book-cover">Cover image URL</Label>
                <Input
                  id="shared-book-cover"
                  type="url"
                  value={draft.coverUrl}
                  onChange={(event) => update("coverUrl", event.target.value)}
                  placeholder="https://…"
                />
                <p className="text-xs text-muted-foreground">The cover preview updates as you change the link.</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field id="shared-book-title" label="Title" value={draft.title} onChange={(value) => update("title", value)} />
              <Field id="shared-book-author" label="Author" value={draft.author} onChange={(value) => update("author", value)} />
              <Field id="shared-book-isbn" label="ISBN" value={draft.isbn} onChange={(value) => update("isbn", value)} />
              <Field id="shared-book-genre" label="Genre" value={draft.genre} onChange={(value) => update("genre", value)} />
              <Field id="shared-book-language" label="Language" value={draft.language} onChange={(value) => update("language", value)} />
              <div className="grid grid-cols-2 gap-3">
                <Field id="shared-book-pages" label="Pages" type="number" min={1} value={draft.pageCount} onChange={(value) => update("pageCount", value)} />
                <Field id="shared-book-year" label="Published year" type="number" min={1} value={draft.publishedYear} onChange={(value) => update("publishedYear", value)} />
              </div>
              <Field id="shared-book-publisher" label="Publisher" value={draft.publisher} onChange={(value) => update("publisher", value)} />
              <Field id="shared-book-series" label="Series" value={draft.series} onChange={(value) => update("series", value)} />
              <Field id="shared-book-format" label="Format" value={draft.format} onChange={(value) => update("format", value)} placeholder="Paperback, ebook, audiobook…" />
              <Field id="shared-book-spine-color" label="Spine color" value={draft.spineColor} onChange={(value) => update("spineColor", value)} placeholder="#6b754b" />
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="shared-book-description">Description</Label>
                <Textarea id="shared-book-description" rows={4} value={draft.description} onChange={(event) => update("description", event.target.value)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="shared-book-reference">Catalogue reference</Label>
                <Input id="shared-book-reference" value={draft.externalRef} onChange={(event) => update("externalRef", event.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="button" disabled={saving} onClick={save} className="rounded-full bg-forest text-primary-foreground hover:bg-forest/90">
                <Save className="mr-2 size-4" /> Save book details
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  min,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  min?: number;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} min={min} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </div>
  );
}
