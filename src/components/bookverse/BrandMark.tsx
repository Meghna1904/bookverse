import { cn } from "@/lib/utils";

export function BrandMark({
  className,
  markClassName,
}: {
  className?: string;
  markClassName?: string;
}) {
  return (
    <span
      className={cn(
        "brand-mark relative inline-flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#203018]/60 bg-[#34462f] text-[#f7f0df] shadow-[0_2px_0_rgba(75,55,31,0.16),0_7px_14px_-9px_rgba(35,27,16,0.7)]",
        className,
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-[3px] rounded-full border border-[#d8b875]/25"
      />
      <svg
        viewBox="0 0 48 48"
        className={cn("relative z-10 size-8", markClassName)}
        aria-hidden
      >
        <path
          d="M11.6 38.8V21.4C11.6 14.5 17.2 9 24 9s12.4 5.5 12.4 12.4v17.4"
          fill="none"
          stroke="#e4d2ac"
          strokeWidth="1.25"
          strokeLinecap="round"
          opacity="0.92"
        />
        <path
          d="M15.4 38.8V21.7c0-4.8 3.7-8.7 8.6-8.7s8.6 3.9 8.6 8.7v17.1"
          fill="none"
          stroke="#e4d2ac"
          strokeWidth="0.7"
          strokeLinecap="round"
          opacity="0.22"
        />

        <path
          d="M24 14.7c.45 2.55 1.6 3.7 4.15 4.15C25.6 19.3 24.45 20.45 24 23c-.45-2.55-1.6-3.7-4.15-4.15C22.4 18.4 23.55 17.25 24 14.7Z"
          fill="#d8b875"
        />

        <path
          d="M24 31.5c-2.7-1.75-5.9-1.85-8.65-.15v4.8c2.75-1.45 5.9-1.35 8.65.4 2.75-1.75 5.9-1.85 8.65-.4v-4.8c-2.75-1.7-5.95-1.6-8.65.15Z"
          fill="#f8f0dd"
        />
        <path
          d="M24 31.5v5.05"
          stroke="#34462f"
          strokeWidth="0.9"
          strokeLinecap="round"
        />

        <path
          d="M10.2 39.55h27.6"
          stroke="#d8b875"
          strokeWidth="1.15"
          strokeLinecap="round"
          opacity="0.85"
        />
        <circle cx="24" cy="39.55" r="1" fill="#d8b875" opacity="0.8" />
      </svg>
    </span>
  );
}
