import { api } from "@/lib/data-api";
import type { Id } from "@/lib/db-types";
import { HeroReadingScene } from "@/components/bookverse/HeroReadingScene";
import {
  Avatar,
  BookCover,
  EmptyState,
} from "@/components/bookverse/primitives";
import {
  CheckInDialog,
  FinishDialog,
  ProgressDialog,
} from "@/components/bookverse/dialogs";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { timeAgo } from "@/lib/bookverse";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "@/lib/data-hooks";
import {
  ArrowRight,
  BookMarked,
  BookOpen,
  ChevronRight,
  FileText,
  Flame,
  Heart,
  MoreHorizontal,
  Play,
  Search,
  Sparkles,
  Trophy,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

const ACTIVITY_VERB: Record<string, string> = {
  started: "started",
  finished: "finished",
  progress: "made progress in",
  session: "read",
  "pdf-session": "read",
  wishlist: "added to Wishlist",
  upload: "uploaded",
};

type ReadingCardModel = {
  key: string;
  kind: "book" | "document";
  title: string;
  author: string;
  coverUrl: string | null;
  percent: number;
  currentPage: number;
  total: number;
  readerLabel: string;
  readerFaces: Array<{ name: string; src?: string | null }>;
  href: string;
  menu?: {
    onProgress: () => void;
    onFinish: () => void;
  };
};

function ReadingCard({ card }: { card: ReadingCardModel }) {
  return (
    <article className="reading-card paper-card group relative grid min-h-[9.4rem] grid-cols-[5.2rem_1fr] gap-3.5 overflow-hidden rounded-lg p-3.5 transition hover:border-olive/45 sm:grid-cols-[6.1rem_1fr] sm:gap-4 sm:p-4">
      <Link to={card.href} className="self-center">
        <BookCover
          title={card.title}
          author={card.author}
          coverUrl={card.coverUrl}
          className="w-full transition-transform duration-500 group-hover:-translate-y-0.5"
        />
      </Link>
      <div className="flex min-w-0 flex-col">
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0 pr-1">
            <Link
              to={card.href}
              className="font-display line-clamp-2 block text-[1.14rem] leading-[1.08] font-semibold hover:text-terracotta"
            >
              {card.title}
            </Link>
            <p className="mt-1 truncate text-[0.69rem] text-muted-foreground">
              {card.author}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {card.menu ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label={`More actions for ${card.title}`}
                    className="-mr-1 rounded-full p-1 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                  >
                    <MoreHorizontal className="size-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={card.menu.onProgress}>
                    Update progress
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={card.menu.onFinish}>
                    Mark finished
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <span className="rounded-full border border-border/70 px-1.5 py-0.5 text-[0.48rem] tracking-[0.08em] text-muted-foreground uppercase">
                PDF
              </span>
            )}
            <span className="font-display text-[1.55rem] leading-none text-forest">
              {card.percent}%
            </span>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="reading-reader-chip inline-flex items-center gap-1 rounded-full border border-[#d8c7aa]/80 bg-[#f0e5d1] py-0.5 pr-2 pl-0.5 text-[0.59rem] text-[#5e604e]">
            {card.readerFaces.length > 1 ? (
              <span className="flex -space-x-1.5">
                {card.readerFaces.slice(0, 2).map((face, index) => (
                  <Avatar
                    key={index}
                    name={face.name}
                    src={face.src}
                    tone={index === 0 ? "olive" : "terracotta"}
                    className="size-4 border border-[#f7efdf] text-[0.44rem]"
                  />
                ))}
              </span>
            ) : (
              <Avatar
                name={card.readerFaces[0]?.name ?? "Reader"}
                src={card.readerFaces[0]?.src}
                tone="olive"
                className="size-4 border border-[#f7efdf] text-[0.44rem]"
              />
            )}
            {card.readerLabel}
          </span>
          <span className="ml-auto text-[0.62rem] text-muted-foreground">
            Page {card.currentPage}
            {card.total ? ` of ${card.total}` : ""}
          </span>
        </div>

        <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-[#e3d6c0]">
          <div
            className={cn(
              "h-full rounded-full",
              card.kind === "document" ? "bg-olive" : "bg-forest",
            )}
            style={{ width: `${card.percent}%` }}
          />
        </div>

        <div className="mt-auto pt-2.5">
          <Button
            asChild
            size="sm"
            className="h-7 gap-1.5 rounded-md bg-forest px-3 text-[0.66rem] text-primary-foreground shadow-none hover:bg-forest/90"
          >
            <Link to={card.href}>
              <Play className="size-2.5 fill-current" />
              {card.kind === "document" ? "Resume PDF" : "Continue Reading"}
              <ChevronRight className="size-3 opacity-70" />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

export default function Home() {
  const data = useQuery(api.stats.home);
  const completeRecord = useMutation(api.books.completeRecord);
  const [progressTarget, setProgressTarget] = useState<{
    recordId: Id<"readingRecords">;
    bookId: Id<"books">;
    title: string;
    pageCount: number;
    currentPage: number;
  } | null>(null);
  const [finishTarget, setFinishTarget] = useState<{
    recordId: Id<"readingRecords">;
    title: string;
  } | null>(null);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [showAllReading, setShowAllReading] = useState(false);

  if (!data) {
    return (
      <div className="space-y-6">
        <div className="home-hero h-[23rem] animate-pulse rounded-sm bg-secondary/45" />
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-40 animate-pulse rounded-lg bg-secondary/70" />
          ))}
        </div>
      </div>
    );
  }

  const me = data.readers.find((reader) => reader.userId === data.myUserId);
  const anyReading = data.currentlyReading.length > 0 || data.digital.length > 0;
  const checkInBooks = data.currentlyReading.map((entry) => ({
    _id: entry.book._id,
    title: entry.book.title,
    pageCount: entry.book.pageCount,
  }));

  const cards: ReadingCardModel[] = [
    ...data.currentlyReading.map((entry) => {
      const mine = entry.records.find(
        (record) => record.record.readerId === data.myUserId,
      );
      const primary = mine ?? entry.records[0];
      const faces = entry.records
        .map((record) => {
          const profile = data.readers.find(
            (reader) => reader.userId === record.record.readerId,
          );
          return {
            name: profile?.displayName ?? record.readerName,
            src: profile?.avatarUrl,
          };
        })
        .filter(Boolean);
      return {
        key: entry.book._id,
        kind: "book" as const,
        title: entry.book.title,
        author: entry.book.author,
        coverUrl: entry.book.coverUrl ?? null,
        percent: entry.percent,
        currentPage: primary?.record.currentPage ?? 0,
        total: entry.total,
        readerLabel:
          entry.records.length > 1
            ? "Together"
            : faces[0]?.name === me?.displayName
              ? "You"
              : (faces[0]?.name ?? "Reader"),
        readerFaces: faces,
        href: `/book/${entry.book._id}`,
        menu: mine
          ? {
              onProgress: () =>
                setProgressTarget({
                  recordId: mine.record._id,
                  bookId: entry.book._id,
                  title: entry.book.title,
                  pageCount: entry.total,
                  currentPage: mine.record.currentPage,
                }),
              onFinish: () =>
                setFinishTarget({
                  recordId: mine.record._id,
                  title: entry.book.title,
                }),
            }
          : undefined,
      };
    }),
    ...data.digital.map((entry) => ({
      key: entry.document._id,
      kind: "document" as const,
      title: entry.document.title,
      author: entry.document.author ?? "Digital document",
      coverUrl: entry.coverUrl,
      percent: entry.percent,
      currentPage: entry.lastPage,
      total: entry.document.totalPages,
      readerLabel: "You",
      readerFaces: me ? [{ name: me.displayName, src: me.avatarUrl }] : [],
      href: `/read/${entry.document._id}`,
    })),
  ];
  const visibleCards = showAllReading ? cards : cards.slice(0, 3);
  const totalBooks = data.shared.booksCompleted;
  const journeyStats = [
    {
      icon: BookOpen,
      value: totalBooks.toLocaleString(),
      label: "Books Completed",
    },
    {
      icon: FileText,
      value: data.shared.pagesRead.toLocaleString(),
      label: "Pages Read",
    },
    {
      icon: BookMarked,
      value: data.shared.currentlyReading.toLocaleString(),
      label: "Currently Reading",
    },
    {
      icon: Heart,
      value: data.shared.sharedBooksCompleted.toLocaleString(),
      label: "Shared Books",
    },
  ];

  return (
    <div className="space-y-8 pb-6">
      <section className="home-hero relative -mt-1 overflow-hidden">
        <BotanicalSpray className="pointer-events-none absolute -top-8 -left-12 h-44 w-44 text-olive/45" />
        <BotanicalSpray className="pointer-events-none absolute -right-10 bottom-0 h-52 w-52 rotate-180 text-olive/35" />

        <div className="relative z-10 grid items-center gap-2 lg:grid-cols-[0.92fr_1.08fr] lg:gap-0">
          <div className="max-w-[32rem] px-5 pt-9 pb-4 sm:px-8 lg:py-12 lg:pl-7">
            <p className="hero-kicker">
              <span aria-hidden>✦</span>
              {new Date().toLocaleDateString(undefined, {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
              <span aria-hidden>·</span>
              <span>A reading kind of day</span>
            </p>
            <h1 className="font-display mt-4 text-[2.65rem] leading-[0.92] tracking-[-0.045em] text-foreground sm:text-[4rem] lg:text-[3.5rem] xl:text-[4.4rem]">
              Every book holds
              <br />
              a little{" "}
              <span className="font-display-italic whitespace-nowrap text-terracotta">
                universe.
              </span>
            </h1>
            <p className="font-display mt-4 max-w-md text-[1.03rem] leading-relaxed text-muted-foreground sm:text-[1.12rem]">
              Two readers. One universe of stories. Here is where your pages meet.
            </p>

            <div className="mt-6 flex flex-wrap gap-2.5 lg:hidden">
              <Button
                onClick={() => setCheckInOpen(true)}
                className="h-9 rounded-full bg-forest px-5 text-[0.76rem] text-primary-foreground shadow-none hover:bg-forest/90"
              >
                <Search className="mr-1.5 size-3.5" />
                Log reading
              </Button>
              <Button
                variant="outline"
                asChild
                className="h-9 rounded-full border-[#cdbb9d] bg-[#fbf4e5] px-4 text-[0.76rem]"
              >
                <Link to="/discover">
                  Discover a book <ArrowRight className="ml-1.5 size-3.5" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="relative h-[17rem] min-w-0 sm:h-[21rem] lg:h-[24rem]">
            <div className="absolute inset-x-0 bottom-0 top-1 sm:inset-0">
              <HeroReadingScene />
            </div>
          </div>
        </div>

        <div className="absolute top-5 right-6 z-20 hidden items-center gap-2 lg:flex">
          <Button
            onClick={() => setCheckInOpen(true)}
            className="h-9 rounded-full bg-forest px-5 text-[0.76rem] text-primary-foreground shadow-[0_8px_18px_-12px_rgba(36,49,31,0.8)] hover:bg-forest/90"
          >
            <Search className="mr-1.5 size-3.5" />
            Log reading
          </Button>
          <Button
            variant="outline"
            asChild
            className="h-9 rounded-full border-[#cdbb9d] bg-[#fbf4e5]/90 px-4 text-[0.76rem] shadow-none hover:bg-[#fbf4e5]"
          >
            <Link to="/discover">
              Discover a book <ArrowRight className="ml-1.5 size-3.5" />
            </Link>
          </Button>
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="label-caps flex items-center gap-2">
              <BookOpen className="size-3.5 text-[#7e715c]" />
              Section One
            </p>
            <h2 className="font-display mt-1.5 text-[2rem] leading-none tracking-[-0.025em]">
              Currently Reading
            </h2>
            <p className="mt-1.5 text-[0.78rem] text-muted-foreground">
              Dive into your ongoing stories. Pick up where you left off.
            </p>
          </div>
          {cards.length > 3 ? (
            <button
              type="button"
              onClick={() => setShowAllReading((current) => !current)}
              className="inline-flex items-center gap-1 text-[0.72rem] text-muted-foreground transition hover:text-terracotta"
            >
              {showAllReading ? "Show less" : "See all"}
              <ArrowRight className="size-3.5" />
            </button>
          ) : null}
        </div>

        {anyReading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleCards.map((card) => (
              <ReadingCard key={card.key} card={card} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No open books yet"
            description="Start a book from Discover or add a PDF to the Library. As soon as you begin, it will appear here with your progress."
            icon={<BookOpen className="size-4" />}
            action={
              <Button asChild className="rounded-full bg-forest text-primary-foreground">
                <Link to="/discover">Find your next book</Link>
              </Button>
            }
          />
        )}
      </section>

      <section className="grid items-start gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Flame className="size-4 text-terracotta" />
            <h2 className="font-display text-[1.55rem] leading-none">Reading Streaks</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.readers.map((reader) => {
              const partner = reader.userId !== data.myUserId;
              return (
                <article
                  key={reader.userId}
                  className="streak-card paper-card relative overflow-hidden rounded-lg px-3.5 py-3.5"
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar
                      name={reader.displayName}
                      src={reader.avatarUrl}
                      tone={partner ? "terracotta" : "olive"}
                      className="size-8 shrink-0 text-[0.62rem]"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-[0.78rem] font-medium">
                        {partner ? reader.displayName : "You"}
                      </p>
                      <p className="text-[0.56rem] tracking-[0.12em] text-muted-foreground uppercase">
                        {partner ? "Your partner" : "Reader one"}
                      </p>
                    </div>
                    <MoreHorizontal className="ml-auto size-3.5 text-muted-foreground/60" />
                  </div>
                  <div className="mt-4 flex items-end justify-between gap-2">
                    <div>
                      <p className="font-display text-[2rem] leading-none">
                        {reader.current}
                        <span className="ml-1 font-sans text-[0.58rem] font-normal text-muted-foreground">
                          days
                        </span>
                      </p>
                      <p className="mt-1 text-[0.55rem] tracking-[0.08em] text-muted-foreground uppercase">
                        Current Streak
                      </p>
                    </div>
                    <span className="mb-1 h-8 w-px bg-border/70" />
                    <div>
                      <p className="font-display text-[1.4rem] leading-none text-terracotta">
                        {reader.best}
                      </p>
                      <p className="mt-1 text-[0.55rem] tracking-[0.08em] text-muted-foreground uppercase">
                        Best Streak
                      </p>
                    </div>
                  </div>
                  <Sparkles className="pointer-events-none absolute right-2 bottom-2 size-7 rotate-12 text-olive/10" />
                </article>
              );
            })}
          </div>
          <p className="mt-3 inline-flex items-center gap-1.5 text-[0.66rem] text-muted-foreground">
            <Sparkles className="size-3 text-gold" />
            {data.shared.daysThisWeek} shared reading day
            {data.shared.daysThisWeek === 1 ? "" : "s"} this week · {data.shared.totalDays}{" "}
            all-time
          </p>
        </div>

        <div className="paper-card rounded-lg p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex size-4 items-center justify-center rounded-full border border-forest/25 text-forest">
                <span className="font-display text-[0.62rem]">✦</span>
              </span>
              <h2 className="font-display text-[1.35rem] leading-none">Recent Activity</h2>
            </div>
            <Link
              to="/stats"
              className="inline-flex items-center gap-0.5 text-[0.61rem] text-muted-foreground transition hover:text-terracotta"
            >
              See all <ArrowRight className="size-2.5" />
            </Link>
          </div>
          <ol className="relative mt-4 space-y-3.5 before:absolute before:top-1 before:bottom-1 before:left-[3px] before:w-px before:bg-border/70">
            {data.activity.length ? (
              data.activity.slice(0, 4).map((item) => (
                <li key={item._id} className="relative flex gap-3">
                  <span
                    className={cn(
                      "relative z-10 mt-1 size-[7px] shrink-0 rounded-full border border-card",
                      item.isMine ? "bg-forest" : "bg-terracotta",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.66rem] leading-snug">
                      <span className="font-medium">
                        {item.isMine ? "You" : item.readerName}
                      </span>{" "}
                      <span className="text-muted-foreground">
                        {ACTIVITY_VERB[item.type] ?? item.detail ?? item.type}
                      </span>{" "}
                      {item.bookId ? (
                        <Link
                          to={`/book/${item.bookId}`}
                          className="font-medium hover:text-terracotta hover:underline"
                        >
                          {item.title}
                        </Link>
                      ) : (
                        <span className="font-medium">{item.title}</span>
                      )}
                    </p>
                    <p className="mt-0.5 text-[0.57rem] text-muted-foreground/80">
                      {timeAgo(item.createdAt)}
                    </p>
                  </div>
                </li>
              ))
            ) : (
              <li className="text-[0.7rem] text-muted-foreground">
                No activity yet. Start a book and the timeline will fill in.
              </li>
            )}
          </ol>
        </div>
      </section>

      <section className="journey-bar">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-[#b99a55]/40 bg-[#f5e8cf] text-[#8f7038]">
            <Trophy className="size-4" strokeWidth={1.7} />
          </span>
          <p className="font-display whitespace-nowrap text-[1.13rem] font-semibold text-foreground">
            Our Reading Journey
          </p>
        </div>
        <div className="no-scrollbar flex flex-1 items-center gap-4 overflow-x-auto py-1 sm:gap-6">
          {journeyStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="flex shrink-0 items-center gap-3">
                {index > 0 ? <span className="h-8 w-px bg-border" /> : null}
                <Icon className="size-4 text-muted-foreground" strokeWidth={1.7} />
                <div>
                  <p className="font-display text-[1.25rem] leading-none">{stat.value}</p>
                  <p className="mt-1 text-[0.53rem] tracking-[0.1em] text-muted-foreground uppercase">
                    {stat.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        <p className="font-display-italic hidden shrink-0 items-center gap-2 text-[1.02rem] text-muted-foreground xl:flex">
          “Good books. Better together.”
          <Heart className="size-4 fill-[#a75f3d]/20 text-[#a75f3d]" strokeWidth={1.6} />
        </p>
      </section>

      {progressTarget ? (
        <ProgressDialog
          open={Boolean(progressTarget)}
          onOpenChange={(open) => !open && setProgressTarget(null)}
          recordId={progressTarget.recordId}
          book={{
            _id: progressTarget.bookId,
            title: progressTarget.title,
            pageCount: progressTarget.pageCount,
          }}
          totalPages={progressTarget.pageCount || 1}
          initialPage={progressTarget.currentPage}
        />
      ) : null}

      <FinishDialog
        open={Boolean(finishTarget)}
        onOpenChange={(open) => !open && setFinishTarget(null)}
        title={finishTarget?.title ?? ""}
        onComplete={async (input) => {
          if (!finishTarget) return;
          await completeRecord({ recordId: finishTarget.recordId, ...input });
        }}
      />

      <CheckInDialog
        open={checkInOpen}
        onOpenChange={setCheckInOpen}
        books={checkInBooks}
        documents={data.digital.map((entry) => ({
          _id: entry.document._id,
          title: entry.document.title,
          totalPages: entry.document.totalPages,
        }))}
      />
    </div>
  );
}

function BotanicalSpray({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 180 180" className={className} aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round">
        <path d="M16 176C32 120 65 74 112 37c19-15 38-24 58-27" />
        <path d="M61 117c-21-5-35-17-42-36M82 91c-13-20-12-39 2-56M98 73c3-24 15-40 36-49M109 61c24-2 41 6 52 24" />
        <path d="M48 143c-18 1-31-6-39-21M70 121c-4-20 3-36 21-48" />
      </g>
      {[
        [38, 102, -44],
        [61, 81, -64],
        [87, 54, -38],
        [113, 44, -22],
        [134, 58, 26],
        [146, 86, 44],
        [28, 128, -38],
        [63, 104, -30],
      ].map(([x, y, rotate], index) => (
        <ellipse
          key={index}
          cx={x}
          cy={y}
          rx={10}
          ry={4}
          fill="currentColor"
          opacity={0.5}
          transform={`rotate(${rotate} ${x} ${y})`}
        />
      ))}
    </svg>
  );
}
