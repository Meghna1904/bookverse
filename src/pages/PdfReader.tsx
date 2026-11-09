import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { FinishDialog } from "@/components/bookverse/dialogs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { errorMessage, localDayKey, pdfUrl, readingPercent } from "@/lib/bookverse";
import { isPasswordError, openPdf, pdfjs } from "@/lib/pdf";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Expand,
  Loader2,
  Maximize2,
  Moon,
  Search,
  Sun,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";

export default function PdfReader() {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const meta = useQuery(
    api.library.get,
    documentId ? { documentId: documentId as Id<"libraryDocuments"> } : "skip",
  );
  const issueToken = useMutation(api.library.issueToken);
  const saveProgress = useMutation(api.library.saveProgress);
  const completeDocument = useMutation(api.library.completeDocument);

  const [pdf, setPdf] = useState<Awaited<ReturnType<typeof openPdf>> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [scale, setScale] = useState(1.1);
  const [fit, setFit] = useState<"width" | "page" | "custom">("width");
  const [dark, setDark] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const [findTerm, setFindTerm] = useState("");
  const [finding, setFinding] = useState(false);
  const [findResult, setFindResult] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef(1);
  const visitedRef = useRef<Set<number>>(new Set());
  const pendingRef = useRef({ pages: 0, seconds: 0 });
  const flushBusyRef = useRef(false);
  const positionTimerRef = useRef<number | null>(null);

  const totalPages = pdf?.numPages ?? meta?.document.totalPages ?? 0;
  const documentTitle = meta?.document.title ?? "Your document";
  const initialPage = meta?.progress?.lastPage ?? 1;

  useEffect(() => {
    if (!documentId || pdf || !meta) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const token = await issueToken({
          documentId: documentId as Id<"libraryDocuments">,
        });
        const response = await fetch(pdfUrl(token));
        if (!response.ok) {
          throw new Error(
            response.status === 403
              ? "This document link has expired. Reopen the document from the library."
              : "The PDF could not be downloaded.",
          );
        }
        const data = await response.arrayBuffer();
        if (data.byteLength === 0) throw new Error("This PDF file appears to be empty.");
        const loaded = await openPdf(data);
        if (cancelled) return;
        setPdf(loaded);
        const startPage = Math.min(Math.max(initialPage, 1), loaded.numPages);
        setPageNumber(startPage);
        pageRef.current = startPage;
        setPageInput(String(startPage));
        visitedRef.current.add(startPage);
      } catch (error) {
        if (cancelled) return;
        setLoadError(
          isPasswordError(error)
            ? "This PDF is password protected. Our BookVerse cannot open it until the password is removed."
            : error instanceof Error
              ? error.message
              : "This PDF could not be opened. It may be damaged.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [documentId, meta, pdf, issueToken, initialPage]);

  const flushActivity = useCallback(
    async (force = false) => {
      if (!documentId || flushBusyRef.current) return;
      const pending = pendingRef.current;
      const minutes = Math.floor(pending.seconds / 60);
      const pages = pending.pages;
      if (!force && !pages && !minutes) return;
      pending.seconds -= minutes * 60;
      pending.pages = 0;
      flushBusyRef.current = true;
      try {
        await saveProgress({
          documentId: documentId as Id<"libraryDocuments">,
          lastPage: pageRef.current,
          pagesRead: pages,
          minutes,
          dayKey: localDayKey(),
        });
        if (pages || minutes) {
          setSavedAt(
            new Date().toLocaleTimeString(undefined, {
              hour: "numeric",
              minute: "2-digit",
            }),
          );
        }
      } catch {
        // Silent: a failed progress ping should never interrupt reading.
      } finally {
        flushBusyRef.current = false;
      }
    },
    [documentId, saveProgress],
  );

  // Count only time the reader is actually present with the document open.
  useEffect(() => {
    if (!pdf) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      pendingRef.current.seconds += 10;
      if (pendingRef.current.seconds >= 60) void flushActivity();
    }, 10_000);
    return () => {
      window.clearInterval(timer);
      void flushActivity(true);
    };
  }, [pdf, flushActivity]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") void flushActivity();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [flushActivity]);

  // Persist the last page, even when no time has accumulated.
  useEffect(() => {
    if (!documentId || !pdf) return;
    if (positionTimerRef.current) window.clearTimeout(positionTimerRef.current);
    positionTimerRef.current = window.setTimeout(() => {
      void saveProgress({
        documentId: documentId as Id<"libraryDocuments">,
        lastPage: pageNumber,
        dayKey: localDayKey(),
      }).catch(() => undefined);
    }, 900);
    return () => {
      if (positionTimerRef.current) window.clearTimeout(positionTimerRef.current);
    };
  }, [pageNumber, documentId, pdf, saveProgress]);

  useEffect(() => {
    let cancelled = false;
    let renderTask: { cancel: () => void } | null = null;
    let textLayer: { cancel: () => void } | null = null;

    (async () => {
      if (!pdf || !canvasRef.current) return;
      try {
        const page = await pdf.getPage(pageNumber);
        if (cancelled) return;
        const base = page.getViewport({ scale: 1 });
        const availableWidth = Math.max(
          280,
          (scrollerRef.current?.clientWidth ?? window.innerWidth) - 48,
        );
        const availableHeight = Math.max(320, window.innerHeight - 230);
        let nextScale = scale;
        if (fit === "width") nextScale = availableWidth / base.width;
        if (fit === "page") {
          nextScale = Math.min(availableWidth / base.width, availableHeight / base.height);
        }
        nextScale = Math.max(0.2, Math.min(4, nextScale));
        if (Math.abs(nextScale - scale) > 0.001) {
          setScale(nextScale);
          return;
        }
        const viewport = page.getViewport({ scale: nextScale });
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas unavailable");
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        renderTask = page.render({
          canvas,
          canvasContext: context,
          viewport,
          transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
        });
        await (renderTask as unknown as { promise: Promise<void> }).promise;
        if (cancelled) return;
        setRenderError(null);

        const container = textLayerRef.current;
        if (container) {
          container.innerHTML = "";
          container.style.width = `${viewport.width}px`;
          container.style.height = `${viewport.height}px`;
          container.style.setProperty("--scale-factor", String(nextScale));
          try {
            textLayer = new pdfjs.TextLayer({
              textContentSource: page.streamTextContent(),
              container,
              viewport,
            });
            await (textLayer as unknown as { render: () => Promise<void> }).render();
          } catch {
            // Selection is a bonus; the page still reads fine without a text layer.
          }
        }
      } catch (error) {
        if (!cancelled) {
          const name = (error as { name?: string })?.name;
          if (name !== "RenderingCancelledException") {
            setRenderError("This page could not be drawn. Try the next page.");
          }
        }
      }
    })();

    return () => {
      cancelled = true;
      try {
        renderTask?.cancel();
      } catch {
        // ignore
      }
      try {
        textLayer?.cancel();
      } catch {
        // ignore
      }
    };
  }, [pdf, pageNumber, scale, fit]);

  useEffect(() => {
    const handler = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const goToPage = (next: number) => {
    if (!totalPages) return;
    const target = Math.max(1, Math.min(totalPages, Math.round(next)));
    if (target === pageNumber) return;
    setPageNumber(target);
    pageRef.current = target;
    setPageInput(String(target));
    if (!visitedRef.current.has(target)) {
      visitedRef.current.add(target);
      pendingRef.current.pages += 1;
    }
    scrollerRef.current?.scrollTo({ top: 0 });
  };

  const searchInside = async () => {
    const term = findTerm.trim().toLowerCase();
    if (!pdf || term.length < 2) {
      setFindResult("Type at least two characters.");
      return;
    }
    setFinding(true);
    setFindResult(null);
    try {
      const limit = Math.min(pdf.numPages, 400);
      for (let index = 1; index <= limit; index += 1) {
        const page = await pdf.getPage(index);
        const content = await page.getTextContent();
        const text = content.items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" ")
          .toLowerCase();
        if (text.includes(term)) {
          goToPage(index);
          setFindResult(`Found on page ${index}${pdf.numPages > limit ? " (first 400 pages searched)" : ""}.`);
          return;
        }
      }
      setFindResult("No match found in the text of this document.");
    } catch {
      setFindResult("Text search failed — this PDF may be scanned images only.");
    } finally {
      setFinding(false);
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await wrapperRef.current?.requestFullscreen();
      }
    } catch {
      toast.error("Full screen is not available in this browser.");
    }
  };

  if (meta === null) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <h1 className="font-display text-2xl">This document is not available to you.</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Private documents can only be opened by the reader who uploaded them.
        </p>
        <Button asChild className="mt-5 rounded-full bg-forest text-primary-foreground">
          <Link to="/library">Back to the Library</Link>
        </Button>
      </div>
    );
  }

  return (
    <div
      ref={wrapperRef}
      className={cn(
        "flex min-h-screen flex-col",
        dark ? "reader-dark" : "reader-light bg-paper text-ink",
      )}
    >
      <header
        className={cn(
          "sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b px-4 py-2.5 backdrop-blur",
          dark ? "border-white/10 bg-[#14120f]/95" : "border-border bg-background/95",
        )}
      >
        <Button asChild variant="ghost" size="sm" className="gap-1.5 px-2 text-xs">
          <Link to="/library">
            <ArrowLeft className="size-3.5" /> Library
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <p className="font-display truncate text-[0.98rem] leading-tight">
            {documentTitle}
          </p>
          <p
            className={cn(
              "truncate text-[0.62rem]",
              dark ? "text-white/55" : "text-muted-foreground",
            )}
          >
            {meta?.document.author || "Unknown author"} ·{" "}
            {meta?.document.visibility === "shared" ? "Shared document" : "Private document"}
            {savedAt ? ` · saved ${savedAt}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Search inside the PDF"
            onClick={() => setFindOpen((open) => !open)}
          >
            <Search className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Toggle reading light"
            onClick={() => setDark((value) => !value)}
          >
            {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Full screen"
            onClick={toggleFullscreen}
          >
            {isFullscreen ? <Maximize2 className="size-4" /> : <Expand className="size-4" />}
          </Button>
          <Button
            size="sm"
            className="ml-1 h-7 rounded-full bg-forest px-3 text-[0.7rem] text-primary-foreground hover:bg-forest/90"
            onClick={() => setFinishOpen(true)}
          >
            Finish
          </Button>
        </div>
        {findOpen ? (
          <div className="flex w-full items-center gap-2 border-t border-current/10 pt-2">
            <Input
              value={findTerm}
              onChange={(event) => setFindTerm(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void searchInside();
              }}
              placeholder="Search the text of this PDF"
              className="h-8 max-w-sm text-xs"
            />
            <Button
              size="sm"
              variant="outline"
              className="h-8 rounded-full text-[0.7rem]"
              disabled={finding}
              onClick={searchInside}
            >
              {finding ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : null}
              Find
            </Button>
            {findResult ? (
              <span className="text-[0.68rem] opacity-70">{findResult}</span>
            ) : null}
          </div>
        ) : null}
      </header>

      <div
        className={cn(
          "flex flex-wrap items-center justify-center gap-2 border-b px-3 py-2",
          dark ? "border-white/10" : "border-border/60 bg-card/60",
        )}
      >
        <Button
          variant="outline"
          size="icon"
          className="size-8 rounded-full"
          onClick={() => goToPage(pageNumber - 1)}
          disabled={pageNumber <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <div className="flex items-center gap-1 text-[0.72rem]">
          <Input
            value={pageInput}
            onChange={(event) => setPageInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") goToPage(Number(pageInput));
            }}
            onBlur={() => goToPage(Number(pageInput) || pageNumber)}
            className="h-8 w-14 text-center text-xs"
            aria-label="Page number"
          />
          <span className="opacity-60">of {totalPages || "…"}</span>
        </div>
        <Button
          variant="outline"
          size="icon"
          className="size-8 rounded-full"
          onClick={() => goToPage(pageNumber + 1)}
          disabled={pageNumber >= totalPages}
          aria-label="Next page"
        >
          <ChevronRight className="size-4" />
        </Button>
        <span className="mx-1 h-5 w-px bg-current/15" />
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label="Zoom out"
          onClick={() => {
            setFit("custom");
            setScale((value) => Math.max(0.3, Math.round((value - 0.15) * 100) / 100));
          }}
        >
          <ZoomOut className="size-4" />
        </Button>
        <span className="w-10 text-center text-[0.68rem] tabular-nums opacity-70">
          {Math.round(scale * 100)}%
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label="Zoom in"
          onClick={() => {
            setFit("custom");
            setScale((value) => Math.min(4, Math.round((value + 0.15) * 100) / 100));
          }}
        >
          <ZoomIn className="size-4" />
        </Button>
        <Button
          variant={fit === "width" ? "secondary" : "ghost"}
          size="sm"
          className="h-7 rounded-full px-2.5 text-[0.68rem]"
          onClick={() => setFit("width")}
        >
          Fit width
        </Button>
        <Button
          variant={fit === "page" ? "secondary" : "ghost"}
          size="sm"
          className="h-7 rounded-full px-2.5 text-[0.68rem]"
          onClick={() => setFit("page")}
        >
          Fit page
        </Button>
      </div>

      <div
        ref={scrollerRef}
        className="relative flex-1 overflow-auto px-4 py-5"
        style={{ background: dark ? undefined : "rgba(43, 38, 32, 0.06)" }}
      >
        {loading ? (
          <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
            <Loader2 className="size-6 animate-spin text-olive" />
            <p className="text-[0.78rem] opacity-70">Opening your document securely…</p>
          </div>
        ) : loadError ? (
          <div className="mx-auto max-w-md rounded-lg border border-destructive/30 bg-card px-6 py-10 text-center text-ink">
            <h2 className="font-display text-xl">This PDF could not be opened</h2>
            <p className="mt-2 text-[0.8rem] leading-relaxed text-muted-foreground">
              {loadError}
            </p>
            <div className="mt-5 flex justify-center gap-2">
              <Button variant="outline" className="rounded-full" onClick={() => window.location.reload()}>
                Try again
              </Button>
              <Button asChild className="rounded-full bg-forest text-primary-foreground">
                <Link to="/library">Back to Library</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex w-fit flex-col items-center">
            <div className={cn("relative", dark && "pdf-canvas-dark")}>
              <canvas ref={canvasRef} className="block max-w-none rounded-sm shadow-2xl" />
              <div
                ref={textLayerRef}
                className="pdf-text-layer absolute inset-0 overflow-hidden leading-none"
                aria-hidden="false"
              />
            </div>
            {renderError ? (
              <p className="mt-3 rounded-md bg-destructive/10 px-3 py-1.5 text-[0.72rem] text-destructive">
                {renderError}
              </p>
            ) : null}
            <p className={cn("mt-4 text-[0.7rem]", dark ? "text-white/50" : "text-muted-foreground")}>
              Page {pageNumber} of {totalPages} · {readingPercent(pageNumber, totalPages)}% ·
              select text where the PDF allows it
            </p>
            {pageNumber === totalPages && totalPages > 0 ? (
              <div className="mt-4 mb-2 flex items-center gap-3 rounded-full border border-gold/40 bg-card px-4 py-2 text-ink">
                <span className="text-[0.75rem]">You reached the last page.</span>
                <Button
                  size="sm"
                  className="h-7 rounded-full bg-forest px-3 text-[0.7rem] text-primary-foreground"
                  onClick={() => setFinishOpen(true)}
                >
                  Finish & shelve
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <footer
        className={cn(
          "sticky bottom-0 border-t px-4 py-2",
          dark ? "border-white/10 bg-[#14120f]/95" : "border-border bg-background/95",
        )}
      >
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <span className="text-[0.62rem] opacity-60">{pageNumber}</span>
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-current/15">
            <div
              className="h-full rounded-full bg-olive"
              style={{ width: `${readingPercent(pageNumber, totalPages)}%` }}
            />
          </div>
          <span className="text-[0.62rem] opacity-60">
            {totalPages ? `${readingPercent(pageNumber, totalPages)}%` : ""}
          </span>
        </div>
      </footer>

      <FinishDialog
        open={finishOpen}
        onOpenChange={setFinishOpen}
        title={documentTitle}
        isDigital
        onComplete={async (input) => {
          if (!documentId) return;
          const bookId = await completeDocument({
            documentId: documentId as Id<"libraryDocuments">,
            ...input,
          });
          await flushActivity(true);
          navigate(`/book/${bookId}`);
        }}
      />
    </div>
  );
}
