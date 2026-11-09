import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  BookCover,
  EmptyState,
  PageHeader,
} from "@/components/bookverse/primitives";
import { FinishDialog } from "@/components/bookverse/dialogs";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { errorMessage, formatDate, readingPercent } from "@/lib/bookverse";
import { isPasswordError, openPdf } from "@/lib/pdf";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import {
  BookOpen,
  FileText,
  Globe2,
  Loader2,
  Lock,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import { useRef, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

const MAX_BYTES = 40 * 1024 * 1024;

const SCOPES = [
  { value: "all", label: "All documents" },
  { value: "mine", label: "My Library" },
  { value: "private", label: "Private" },
  { value: "shared", label: "Shared Library" },
  { value: "partner", label: "Partner's Library" },
];

const STATUS = [
  { value: "all", label: "All" },
  { value: "reading", label: "Continue reading" },
  { value: "completed", label: "Completed" },
];

export default function Library() {
  const data = useQuery(api.library.list);
  const createDocument = useMutation(api.library.createDocument);
  const updateDocument = useMutation(api.library.updateDocument);
  const removeDocument = useMutation(api.library.removeDocument);
  const generateUploadUrl = useMutation(api.library.generateUploadUrl);
  const completeDocument = useMutation(api.library.completeDocument);

  const [scope, setScope] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editing, setEditing] = useState<{
    documentId: Id<"libraryDocuments">;
    title: string;
    author: string;
    description: string;
    visibility: "private" | "shared";
  } | null>(null);
  const [finishing, setFinishing] = useState<{
    documentId: Id<"libraryDocuments">;
    title: string;
  } | null>(null);
  const [busyEdit, setBusyEdit] = useState(false);
  const [busyCover, setBusyCover] = useState(false);

  const items = data?.items ?? [];
  const filtered = items.filter(({ document, progress, isMine }) => {
    const query = search.trim().toLowerCase();
    if (
      query &&
      !document.title.toLowerCase().includes(query) &&
      !(document.author ?? "").toLowerCase().includes(query)
    ) {
      return false;
    }
    if (scope === "mine" && !isMine) return false;
    if (scope === "private" && document.visibility !== "private") return false;
    if (scope === "shared" && document.visibility !== "shared") return false;
    if (scope === "partner" && (isMine || document.visibility !== "shared")) return false;
    if (status === "reading" && (!progress || progress.completedAt)) return false;
    if (status === "completed" && !progress?.completedAt) return false;
    return true;
  });

  return (
    <div className="pb-6">
      <PageHeader
        eyebrow="Library"
        title="The digital reading room."
        description="Bring your PDFs inside Our BookVerse. Read them here with your place saved, and choose for every file whether it belongs to you alone or to both of you."
        action={
          <Button
            className="rounded-full bg-forest text-primary-foreground hover:bg-forest/90"
            onClick={() => setUploadOpen(true)}
          >
            <Upload className="mr-2 size-4" /> Upload a PDF
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            icon: Lock,
            title: "My Library",
            copy: "Private files only you can open. Enforced on every backend request.",
          },
          {
            icon: Users,
            title: "Shared Library",
            copy: "Both readers can open these, resume at the same saved pages.",
          },
          {
            icon: ShieldIcon,
            title: "Partner's Library",
            copy: "Only your partner's shared uploads appear. Their private files never do.",
          },
        ].map((tile) => (
          <div key={tile.title} className="paper-panel rounded-md px-4 py-3.5">
            <tile.icon className="size-4 text-olive" />
            <p className="font-display mt-2 text-base">{tile.title}</p>
            <p className="mt-1 text-[0.7rem] leading-relaxed text-muted-foreground">
              {tile.copy}
            </p>
          </div>
        ))}
      </div>

      <div className="paper-card mt-6 flex flex-wrap items-center gap-2 rounded-lg px-4 py-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search documents"
            className="h-9 pl-9"
          />
        </div>
        {SCOPES.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setScope(option.value)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-[0.7rem] transition",
              scope === option.value
                ? "border-forest bg-forest text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:border-forest/40",
            )}
          >
            {option.label}
          </button>
        ))}
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-9 w-[150px] text-[0.72rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {data === undefined ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-44 animate-pulse rounded-lg bg-secondary/60" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          className="mt-6"
          title={items.length === 0 ? "The reading room is empty" : "No documents match"}
          description={
            items.length === 0
              ? "Upload a PDF and choose its visibility. We extract the page count, suggest a title from the file itself, and render its first page as the cover."
              : "Try another search or visibility filter. Private documents only ever appear for the reader who uploaded them."
          }
          icon={<FileText className="size-4" />}
          action={
            <Button
              className="rounded-full bg-forest text-primary-foreground"
              onClick={() => setUploadOpen(true)}
            >
              <Upload className="mr-2 size-4" /> Upload a PDF
            </Button>
          }
        />
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(({ document, progress, ownerName, isMine, coverUrl }) => {
            const percent = progress
              ? readingPercent(progress.lastPage, document.totalPages)
              : 0;
            const completed = Boolean(progress?.completedAt);
            return (
              <article key={document._id} className="paper-card flex flex-col rounded-lg p-4">
                <div className="flex gap-4">
                  <Link
                    to={`/read/${document._id}`}
                    className="w-[74px] shrink-0"
                    aria-label={`Read ${document.title}`}
                  >
                    <BookCover
                      title={document.title}
                      author={document.author}
                      coverUrl={coverUrl}
                    />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[0.55rem] tracking-[0.12em] uppercase",
                          document.visibility === "private"
                            ? "border-terracotta/35 bg-terracotta/10 text-terracotta"
                            : "border-forest/25 bg-olive/10 text-forest",
                        )}
                      >
                        {document.visibility === "private" ? (
                          <Lock className="size-2.5" />
                        ) : (
                          <Globe2 className="size-2.5" />
                        )}
                        {document.visibility}
                      </span>
                    </div>
                    <Link
                      to={`/read/${document._id}`}
                      className="font-display mt-1.5 line-clamp-2 block text-[1.05rem] leading-snug hover:text-terracotta"
                    >
                      {document.title}
                    </Link>
                    <p className="truncate text-[0.7rem] text-muted-foreground">
                      {document.author || "Unknown author"} · {document.totalPages} pages
                    </p>
                    <p className="mt-0.5 text-[0.65rem] text-muted-foreground/90">
                      {isMine ? "Uploaded by you" : `Uploaded by ${ownerName}`} ·{" "}
                      {(document.size / (1024 * 1024)).toFixed(1)} MB
                    </p>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[0.65rem] text-muted-foreground">
                    <span>
                      {completed
                        ? `Finished ${formatDate(progress?.completedAt)}`
                        : progress
                          ? `Page ${progress.lastPage} of ${document.totalPages}`
                          : "Not started"}
                    </span>
                    <span>{completed ? 100 : percent}%</span>
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-secondary">
                    <div
                      className={cn("h-full rounded-full", completed ? "bg-gold" : "bg-forest")}
                      style={{ width: `${completed ? 100 : percent}%` }}
                    />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <Button
                    asChild
                    size="sm"
                    className="h-7 rounded-full bg-forest px-3 text-[0.7rem] text-primary-foreground hover:bg-forest/90"
                  >
                    <Link to={`/read/${document._id}`}>
                      <BookOpen className="mr-1.5 size-3.5" />
                      {completed ? "Read again" : percent > 0 ? "Continue" : "Open PDF"}
                    </Link>
                  </Button>
                  {!completed ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 rounded-full px-2 text-[0.7rem]"
                      onClick={() =>
                        setFinishing({ documentId: document._id, title: document.title })
                      }
                    >
                      Mark finished
                    </Button>
                  ) : null}
                  {isMine ? (
                    <>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="ml-auto size-7"
                        aria-label="Edit document"
                        onClick={() =>
                          setEditing({
                            documentId: document._id,
                            title: document.title,
                            author: document.author ?? "",
                            description: document.description ?? "",
                            visibility: document.visibility,
                          })
                        }
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7 text-muted-foreground hover:text-destructive"
                            aria-label="Remove document"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-card">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="font-display text-xl">
                              Remove “{document.title}”?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              The PDF and its reading progress are deleted for good. Books
                              already shelved from this document keep their shelf record.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Keep it</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={async () => {
                                try {
                                  await removeDocument({ documentId: document._id });
                                  toast.success("Document removed.");
                                } catch (error) {
                                  toast.error(errorMessage(error));
                                }
                              }}
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUpload={async (payload) => {
          const uploadBlob = async (blob: Blob, name: string) => {
            const url = await generateUploadUrl();
            const response = await fetch(url, {
              method: "POST",
              headers: { "Content-Type": blob.type || "application/octet-stream" },
              body: blob,
            });
            if (!response.ok) throw new Error("The upload was interrupted. Please retry.");
            const result = (await response.json()) as { storageId: Id<"_storage"> };
            void name;
            return result.storageId;
          };
          const storageId = await uploadBlob(payload.file, payload.file.name);
          let coverStorageId: Id<"_storage"> | undefined;
          if (payload.cover) {
            coverStorageId = await uploadBlob(payload.cover, "cover.jpg");
          }
          await createDocument({
            storageId,
            coverStorageId,
            fileName: payload.file.name,
            title: payload.title,
            author: payload.author,
            description: payload.description,
            totalPages: payload.totalPages,
            visibility: payload.visibility,
          });
        }}
      />

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="bg-card sm:max-w-md">
          <DialogHeader>
            <p className="label-caps">Library record</p>
            <DialogTitle className="font-display text-2xl">Edit document</DialogTitle>
            <DialogDescription>
              Changing visibility to Shared makes the PDF readable by both readers.
            </DialogDescription>
          </DialogHeader>
          {editing ? (
            <div className="space-y-3 py-1">
              <div className="space-y-1.5">
                <Label className="label-caps">Title</Label>
                <Input
                  value={editing.title}
                  onChange={(event) => setEditing({ ...editing, title: event.target.value })}
                />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-md border border-dashed border-border px-3 py-2">
                <div>
                  <p className="text-[0.75rem]">Document cover</p>
                  <p className="text-[0.62rem] text-muted-foreground">
                    Replace the first-page cover with your own image.
                  </p>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[0.68rem] hover:border-olive/50">
                  {busyCover ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Upload className="size-3" />
                  )}
                  Upload cover
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={busyCover}
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (!file || !editing) return;
                      if (!file.type.startsWith("image/")) {
                        toast.error("Please choose an image file.");
                        return;
                      }
                      if (file.size > 4 * 1024 * 1024) {
                        toast.error("Cover images must be under 4 MB.");
                        return;
                      }
                      setBusyCover(true);
                      try {
                        const url = await generateUploadUrl();
                        const response = await fetch(url, {
                          method: "POST",
                          headers: { "Content-Type": file.type },
                          body: file,
                        });
                        if (!response.ok) throw new Error("The cover upload failed.");
                        const { storageId } = (await response.json()) as {
                          storageId: Id<"_storage">;
                        };
                        await updateDocument({ documentId: editing.documentId, coverStorageId: storageId });
                        toast.success("Cover image replaced.");
                      } catch (error) {
                        toast.error(errorMessage(error));
                      } finally {
                        setBusyCover(false);
                      }
                    }}
                  />
                </label>
              </div>
              <div className="space-y-1.5">
                <Label className="label-caps">Author</Label>
                <Input
                  value={editing.author}
                  onChange={(event) => setEditing({ ...editing, author: event.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="label-caps">Description</Label>
                <Textarea
                  rows={3}
                  value={editing.description}
                  onChange={(event) =>
                    setEditing({ ...editing, description: event.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="label-caps">Visibility</Label>
                <Select
                  value={editing.visibility}
                  onValueChange={(value) =>
                    setEditing({
                      ...editing,
                      visibility: value as "private" | "shared",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private — only me</SelectItem>
                    <SelectItem value="shared">Shared — both readers</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              disabled={busyEdit}
              className="rounded-full bg-forest text-primary-foreground"
              onClick={async () => {
                if (!editing) return;
                setBusyEdit(true);
                try {
                  await updateDocument({
                    documentId: editing.documentId,
                    title: editing.title,
                    author: editing.author,
                    description: editing.description,
                    visibility: editing.visibility,
                  });
                  toast.success("Document updated.");
                  setEditing(null);
                } catch (error) {
                  toast.error(errorMessage(error));
                } finally {
                  setBusyEdit(false);
                }
              }}
            >
              {busyEdit ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Save changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <FinishDialog
        open={Boolean(finishing)}
        onOpenChange={(open) => !open && setFinishing(null)}
        title={finishing?.title ?? ""}
        isDigital
        onComplete={async (input) => {
          if (!finishing) return;
          await completeDocument({ documentId: finishing.documentId, ...input });
        }}
      />
    </div>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return <Users className={className} aria-hidden />;
}

function UploadDialog({
  open,
  onOpenChange,
  onUpload,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (payload: {
    file: File;
    cover: Blob | null;
    title: string;
    author: string;
    description: string;
    totalPages: number;
    visibility: "private" | "shared";
  }) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState(0);
  const [cover, setCover] = useState<Blob | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"private" | "shared">("private");
  const [parsing, setParsing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setFile(null);
    setPages(0);
    setCover(null);
    setCoverPreview(null);
    setTitle("");
    setAuthor("");
    setDescription("");
    setVisibility("private");
    setError(null);
  };

  const handleFile = async (selected: File) => {
    setError(null);
    if (selected.size > MAX_BYTES) {
      setError("PDFs must be 40 MB or smaller.");
      return;
    }
    if (!selected.name.toLowerCase().endsWith(".pdf") && selected.type !== "application/pdf") {
      setError("Please choose a PDF file.");
      return;
    }
    setFile(selected);
    setTitle(selected.name.replace(/\.pdf$/i, ""));
    setParsing(true);
    try {
      const buffer = await selected.arrayBuffer();
      const doc = await openPdf(buffer);
      setPages(doc.numPages);
      let suggestedTitle = selected.name.replace(/\.pdf$/i, "");
      try {
        const metadata = await doc.getMetadata();
        const info = metadata.info as { Title?: string; Author?: string } | undefined;
        if (info?.Title?.trim()) suggestedTitle = info.Title.trim();
        if (info?.Author?.trim()) setAuthor(info.Author.trim());
      } catch {
        // Metadata is often missing in scanned PDFs; the text below is a best effort.
      }
      const page = await doc.getPage(1);
      const text = await page.getTextContent();
      const firstLine = text.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (!suggestedTitle || suggestedTitle.length < 3) {
        suggestedTitle = firstLine.split(/[.!?]/)[0]?.slice(0, 90) || suggestedTitle;
      }
      setTitle(suggestedTitle.slice(0, 200));
      const base = page.getViewport({ scale: 1 });
      const scale = Math.min(2, 640 / base.width);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const context = canvas.getContext("2d");
      if (context) {
        await page.render({ canvas, canvasContext: context, viewport }).promise;
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/jpeg", 0.82),
        );
        if (blob) {
          setCover(blob);
          setCoverPreview(URL.createObjectURL(blob));
        }
      }
      await doc.loadingTask.destroy();
    } catch (parseError) {
      setError(
        isPasswordError(parseError)
          ? "This PDF is password protected. Remove the password first, then upload it again."
          : "This PDF could not be read. It may be damaged or use an unsupported encryption.",
      );
      setFile(null);
      setPages(0);
    } finally {
      setParsing(false);
    }
  };

  const submit = async () => {
    if (!file || !pages) {
      setError("Choose a readable PDF first.");
      return;
    }
    if (!title.trim()) {
      setError("Give the document a title.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onUpload({
        file,
        cover,
        title: title.trim(),
        author: author.trim(),
        description: description.trim(),
        totalPages: pages,
        visibility,
      });
      toast.success("Added to your library.");
      reset();
      onOpenChange(false);
    } catch (uploadError) {
      setError(errorMessage(uploadError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[92vh] overflow-y-auto bg-card sm:max-w-lg">
        <DialogHeader>
          <p className="label-caps">Digital reading room</p>
          <DialogTitle className="font-display text-2xl">Upload a PDF</DialogTitle>
          <DialogDescription>
            PDF only, up to 40 MB. We read the page count and draw the first page as a
            cover; you can correct the details before saving.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="paper-panel flex w-full flex-col items-center justify-center rounded-md border-dashed px-4 py-7 text-center transition hover:border-olive/50"
          >
            {parsing ? (
              <Loader2 className="size-6 animate-spin text-olive" />
            ) : (
              <Upload className="size-6 text-olive" />
            )}
            <span className="font-display mt-2 text-lg">
              {file ? file.name : "Choose a PDF from your device"}
            </span>
            <span className="mt-1 text-[0.7rem] text-muted-foreground">
              {file
                ? `${(file.size / (1024 * 1024)).toFixed(1)} MB · ${pages || "reading…"} pages`
                : "Stored privately in Our BookVerse"}
            </span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(event) => {
              const selected = event.target.files?.[0];
              if (selected) void handleFile(selected);
              event.target.value = "";
            }}
          />

          {coverPreview ? (
            <div className="flex items-center gap-3">
              <img
                src={coverPreview}
                alt="Detected cover"
                className="h-24 w-16 rounded-sm object-cover shadow"
              />
              <div>
                <p className="text-[0.72rem] font-medium">Cover detected</p>
                <p className="text-[0.68rem] text-muted-foreground">
                  The first page will be used as the document cover.
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1 h-6 px-2 text-[0.65rem]"
                  onClick={() => {
                    setCover(null);
                    setCoverPreview(null);
                  }}
                >
                  Remove cover
                </Button>
              </div>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label className="label-caps">Title</Label>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="label-caps">Author</Label>
              <Input value={author} onChange={(event) => setAuthor(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="label-caps">Pages</Label>
              <Input value={pages ? String(pages) : "—"} readOnly className="bg-secondary/40" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="label-caps">Description</Label>
            <Textarea
              rows={2}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional"
            />
          </div>

          <div className="space-y-2">
            <Label className="label-caps">Who may read this?</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                {
                  value: "private" as const,
                  title: "My Library",
                  copy: "Only you. Private files never appear to your partner.",
                },
                {
                  value: "shared" as const,
                  title: "Shared Library",
                  copy: "Both readers, with separate saved pages.",
                },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setVisibility(option.value)}
                  className={cn(
                    "rounded-md border px-3 py-2.5 text-left transition",
                    visibility === option.value
                      ? "border-forest bg-forest/5"
                      : "border-border bg-background hover:border-olive/40",
                  )}
                >
                  <span className="flex items-center gap-1.5 text-[0.78rem] font-medium">
                    {option.value === "private" ? (
                      <Lock className="size-3" />
                    ) : (
                      <Users className="size-3" />
                    )}
                    {option.title}
                  </span>
                  <span className="mt-0.5 block text-[0.66rem] leading-relaxed text-muted-foreground">
                    {option.copy}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {error ? (
            <p className="rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2 text-[0.75rem] text-destructive">
              {error}
            </p>
          ) : null}
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="rounded-full bg-forest text-primary-foreground hover:bg-forest/90"
            disabled={busy || parsing || !file}
            onClick={submit}
          >
            {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Plus className="mr-2 size-4" />}
            Add to library
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
