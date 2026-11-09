import { cn } from "@/lib/utils";
import { coverPalette, initials, spinePalette } from "@/lib/bookverse";
import type { Id } from "@/convex/_generated/dataModel";
import { Check, Star } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

export type Reader = {
  userId: Id<"users">;
  displayName: string;
  isSample?: boolean;
  avatarUrl?: string | null;
};

export function BookCover({
  title,
  author,
  coverUrl,
  className,
  imgClassName,
}: {
  title: string;
  author?: string;
  coverUrl?: string | null;
  className?: string;
  imgClassName?: string;
}) {
  const [failed, setFailed] = useState(!coverUrl);
  useEffect(() => setFailed(!coverUrl), [coverUrl]);
  const palette = coverPalette(title);

  return (
    <div
      className={cn(
        "cover-shell relative aspect-[2/3] w-full rounded-[3px]",
        className,
      )}
      style={{
        background: `linear-gradient(150deg, ${palette.from} 0%, ${palette.to} 100%)`,
      }}
    >
      {!failed && coverUrl ? (
        <img
          src={coverUrl}
          alt={`Cover of ${title}`}
          loading="lazy"
          className={cn("h-full w-full object-cover", imgClassName)}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-full flex-col justify-between p-3 text-left">
          <span
            className="text-[0.55rem] tracking-[0.22em] uppercase opacity-70"
            style={{ color: palette.ink }}
          >
            Our BookVerse
          </span>
          <div>
            <p
              className="font-display text-[1.05rem] leading-tight"
              style={{ color: palette.ink }}
            >
              {title}
            </p>
            <div
              className="my-2 h-px w-8 opacity-40"
              style={{ backgroundColor: palette.ink }}
            />
            <p
              className="text-[0.58rem] tracking-[0.14em] uppercase opacity-80"
              style={{ color: palette.ink }}
            >
              {author || "Unknown author"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function inkForSpine(color: string) {
  const value = color.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(value)) return "#f7efdf";
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
  return luminance > 0.56 ? "#2f281f" : "#f7efdf";
}

export function BookSpine({
  title,
  author,
  spineColor,
  className,
  style,
  onClick,
}: {
  title: string;
  author?: string;
  spineColor?: string | null;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}) {
  const palette = spinePalette(`${title}${author ?? ""}`);
  const ink = spineColor ? inkForSpine(spineColor) : palette.ink;
  const background = spineColor ?? palette.bg;
  let hash = 0;
  for (let index = 0; index < title.length; index += 1) {
    hash = (hash * 31 + title.charCodeAt(index)) % 9973;
  }
  const goldFoil = hash % 3 === 0;
  const foil = goldFoil ? "#c9ab6d" : ink;
  const titleSize =
    title.length > 38 ? "0.52rem" : title.length > 30 ? "0.58rem" : title.length > 22 ? "0.64rem" : "0.7rem";

  return (
    <button
      type="button"
      onClick={onClick}
      title={author ? `${title} — ${author}` : title}
      aria-label={`Open ${title}${author ? ` by ${author}` : ""}`}
      className={cn(
        "spine group flex h-full flex-col items-center justify-between px-1 py-2.5",
        className,
      )}
      style={{ backgroundColor: background, color: ink, ...style }}
    >
      <span className="pointer-events-none relative z-10 flex flex-col items-center gap-[3px] opacity-80">
        <span className="h-px w-4" style={{ backgroundColor: foil }} />
        <span
          className="size-[3px] rotate-45"
          style={{ backgroundColor: foil, opacity: 0.9 }}
        />
        <span className="h-px w-4" style={{ backgroundColor: foil, opacity: 0.7 }} />
      </span>

      <span
        className="spine-text relative z-10 max-h-full overflow-hidden leading-none font-medium tracking-[0.02em]"
        style={{ fontSize: titleSize }}
      >
        {title}
      </span>

      {author ? (
        <span
          className="spine-author relative z-10 hidden max-h-[22%] overflow-hidden leading-none tracking-[0.14em] uppercase opacity-65 sm:block"
          style={{ fontSize: "0.4rem" }}
        >
          {author}
        </span>
      ) : (
        <span aria-hidden className="h-3" />
      )}

      <span className="pointer-events-none relative z-10 flex flex-col items-center gap-[2px] opacity-70">
        <span className="h-px w-3" style={{ backgroundColor: foil }} />
        <span className="h-px w-4" style={{ backgroundColor: foil, opacity: 0.6 }} />
      </span>
    </button>
  );
}

export function Stars({
  value,
  onChange,
  size = 16,
  className,
}: {
  value?: number | null;
  onChange?: (value: number) => void;
  size?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = (value ?? 0) >= star;
        if (!onChange) {
          return (
            <Star
              key={star}
              className={cn(
                "shrink-0",
                filled ? "fill-gold text-gold" : "text-border",
              )}
              style={{ width: size, height: size }}
            />
          );
        }
        return (
          <button
            key={star}
            type="button"
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
            onClick={() => onChange(star)}
            className="rounded-sm p-0.5 transition hover:scale-110"
          >
            <Star
              className={cn(
                filled ? "fill-gold text-gold" : "text-border hover:text-gold/60",
              )}
              style={{ width: size, height: size }}
            />
          </button>
        );
      })}
    </div>
  );
}

export function Avatar({
  name,
  src,
  className,
  tone = "olive",
}: {
  name: string;
  src?: string | null;
  className?: string;
  tone?: "olive" | "terracotta";
}) {
  return (
    <span
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border text-[0.68rem] font-medium tracking-wide",
        tone === "olive"
          ? "border-forest/25 bg-olive/20 text-forest"
          : "border-terracotta/30 bg-terracotta/15 text-terracotta",
        className,
      )}
    >
      {src ? (
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  );
}

export function ReaderPicker({
  readers,
  value,
  onChange,
  disabled,
}: {
  readers: Reader[];
  value: Id<"users">[];
  onChange: (ids: Id<"users">[]) => void;
  disabled?: boolean;
}) {
  const toggle = (id: Id<"users">) => {
    if (value.includes(id)) {
      onChange(value.filter((entry) => entry !== id));
    } else {
      onChange([...value, id]);
    }
  };
  return (
    <div className="flex flex-wrap gap-2">
      {readers.map((reader) => {
        const selected = value.includes(reader.userId);
        return (
          <button
            key={reader.userId}
            type="button"
            disabled={disabled}
            onClick={() => toggle(reader.userId)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition",
              selected
                ? "border-forest bg-forest text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:border-forest/40 hover:text-foreground",
            )}
          >
            {selected ? <Check className="size-3" /> : null}
            {reader.displayName}
          </button>
        );
      })}
      <span className="self-center text-[0.65rem] tracking-[0.14em] text-muted-foreground/80 uppercase">
        {value.length === 2 ? "Together" : value.length === 1 ? "Individual" : "Choose a reader"}
      </span>
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-3", className)}>
      <div className="max-w-2xl">
        {eyebrow ? <p className="label-caps mb-2">{eyebrow}</p> : null}
        <h2 className="font-display text-2xl leading-tight text-foreground sm:text-[1.7rem]">
          {title}
        </h2>
        {description ? (
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "paper-panel flex flex-col items-center justify-center rounded-lg px-6 py-14 text-center",
        className,
      )}
    >
      <div className="mb-4 flex size-11 items-center justify-center rounded-full border border-border/70 bg-card text-olive">
        {icon ?? <span className="font-display text-lg">✦</span>}
      </div>
      <h3 className="font-display text-xl">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("paper-card rounded-lg px-4 py-4", className)}>
      <p className="label-caps">{label}</p>
      <p className="font-display mt-1.5 text-[1.75rem] leading-none">{value}</p>
      {hint ? (
        <p className="mt-1.5 text-[0.7rem] leading-snug text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="relative flex flex-wrap items-end justify-between gap-5 border-b border-border/55 pb-6">
      <div className="max-w-3xl">
        <p className="label-caps flex items-center gap-2">
          <span aria-hidden className="text-[0.7rem] text-gold">
            ✦
          </span>
          {eyebrow}
          <span aria-hidden className="h-px w-9 bg-gradient-to-r from-gold/60 to-transparent" />
        </p>
        <h1 className="font-display mt-2 text-[2.1rem] leading-[1.05] tracking-[-0.025em] sm:text-[2.7rem]">
          {title}
        </h1>
        {description ? (
          <p className="font-display-italic mt-2.5 max-w-xl text-[1.02rem] leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action}
      <svg
        viewBox="0 0 90 60"
        aria-hidden
        className="pointer-events-none absolute right-0 -bottom-1 hidden h-12 w-20 text-olive/30 sm:block"
      >
        <g fill="none" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round">
          <path d="M4 54C27 50 49 39 68 20 76 12 82 7 88 5" />
          <path d="M45 39c-6-7-7-14-3-21M57 29c5-6 12-8 20-7M38 46c11-1 20 3 26 11" />
        </g>
        {[
          [33, 40, -42],
          [49, 25, -50],
          [67, 26, 20],
          [57, 46, 22],
        ].map(([x, y, rotate], index) => (
          <ellipse
            key={index}
            cx={x}
            cy={y}
            rx="6"
            ry="2.5"
            fill="currentColor"
            opacity="0.45"
            transform={`rotate(${rotate} ${x} ${y})`}
          />
        ))}
      </svg>
    </header>
  );
}
