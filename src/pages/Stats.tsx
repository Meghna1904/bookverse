import { api } from "@/lib/data-api";
import {
  Avatar,
  PageHeader,
  SectionHeading,
  Stars,
} from "@/components/bookverse/primitives";
import { formatMinutes } from "@/lib/bookverse";
import { cn } from "@/lib/utils";
import { useQuery } from "@/lib/data-hooks";
import { Flame, Sparkles, Trophy } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const READER_COLORS = ["var(--chart-1)", "var(--chart-2)"];
const GENRE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "#8d6b6b",
  "#57614f",
];

function Panel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("paper-card rounded-lg p-5", className)}>{children}</div>;
}

export default function Stats() {
  const data = useQuery(api.stats.statsPage);
  if (!data) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-72 animate-pulse rounded bg-secondary" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="h-56 animate-pulse rounded-lg bg-secondary/60" />
          <div className="h-56 animate-pulse rounded-lg bg-secondary/60" />
        </div>
      </div>
    );
  }

  const names = data.readers.map((reader) => reader.displayName);
  const chartData = data.weekly.map((day) => ({
    label: day.label,
    [names[0] ?? "Reader one"]: day.pages[0] ?? 0,
    [names[1] ?? "Reader two"]: day.pages[1] ?? 0,
    shared: day.shared,
  }));
  const monthlyData = data.monthly.map((month) => ({
    label: month.label,
    [names[0] ?? "Reader one"]: month.pages[0] ?? 0,
    [names[1] ?? "Reader two"]: month.pages[1] ?? 0,
    books: (month.books[0] ?? 0) + (month.books[1] ?? 0),
  }));
  const bookMonthData = data.monthly.map((month) => ({
    label: month.label,
    [names[0] ?? "Reader one"]: month.books[0] ?? 0,
    [names[1] ?? "Reader two"]: month.books[1] ?? 0,
  }));

  const leaderMetrics = [
    {
      label: "Reading days",
      values: data.readers.map((reader) => reader.readingDays),
      unit: "days",
    },
    {
      label: "Pages read",
      values: data.readers.map((reader) => reader.pagesRead),
      unit: "pages",
    },
    {
      label: "Books completed",
      values: data.readers.map((reader) => reader.booksCompleted),
      unit: "books",
    },
    {
      label: "Current streak",
      values: data.readers.map((reader) => reader.currentStreak),
      unit: "days",
    },
  ];

  return (
    <div className="space-y-10 pb-6">
      <PageHeader
        eyebrow="Our Stats"
        title="Two reading lives, measured gently."
        description="A day counts when you advance at least one page in print or PDF. Resaving the same page doesn’t count, and multiple advances on one day still count as one streak day. Streaks are individual; the shelf is shared."
      />

      <section className="grid gap-5 md:grid-cols-2">
        {data.readers.map((reader, index) => (
          <article key={reader.userId} className="paper-card rounded-lg p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar
                  name={reader.displayName}
                  src={reader.avatarUrl}
                  tone={index === 0 ? "olive" : "terracotta"}
                  className="size-11"
                />
                <div>
                  <p className="label-caps">{index === 0 ? "Reader one" : "Reader two"}</p>
                  <p className="font-display text-xl leading-tight">{reader.displayName}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-display flex items-center justify-end gap-1 text-[2rem] leading-none text-terracotta">
                  <Flame className="size-4" />
                  {reader.currentStreak}
                </p>
                <p className="text-[0.6rem] tracking-[0.12em] text-muted-foreground uppercase">
                  current streak
                </p>
              </div>
            </div>
            <div className="rule my-4" />
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5">
              {[
                ["Books completed", String(reader.booksCompleted)],
                ["Pages read", reader.pagesRead.toLocaleString()],
                ["Reading time", formatMinutes(reader.minutesRead)],
                ["Reading days", String(reader.readingDays)],
                ["Personal best", `${reader.bestStreak} days`],
                ["Currently reading", String(reader.currentlyReading)],
                [
                  "Average rating",
                  reader.averageRating ? `${reader.averageRating} / 5` : "—",
                ],
                ["Ratings given", String(reader.ratingsGiven)],
              ].map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-3">
                  <dt className="text-[0.7rem] text-muted-foreground">{label}</dt>
                  <dd className="font-display text-[1.05rem]">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 flex items-center gap-2">
              <Stars value={reader.averageRating ?? 0} size={13} />
              <span className="text-[0.66rem] text-muted-foreground">
                {reader.averageRating ? "average of their own ratings" : "no ratings yet"}
              </span>
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Panel>
          <SectionHeading
            eyebrow="This week"
            title="Pages, day by day"
            description="Shared days are marked; they count for both streaks."
          />
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={2} margin={{ left: -22, right: 4, top: 8 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 5" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                />
                <Tooltip
                  cursor={{ fill: "rgba(117,128,95,0.08)" }}
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                />
                <Bar
                  dataKey={names[0] ?? "Reader one"}
                  fill={READER_COLORS[0]}
                  radius={[2, 2, 0, 0]}
                  maxBarSize={18}
                />
                <Bar
                  dataKey={names[1] ?? "Reader two"}
                  fill={READER_COLORS[1]}
                  radius={[2, 2, 0, 0]}
                  maxBarSize={18}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-[0.68rem] text-muted-foreground">
            {data.readers.map((reader, index) => (
              <span key={reader.userId} className="inline-flex items-center gap-1.5">
                <span
                  className="size-2 rounded-full"
                  style={{ background: READER_COLORS[index] }}
                />
                {reader.displayName}
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="size-3 text-gold" /> shared day
            </span>
          </div>
        </Panel>

        <Panel>
          <SectionHeading eyebrow="Friendly competition" title="The household ledger" />
          <div className="mt-4 space-y-4">
            {leaderMetrics.map((metric) => {
              const [a, b] = metric.values;
              const leader =
                a === b ? null : a > b ? (names[0] ?? "Reader one") : (names[1] ?? "Reader two");
              return (
                <div key={metric.label}>
                  <div className="flex items-center justify-between text-[0.72rem]">
                    <span className="text-muted-foreground">{metric.label}</span>
                    <span className="font-display text-sm">
                      {a.toLocaleString()} · {b.toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full"
                      style={{
                        width: `${((a + 1) / (a + b + 2)) * 100}%`,
                        background: READER_COLORS[0],
                      }}
                    />
                    <div className="h-full flex-1" style={{ background: READER_COLORS[1] }} />
                  </div>
                  <p className="mt-1 text-[0.65rem] text-muted-foreground">
                    {leader
                      ? `${leader} leads by ${Math.abs(a - b).toLocaleString()} ${metric.unit}`
                      : "Perfectly level — keep going."}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="mt-5 flex items-start gap-2 rounded-md border border-gold/30 bg-gold/8 px-3 py-2.5">
            <Trophy className="mt-0.5 size-3.5 shrink-0 text-gold" />
            <p className="text-[0.7rem] leading-relaxed text-muted-foreground">
              Nobody loses here: every page either of you reads belongs to the same
              household total.
            </p>
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <SectionHeading
            eyebrow="Six months"
            title="Monthly reading activity"
            description="Pages per reader, month by month."
          />
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData} margin={{ left: -22, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 5" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey={names[0] ?? "Reader one"}
                  stroke={READER_COLORS[0]}
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey={names[1] ?? "Reader two"}
                  stroke={READER_COLORS[1]}
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel>
          <SectionHeading
            eyebrow="Habits"
            title="Books finished each month"
            description="Small bars, real books."
          />
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bookMonthData} margin={{ left: -28, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 5" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                />
                <Tooltip
                  cursor={{ fill: "rgba(117,128,95,0.08)" }}
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                />
                <Bar
                  dataKey={names[0] ?? "Reader one"}
                  stackId="books"
                  fill={READER_COLORS[0]}
                  radius={[0, 0, 0, 0]}
                  maxBarSize={26}
                />
                <Bar
                  dataKey={names[1] ?? "Reader two"}
                  stackId="books"
                  fill={READER_COLORS[1]}
                  radius={[2, 2, 0, 0]}
                  maxBarSize={26}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
        <Panel>
          <SectionHeading eyebrow="What you read" title="Genre distribution" />
          {data.genres.length ? (
            <div className="mt-2 flex items-center gap-2">
              <div className="h-52 w-1/2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.genres}
                      dataKey="count"
                      nameKey="genre"
                      innerRadius={38}
                      outerRadius={68}
                      paddingAngle={2}
                      stroke="var(--card)"
                    >
                      {data.genres.map((entry, index) => (
                        <Cell
                          key={entry.genre}
                          fill={GENRE_COLORS[index % GENRE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: 6,
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="flex-1 space-y-2 text-[0.7rem]">
                {data.genres.map((entry, index) => (
                  <li key={entry.genre} className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ background: GENRE_COLORS[index % GENRE_COLORS.length] }}
                      />
                      <span className="truncate">{entry.genre}</span>
                    </span>
                    <span className="font-display text-sm">{entry.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-4 text-[0.8rem] text-muted-foreground">
              Finish a book with a genre and this chart will fill in.
            </p>
          )}
        </Panel>

        <Panel>
          <SectionHeading
            eyebrow="Shared"
            title="Reading together"
            description="The parts of the story that belong to both of you."
          />
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Books together", value: data.shared.booksReadTogether },
              { label: "Pages together", value: data.shared.pagesReadTogether.toLocaleString() },
              { label: "Shared days", value: data.shared.sharedReadingDays },
              { label: "Shared streak", value: data.shared.sharedCurrentStreak },
            ].map((tile) => (
              <div key={tile.label} className="rounded-md border border-border/70 bg-background/50 px-3 py-2.5">
                <p className="text-[0.58rem] tracking-[0.12em] text-muted-foreground uppercase">
                  {tile.label}
                </p>
                <p className="font-display mt-1 text-xl leading-none">{tile.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-5">
            <p className="label-caps">Reading streak history</p>
            <div className="mt-2 flex gap-[3px]">
              {Array.from({ length: 8 }).map((_, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-[3px]">
                  {data.streakHistory
                    .slice(weekIndex * 7, weekIndex * 7 + 7)
                    .map((day) => (
                      <span
                        key={day.dayKey}
                        title={`${day.dayKey} — ${data.readers
                          .filter((_, index) => day.readers[index])
                          .map((reader) => reader.displayName)
                          .join(" & ") || "no reading"}`}
                        className={cn(
                          "size-3 rounded-[1px]",
                          day.shared
                            ? "bg-forest"
                            : day.readers.some(Boolean)
                              ? "bg-olive/65"
                              : "bg-secondary",
                        )}
                      />
                    ))}
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-4 text-[0.62rem] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <span className="size-2 bg-forest" /> both readers
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="size-2 bg-olive/65" /> one reader
              </span>
              <span>last 8 weeks</span>
            </div>
          </div>
        </Panel>
      </section>

      <section>
        <SectionHeading
          eyebrow="Milestones"
          title="Streaks worth marking"
          description="Earned by genuine reading days only. Personal bests are kept even when a streak breaks."
        />
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {data.readers.map((reader, index) => (
            <div key={reader.userId} className="paper-card rounded-lg p-5">
              <p className="font-display text-lg">{reader.displayName}</p>
              <p className="text-[0.7rem] text-muted-foreground">
                Personal best {reader.bestStreak} days
              </p>
              <div className="mt-4 grid grid-cols-5 gap-2">
                {reader.milestones.map((milestone) => (
                  <div
                    key={milestone.days}
                    className={cn(
                      "rounded-md border px-1 py-2 text-center",
                      milestone.achieved
                        ? index === 0
                          ? "border-forest/40 bg-olive/12 text-forest"
                          : "border-terracotta/40 bg-terracotta/10 text-terracotta"
                        : "border-border bg-background text-muted-foreground",
                    )}
                  >
                    <p className="font-display text-base leading-none">{milestone.days}</p>
                    <p className="mt-1 text-[0.52rem] tracking-[0.1em] uppercase">
                      {milestone.achieved ? "earned" : "days"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="paper-card mt-4 flex flex-wrap items-center justify-between gap-4 rounded-lg px-5 py-4">
          <div>
            <p className="label-caps">Shared achievement</p>
            <p className="font-display mt-1 text-lg">
              {data.shared.sharedBestStreak} shared days in a row at your best
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.shared.milestones.map((milestone) => (
              <span
                key={milestone.days}
                className={cn(
                  "rounded-full border px-3 py-1 text-[0.65rem]",
                  milestone.achieved
                    ? "border-gold/50 bg-gold/12 text-forest"
                    : "border-border text-muted-foreground",
                )}
              >
                {milestone.days} days {milestone.achieved ? "✦" : ""}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Household books completed",
            value: data.shared.totalBooksCompleted,
          },
          {
            label: "Household pages",
            value: data.shared.totalPagesRead.toLocaleString(),
          },
          {
            label: "Household reading time",
            value: formatMinutes(data.shared.totalMinutesRead),
          },
          {
            label: "Digital documents",
            value: data.shared.digitalDocuments,
          },
        ].map((tile) => (
          <div key={tile.label} className="paper-card rounded-lg px-4 py-4">
            <p className="label-caps">{tile.label}</p>
            <p className="font-display mt-2 text-[1.8rem] leading-none">{tile.value}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
