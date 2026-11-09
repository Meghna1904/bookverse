import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { BookCover } from "@/components/bookverse/primitives";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  FileText,
  Heart,
  Images,
  PlayCircle,
  Search,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";

type MemoryReader = {
  userId: Id<"users">;
  displayName: string;
  avatarUrl: string | null;
};

type MemoryItem = {
  id: string;
  kind: "book" | "document";
  status: "completed" | "reading" | "wishlist" | "document";
  title: string;
  author: string;
  coverUrl: string | null;
  date: number;
  readerIds: Id<"users">[];
  readers: MemoryReader[];
  together: boolean;
  bookId?: Id<"books">;
  documentId?: Id<"libraryDocuments">;
  review?: string;
  note?: string;
  rating?: number;
  progress?: number;
  currentPage?: number;
  pageCount?: number;
};

type StatusFilter = "all" | "reading" | "completed" | "wishlist" | "documents";
type SortMode = "newest" | "oldest" | "title";

const STATUS_FILTERS: Array<{
  id: StatusFilter;
  label: string;
  icon: typeof BookOpen;
}> = [
  { id: "all", label: "All Books", icon: BookOpen },
  { id: "reading", label: "Currently Reading", icon: PlayCircle },
  { id: "completed", label: "Completed", icon: CheckCircle2 },
  { id: "wishlist", label: "Wishlist", icon: Heart },
  { id: "documents", label: "Digital PDFs", icon: FileText },
];

const PIN_COLORS = ["#b76b54", "#d4ad55", "#7c9478", "#aa7f9f", "#6f8f9f", "#c28c5a"];

function formatMemoryDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function readerLabel(item: MemoryItem, myUserId: Id<"users">) {
  if (item.together || item.readerIds.length > 1) return "Together";
  if (item.readerIds.length === 1) {
    return item.readerIds[0] === myUserId ? "You" : (item.readers[0]?.displayName ?? "Partner");
  }
  return "Shared";
}

function cardNote(item: MemoryItem) {
  const text = item.review?.trim() || item.note?.trim();
  if (!text) {
    return item.status === "wishlist" ? "Waiting on the bedside table ♡" : "A page we will come back to ♡";
  }
  const clean = text.replace(/\s+/g, " ");
  const firstThought = clean.split(/(?<=[.!?])\s+/)[0] ?? clean;
  const short = firstThought.length > 78 ? `${firstThought.slice(0, 74).trimEnd()}…` : firstThought;
  return short.replace(/[.!?]+$/, "") + " ♡";
}

export default function Memories() {
  const data = useQuery(api.books.memories);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [reader, setReader] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("newest");

  const items: MemoryItem[] = data?.items ?? [];

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    const result = items.filter((item) => {
      if (status === "all" && (item.status === "wishlist" || item.status === "document")) {
        return false;
      }
      if (status !== "all" && item.status !== status) return false;
      if (reader === "together" && !item.together) return false;
      if (reader !== "all" && reader !== "together" && !item.readerIds.includes(reader as Id<"users">)) {
        return false;
      }
      if (!search) return true;
      return [item.title, item.author, item.review, item.note]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(search));
    });
    return result.sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title);
      if (sort === "oldest") return a.date - b.date;
      return b.date - a.date;
    });
  }, [items, query, reader, sort, status]);

  const readerChoices = data?.readers ?? [];

  const getTarget = (item: MemoryItem) => {
    if (item.documentId) return `/read/${item.documentId}`;
    if (item.bookId) return `/book/${item.bookId}`;
    return "/shelf";
  };

  return (
    <div className="memories-wall relative min-h-[calc(100vh-4rem)] overflow-hidden text-[#f5e8cf]">
      <MemoryLights />
      <MemoryVine side="left" />
      <MemoryVine side="right" />
      <MemoryPlant />
      <MemoryLamp />
      <MemoryCamera />
      <MemoryBookStack />

      <div className="relative z-10 mx-auto w-full max-w-[96rem] px-5 pt-28 pb-24 sm:px-8 sm:pt-32 lg:px-16 lg:pt-36 xl:px-24">
        <header className="flex flex-col justify-between gap-8 lg:flex-row lg:items-start">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="font-display text-[3rem] leading-none tracking-[-0.035em] text-[#f9efd9] italic sm:text-[3.7rem]">
                Our Memories
              </h1>
              <HeartDoodle />
            </div>
            <p className="font-display-italic mt-3 max-w-2xl text-[1.12rem] leading-relaxed text-[#f3dfc0] sm:text-[1.22rem]">
              A collection of stories, moments and pages that stayed with us…
            </p>
          </div>
          <QuoteNote />
        </header>

        <div className="mt-8 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex min-w-0 flex-col gap-3">
            <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-1">
              {STATUS_FILTERS.map((filter) => {
                const Icon = filter.icon;
                const active = status === filter.id;
                return (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setStatus(filter.id)}
                    className={cn(
                      "memory-filter inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-[0.76rem] whitespace-nowrap transition",
                      active && "is-active",
                    )}
                  >
                    <Icon className="size-3.5" />
                    {filter.label}
                  </button>
                );
              })}

              <span className="mx-1.5 hidden h-7 w-px shrink-0 bg-[#e2cda8]/20 sm:block" />

              <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto">
                {readerChoices.map((choice) => {
                  const active = reader === choice.userId;
                  return (
                    <button
                      key={choice.userId}
                      type="button"
                      onClick={() => setReader(active ? "all" : choice.userId)}
                      className={cn(
                        "memory-filter inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-[0.76rem] whitespace-nowrap transition",
                        active && "is-active",
                      )}
                    >
                      {choice.avatarUrl ? (
                        <img
                          src={choice.avatarUrl}
                          alt=""
                          className="size-4 rounded-full object-cover"
                        />
                      ) : (
                        <span className="inline-flex size-4 items-center justify-center rounded-full bg-[#e7d4b2]/20 text-[0.5rem]">
                          {choice.displayName.slice(0, 1).toUpperCase()}
                        </span>
                      )}
                      {choice.displayName}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setReader(reader === "together" ? "all" : "together")}
                  className={cn(
                    "memory-filter inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-[0.76rem] whitespace-nowrap transition",
                    reader === "together" && "is-active",
                  )}
                >
                  <Users className="size-3.5" />
                  Together
                </button>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-stretch gap-3 sm:flex-row sm:items-center xl:flex-col xl:items-end">
            <div className="relative w-full sm:w-[19rem]">
              <Search className="absolute top-2.5 left-3 size-4 text-[#6e5639]" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search in memories..."
                aria-label="Search memories"
                className="h-9 rounded-full border-[#dcc49b]/50 bg-[#fbf1dc]/92 pl-9 text-[0.78rem] text-[#403426] placeholder:text-[#8a765d] focus-visible:ring-[#7d8b69]"
              />
            </div>
            <label className="flex items-center justify-end gap-2 text-[0.75rem] text-[#f3e3c7]">
              <span className="whitespace-nowrap">Sort by:</span>
              <span className="relative">
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value as SortMode)}
                  aria-label="Sort memories"
                  className="h-8 appearance-none rounded-md border border-[#dcc49b]/45 bg-[#f7ead2] py-1 pr-8 pl-3 text-[0.72rem] font-medium text-[#4a3c2a] outline-none"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="title">Title A–Z</option>
                </select>
                <ChevronDown className="pointer-events-none absolute top-2 right-2.5 size-3.5 text-[#6e5639]" />
              </span>
            </label>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#f4e1bf]/12 pt-4">
          <p className="text-[0.66rem] tracking-[0.18em] text-[#ead7b6]/60 uppercase">
            {filtered.length} {filtered.length === 1 ? "memory" : "memories"} pinned
          </p>
          <p className="hidden text-[0.68rem] text-[#ead7b6]/50 italic sm:block">
            A little crooked, exactly like us.
          </p>
        </div>

        {data === undefined ? (
          <div className="mt-9 grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {Array.from({ length: 12 }).map((_, index) => (
              <div
                key={index}
                className="aspect-[3/4.4] animate-pulse rounded-[3px] bg-[#f4e7cd]/10"
              />
            ))}
          </div>
        ) : filtered.length ? (
          <div className="memory-grid mt-9">
            {filtered.map((item, index) => (
              <PolaroidCard
                key={item.id}
                item={item}
                index={index}
                myUserId={data?.myUserId ?? item.readerIds[0]}
                href={getTarget(item)}
              />
            ))}
          </div>
        ) : (
          <div className="mt-14 flex flex-col items-center text-center">
            <div className="memory-empty-note">
              <Images className="mx-auto mb-3 size-5 text-[#7b664b]" />
              <p className="font-display text-xl text-[#43382a]">No memories pinned here yet.</p>
              <p className="mt-1 text-[0.76rem] leading-relaxed text-[#756149]">
                Finish a book together, or loosen a filter to see the rest of the wall.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PolaroidCard({
  item,
  index,
  myUserId,
  href,
}: {
  item: MemoryItem;
  index: number;
  myUserId: Id<"users">;
  href: string;
}) {
  const tilt = [-3.2, 2.1, -1.4, 3.3, -2.4, 1.5][index % 6];
  const pin = PIN_COLORS[(index + item.title.length) % PIN_COLORS.length];
  const statusLabel =
    item.status === "reading"
      ? `${item.progress ?? 0}% read`
      : item.status === "wishlist"
        ? "On the wishlist"
        : item.status === "document"
          ? "Digital PDF"
          : null;

  return (
    <Link
      to={href}
      className="polaroid group block text-left"
      style={{ "--tilt": `${tilt}deg`, "--pin": pin } as React.CSSProperties}
      aria-label={`Open ${item.title}`}
    >
      <span aria-hidden className="polaroid-pin" />
      <span className="polaroid-frame block">
        <span className="polaroid-photo block">
          <BookCover
            title={item.title}
            author={item.author}
            coverUrl={item.coverUrl}
            className="h-full w-full rounded-none shadow-none"
          />
          {statusLabel ? (
            <span className="polaroid-status">{statusLabel}</span>
          ) : null}
          {item.status === "reading" ? (
            <span className="polaroid-progress">
              <span style={{ width: `${item.progress ?? 0}%` }} />
            </span>
          ) : null}
        </span>
        <span className="polaroid-caption block">
          <span className="font-display line-clamp-2 block text-[0.98rem] leading-[1.08] font-semibold text-[#3f3427]">
            {item.title}
          </span>
          <span className="mt-1 block truncate text-[0.66rem] font-medium text-[#66523c]">
            {item.author}
          </span>
          <span className="mt-1 block text-[0.6rem] text-[#8a7357]">
            {formatMemoryDate(item.date)} • {readerLabel(item, myUserId)}
          </span>
          <span className="memory-hand mt-2 line-clamp-2 block min-h-[2.1rem] text-[0.72rem] leading-[1.35] text-[#5a5145]">
            {cardNote(item)}
          </span>
        </span>
      </span>
    </Link>
  );
}

function HeartDoodle() {
  return (
    <svg viewBox="0 0 76 54" className="h-10 w-16 text-[#f2dfbf]" aria-hidden>
      <path
        d="M21 40C11 33 4 25 6 17c1-8 10-11 16-5 3 3 4 5 5 8 2-8 7-13 14-12 8 1 12 9 8 16-5 10-17 17-28 22"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M54 15c3-3 8-1 8 3 0 4-5 8-8 10-3-3-7-7-6-10 1-3 4-5 6-3Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.1"
      />
    </svg>
  );
}

function QuoteNote() {
  return (
    <div className="memory-quote-note relative hidden shrink-0 sm:block">
      <span aria-hidden className="memory-tape" />
      <p className="font-display-italic text-[1.08rem] leading-snug text-[#59452d]">
        Good books.
        <br />
        Better together. <span className="text-[#a75f3d]">♡</span>
      </p>
    </div>
  );
}

function MemoryLights() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-[2]" aria-hidden>
      <svg
        viewBox="0 0 1400 170"
        preserveAspectRatio="xMidYMin slice"
        className="h-28 w-full overflow-visible sm:h-32"
      >
        <defs>
          <radialGradient id="bulb-glow">
            <stop offset="0%" stopColor="#ffe6a7" stopOpacity="0.7" />
            <stop offset="55%" stopColor="#f8c872" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#f8c872" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="bulb-glass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff7d5" />
            <stop offset="55%" stopColor="#f4ce83" />
            <stop offset="100%" stopColor="#d89a46" />
          </linearGradient>
        </defs>
        <path
          d="M-20 10C90 58 205 72 330 46s220-58 360-24 240 82 380 56 240-70 380-45"
          fill="none"
          stroke="#1d150e"
          strokeWidth="1.5"
        />
        {[
          [66, 42],
          [170, 62],
          [278, 58],
          [392, 40],
          [498, 46],
          [614, 68],
          [730, 72],
          [846, 53],
          [962, 42],
          [1078, 60],
          [1198, 58],
          [1308, 39],
        ].map(([x, y], index) => (
          <g key={index}>
            <circle cx={x} cy={y + 27} r="45" fill="url(#bulb-glow)" />
            <path d={`M${x - 7} ${y + 18}h14v7h-14z`} fill="#4d3924" />
            <path
              d={`M${x - 10} ${y + 25}c0 14 4 22 10 27 6-5 10-13 10-27 0-7-4-11-10-11s-10 4-10 11z`}
              fill="url(#bulb-glass)"
              stroke="#9d6d32"
              strokeWidth="0.5"
            />
            <path
              d={`M${x} ${y + 30}v12`}
              stroke="#e6b35e"
              strokeWidth="1.2"
              strokeLinecap="round"
              opacity="0.7"
            />
          </g>
        ))}
      </svg>
    </div>
  );
}

function MemoryVine({ side }: { side: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 300 520"
      className={cn(
        "pointer-events-none absolute top-3 z-[1] h-[30rem] w-[13rem] text-[#66724f] opacity-55",
        side === "left" ? "left-0 -scale-x-100" : "right-0",
      )}
      aria-hidden
    >
      <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <path d="M12 10c42 56 35 110 78 156s67 107 54 176" />
        <path d="M48 76c44 4 75 30 89 69M92 162c48-6 82 16 101 54M138 274c32-18 59-16 82 7M168 356c-1 45-18 73-48 93" />
        <path d="M12 30c30 40 22 80 48 113s53 61 43 108" opacity="0.7" />
      </g>
      {[
        [44, 62, 8, -20],
        [88, 96, 10, 25],
        [115, 145, 12, -35],
        [126, 209, 9, 30],
        [180, 239, 13, -15],
        [205, 291, 9, 28],
        [120, 327, 11, -42],
        [159, 382, 8, 12],
        [97, 425, 12, -25],
      ].map(([x, y, r, rotate], index) => (
        <ellipse
          key={index}
          cx={x}
          cy={y}
          rx={r}
          ry={r * 0.42}
          fill="currentColor"
          opacity={0.5}
          transform={`rotate(${rotate} ${x} ${y})`}
        />
      ))}
      <path d="M190 84c-12 21-9 41 8 56" fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function MemoryPlant() {
  return (
    <svg
      viewBox="0 0 150 220"
      className="pointer-events-none absolute bottom-24 left-3 z-[1] hidden h-48 w-32 opacity-80 xl:block"
      aria-hidden
    >
      <path
        d="M61 167c-8-37 1-70 26-93M64 145c-22-23-30-52-22-81M75 154c9-40 34-64 66-72M70 133c26-9 50-2 66 18"
        fill="none"
        stroke="#596548"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {[
        [54, 59, -26],
        [43, 91, -48],
        [99, 70, 32],
        [119, 91, 42],
        [58, 116, -18],
        [124, 141, 48],
      ].map(([x, y, rotate], index) => (
        <ellipse
          key={index}
          cx={x}
          cy={y}
          rx={14}
          ry={7}
          fill="#71805e"
          opacity={0.65}
          transform={`rotate(${rotate} ${x} ${y})`}
        />
      ))}
      <path d="M43 165h66l-9 43H52l-9-43Z" fill="#8e5b43" />
      <path d="M43 165h66l-2 9H45l-2-9Z" fill="#a86e4f" />
      <ellipse cx="76" cy="208" rx="30" ry="4" fill="#1a1109" opacity="0.3" />
    </svg>
  );
}

function MemoryLamp() {
  return (
    <svg
      viewBox="0 0 150 230"
      className="pointer-events-none absolute top-[45%] right-3 z-[1] hidden h-56 w-36 opacity-85 xl:block"
      aria-hidden
    >
      <ellipse cx="80" cy="178" rx="40" ry="36" fill="#f4c66f" opacity="0.12" />
      <path d="M55 205h50l-4 9H59l-4-9Z" fill="#392b1d" />
      <path
        d="M61 92h38v104H61z"
        fill="#f1c26d"
        opacity="0.32"
        stroke="#22180f"
        strokeWidth="3"
      />
      <path
        d="M55 88h50l-6-32H61l-6 32Z"
        fill="#2d2116"
        stroke="#17100a"
        strokeWidth="1.5"
      />
      <path d="M67 56h26v-6H67z" fill="#261b12" />
      <path
        d="M58 58c0-28 8-44 22-52 14 8 22 24 22 52"
        fill="none"
        stroke="#24180f"
        strokeWidth="2"
      />
      <path d="M61 92v104M99 92v104M61 145h38" stroke="#25190f" strokeWidth="2" />
      <path
        d="M70 160c0-16 9-27 19-28 2 14-5 25-19 28Z"
        fill="#f6d78d"
        opacity="0.7"
      />
      <path d="M75 199c17 0 29 4 36 12" stroke="#1a1109" strokeWidth="4" opacity="0.5" />
    </svg>
  );
}

function MemoryCamera() {
  return (
    <svg
      viewBox="0 0 180 140"
      className="pointer-events-none absolute right-5 bottom-6 z-[1] hidden h-28 w-36 opacity-90 xl:block"
      aria-hidden
    >
      <ellipse cx="90" cy="131" rx="66" ry="6" fill="#180f08" opacity="0.35" />
      <path d="M28 43h26l8-13h44l8 13h20v66H28V43Z" fill="#3a2b20" />
      <path d="M28 43h124v14H28z" fill="#554334" />
      <rect x="43" y="52" width="94" height="52" rx="4" fill="#2a1e16" />
      <circle cx="90" cy="78" r="27" fill="#17110c" stroke="#9a805c" strokeWidth="3" />
      <circle cx="90" cy="78" r="17" fill="#2f3d3b" stroke="#6d5a41" strokeWidth="2" />
      <circle cx="84" cy="71" r="5" fill="#b8c2aa" opacity="0.35" />
      <rect x="124" y="35" width="17" height="10" rx="2" fill="#17100a" />
      <circle cx="54" cy="60" r="4" fill="#b89b63" />
      <path d="M30 109h120l-4 12H34l-4-12Z" fill="#22170f" />
      <path d="M42 30c15-20 38-24 57-19" fill="none" stroke="#2c2016" strokeWidth="3" />
    </svg>
  );
}

function MemoryBookStack() {
  return (
    <svg
      viewBox="0 0 170 130"
      className="pointer-events-none absolute bottom-6 left-4 z-[1] hidden h-24 w-36 opacity-80 xl:block"
      aria-hidden
    >
      <ellipse cx="82" cy="116" rx="68" ry="6" fill="#180f08" opacity="0.35" />
      <path d="M26 96h116l-6 18H32l-6-18Z" fill="#69482f" />
      <path d="M34 80h106l-4 16H38l-4-16Z" fill="#53664c" />
      <path d="M40 65h94l-4 15H44l-4-15Z" fill="#8b583d" />
      <path d="M30 50h104l-4 15H34l-4-15Z" fill="#b18b58" />
      <path d="M40 36h86l-4 14H44l-4-14Z" fill="#435344" />
      <path d="M45 39h76M46 68h84M40 83h94" stroke="#e5ca9a" strokeWidth="1" opacity="0.35" />
      <path
        d="M34 24c-11-14-5-23 9-19 8 2 10 11 4 19M50 30c12-18 31-18 39-4"
        fill="none"
        stroke="#6e7d5a"
        strokeWidth="1.5"
        opacity="0.8"
      />
    </svg>
  );
}
