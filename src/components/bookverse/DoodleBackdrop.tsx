import { useLocation } from "react-router";
import type { ReactNode } from "react";

type DoodleVariant =
  | "home"
  | "shelf"
  | "discover"
  | "library"
  | "wishlist"
  | "stats"
  | "profiles"
  | "auth";

function variantForPath(pathname: string): DoodleVariant {
  if (pathname.startsWith("/shelf") || pathname.startsWith("/book/")) return "shelf";
  if (pathname.startsWith("/discover")) return "discover";
  if (pathname.startsWith("/library")) return "library";
  if (pathname.startsWith("/wishlist")) return "wishlist";
  if (pathname.startsWith("/stats")) return "stats";
  if (pathname.startsWith("/profiles")) return "profiles";
  if (pathname.startsWith("/auth") || pathname === "/") return "auth";
  return "home";
}

/* ── Hand-drawn scenes ─────────────────────────────────────────────── */

function CoupleOnSofa() {
  return (
    <svg viewBox="0 0 330 215" className="h-auto w-full" aria-hidden>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      >
        <path d="M34 132c-7 0-12 6-12 13v36h286v-36c0-7-5-13-12-13" />
        <path d="M29 181v17M301 181v17" />
        <path d="M58 132v-25c0-9 7-16 16-16h182c9 0 16 7 16 16v25" />
        <path d="M58 132h214M51 150h228" />
        <path d="M43 143v39M287 143v39" />
        <circle cx="120" cy="87" r="15" />
        <path d="M101 130c0-15 8-26 19-26s19 11 19 26" />
        <path d="M112 104c3 5 13 6 17 0" />
        <circle cx="207" cy="85" r="15" />
        <path d="M188 129c0-15 8-25 19-25s19 10 19 25" />
        <path d="M199 102c3 5 12 6 16 0" />
        <path d="M143 115c7-5 13-7 20-8 7 1 13 3 20 8-7 6-13 8-20 8-7 0-13-2-20-8Z" />
        <path d="M163 107v16" />
        <path d="M136 96c-3-2-6-1-7 2M190 95c3-2 6-1 7 2" />
        <path d="M89 72c0-4 3-7 7-7M235 62c2-4 7-5 10-2" opacity="0.55" />
        <path d="M259 94c.6 3 1.6 4 4.5 4.6-2.9.6-3.9 1.6-4.5 4.6-.6-3-1.6-4-4.5-4.6 2.9-.6 3.9-1.6 4.5-4.6Z" />
        <path d="M80 53c.5 2.4 1.3 3.2 3.7 3.7-2.4.5-3.2 1.3-3.7 3.7-.5-2.4-1.3-3.2-3.7-3.7 2.4-.5 3.2-1.3 3.7-3.7Z" />
      </g>
    </svg>
  );
}

function CoupleUnderTree() {
  return (
    <svg viewBox="0 0 300 290" className="h-auto w-full" aria-hidden>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      >
        <path d="M143 238c2-38 5-76 3-108M156 238c-2-41-1-79 3-108" />
        <path d="M148 177c-13-7-22-17-28-30M153 158c13-5 23-13 30-24M146 203c-12-2-23-7-31-16" />
        <path d="M65 104c-18-8-24-31-11-45-4-24 18-43 39-34 6-22 37-30 53-13 13-16 39-12 46 7 21-6 39 9 38 29 19 7 21 32 5 42 8 19-7 39-27 40-6 18-28 25-44 15-10 14-31 16-43 4-13 13-34 8-41-7-13 2-23-4-26-15-14 0-24-11-23-23Z" />
        <path d="M100 96c9-8 16-12 25-12M162 74c9-2 17 0 24 5M196 109c3 9 1 17-5 24" opacity="0.55" />
        <circle cx="107" cy="205" r="12" />
        <path d="M91 238c0-16 7-25 16-25s16 9 16 25" />
        <circle cx="184" cy="203" r="12" />
        <path d="M168 238c0-16 7-25 16-25s16 9 16 25" />
        <path d="M122 228c7-5 13-6 20-6s13 1 20 6c-7 5-13 6-20 6s-13-1-20-6Z" />
        <path d="M142 222v13" />
        <path d="M236 178c.6 3 1.6 4 4.5 4.6-2.9.6-3.9 1.6-4.5 4.6-.6-3-1.6-4-4.5-4.6 2.9-.6 3.9-1.6 4.5-4.6Z" />
        <path d="M61 176c.5 2.4 1.3 3.2 3.7 3.7-2.4.5-3.2 1.3-3.7 3.7-.5-2.4-1.3-3.2-3.7-3.7 2.4-.5 3.2-1.3 3.7-3.7Z" />
        <path d="M39 245c18-6 38-8 57-5M214 248c18-3 34-1 50 5" opacity="0.4" />
      </g>
    </svg>
  );
}

function OpenBookStars() {
  return (
    <svg viewBox="0 0 250 170" className="h-auto w-full" aria-hidden>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      >
        <path d="M36 102c16-8 36-11 55-8 10 1 17 5 22 9v45c-6-4-13-8-23-9-19-3-38 0-54 8V102Z" />
        <path d="M214 102c-16-8-36-11-55-8-10 1-17 5-22 9v45c6-4 13-8 23-9 19-3 38 0 54 8V102Z" />
        <path d="M113 103v45M92 99c8 0 14 2 21 5M158 99c-8 0-14 2-21 5" opacity="0.6" />
        <path d="M125 43c.7 3.6 1.9 4.8 5.5 5.5-3.6.7-4.8 1.9-5.5 5.5-.7-3.6-1.9-4.8-5.5-5.5 3.6-.7 4.8-1.9 5.5-5.5Z" />
        <path d="M170 24c1 5 2.7 6.7 7.7 7.7-5 1-6.7 2.7-7.7 7.7-1-5-2.7-6.7-7.7-7.7 5-1 6.7-2.7 7.7-7.7Z" />
        <path d="M72 32c.8 4 2.2 5.4 6.2 6.2-4 .8-5.4 2.2-6.2 6.2-.8-4-2.2-5.4-6.2-6.2 4-.8 5.4-2.2 6.2-6.2Z" />
        <path d="M54 62c.5 2.4 1.3 3.2 3.7 3.7-2.4.5-3.2 1.3-3.7 3.7-.5-2.4-1.3-3.2-3.7-3.7 2.4-.5 3.2-1.3 3.7-3.7ZM201 67c.5 2.4 1.3 3.2 3.7 3.7-2.4.5-3.2 1.3-3.7 3.7-.5-2.4-1.3-3.2-3.7-3.7 2.4-.5 3.2-1.3 3.7-3.7Z" opacity="0.7" />
      </g>
    </svg>
  );
}

function HandsHoldingBook() {
  return (
    <svg viewBox="0 0 280 180" className="h-auto w-full" aria-hidden>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      >
        <path d="M43 94c14-7 32-10 50-8 8 1 15 4 20 9v45c-7-4-15-8-25-9-16-2-32 1-45 8V94Z" />
        <path d="M237 94c-14-7-32-10-50-8-8 1-15 4-20 9v45c7-4 15-8 25-9 16-2 32 1 45 8V94Z" />
        <path d="M113 96v44M91 92c8 0 15 2 22 5M167 92c-8 0-15 2-22 5" opacity="0.55" />
        <path d="M13 154c8-18 22-31 42-37 9-3 16-2 20 3 4 5 1 12-7 16l-20 9c9-1 18-3 26-6 8-3 14 0 13 6-1 5-7 8-14 10-20 6-39 5-60-1Z" />
        <path d="M267 154c-8-18-22-31-42-37-9-3-16-2-20 3-4 5-1 12 7 16l20 9c-9-1-18-3-26-6-8-3-14 0-13 6 1 5 7 8 14 10 20 6 39 5 60-1Z" />
        <path d="M138 34c.7 3.6 1.9 4.8 5.5 5.5-3.6.7-4.8 1.9-5.5 5.5-.7-3.6-1.9-4.8-5.5-5.5 3.6-.7 4.8-1.9 5.5-5.5Z" />
        <path d="M78 46c.5 2.4 1.3 3.2 3.7 3.7-2.4.5-3.2 1.3-3.7 3.7-.5-2.4-1.3-3.2-3.7-3.7 2.4-.5 3.2-1.3 3.7-3.7ZM204 44c.5 2.4 1.3 3.2 3.7 3.7-2.4.5-3.2 1.3-3.7 3.7-.5-2.4-1.3-3.2-3.7-3.7 2.4-.5 3.2-1.3 3.7-3.7Z" opacity="0.65" />
      </g>
    </svg>
  );
}

function BookStackFlowers() {
  return (
    <svg viewBox="0 0 190 210" className="h-auto w-full" aria-hidden>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      >
        <path d="M31 163h127v13H31zM39 151h116v12H39zM24 177h141v13H24zM45 139h98v12H45z" />
        <path d="M39 151v12M155 151v10M31 163v13M158 163v13M45 139v12M143 139v11" opacity="0.5" />
        <path d="M59 140c3-23 4-45 1-68M96 139c2-28 2-54-4-79M127 139c1-18 0-36-5-52" />
        <path d="M60 107c-8-2-14-8-17-16 8-2 16 2 21 9M97 93c7-5 11-12 11-21-9 1-15 7-17 16M121 117c-7-1-12-5-15-12 7-1 13 2 17 8" />
        <path d="M60 72c-5-5-6-12-2-18 7-4 14 0 16 7 1 7-6 13-14 11Z" />
        <path d="M92 60c0-7 5-12 12-12s12 5 12 12-5 12-12 12-12-5-12-12Z" />
        <path d="M122 87c3-6 9-9 15-6 6 3 8 10 4 15-4 6-12 6-17 1" />
        <path d="M60 72c1 6 3 9 7 11M104 60h.1M132 86h.1" />
        <path d="M155 74c.6 3 1.6 4 4.5 4.6-2.9.6-3.9 1.6-4.5 4.6-.6-3-1.6-4-4.5-4.6 2.9-.6 3.9-1.6 4.5-4.6Z" opacity="0.7" />
      </g>
    </svg>
  );
}

function CoffeeAndBook() {
  return (
    <svg viewBox="0 0 230 160" className="h-auto w-full" aria-hidden>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      >
        <path d="M81 116c10-6 23-8 34-5 6 1 10 3 14 6v21c-4-3-9-5-15-6-11-2-23 0-33 5v-21Z" />
        <path d="M152 116c-10-6-23-8-34-5-6 1-10 3-14 6v21c4-3 9-5 15-6 11-2 23 0 33 5v-21Z" />
        <path d="M129 112v23M81 122c10-3 20-3 29 0M177 122c-10-3-20-3-29 0" opacity="0.55" />
        <path d="M36 85h42v24c0 8-7 14-15 14H51c-8 0-15-6-15-14V85Z" />
        <path d="M78 91h6c8 0 13 5 13 12s-5 12-13 12h-7" />
        <path d="M39 127h44" />
        <path d="M34 139h62" opacity="0.5" />
        <path d="M49 74c-4-6 4-9 0-15M61 73c-4-7 4-10 0-17M73 75c-3-5 3-8 0-13" opacity="0.6" />
        <path d="M191 48c.6 3 1.6 4 4.5 4.6-2.9.6-3.9 1.6-4.5 4.6-.6-3-1.6-4-4.5-4.6 2.9-.6 3.9-1.6 4.5-4.6Z" />
        <path d="M199 94c3-3 8-3 11 1 3 4 2 9-2 12-4 2-8 1-10-2-2-3-2-7 1-11Z" opacity="0.7" />
      </g>
    </svg>
  );
}

function WindowReader() {
  return (
    <svg viewBox="0 0 260 290" className="h-auto w-full" aria-hidden>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      >
        <path d="M27 26h196v172H27z" />
        <path d="M125 26v172M27 108h196" />
        <path d="M40 38h74v58H40zM137 38h73v58h-73z" opacity="0.5" />
        <path d="M54 178c-4-19 5-38 20-42 15-4 30 8 32 27M220 178c3-12 0-25-7-34M46 180h174" opacity="0.7" />
        <path d="M68 212h116v9H68zM61 229h130v10H61z" />
        <path d="M149 212c6-9 16-14 27-12 11 2 18 10 20 20M156 211c10-4 20-2 28 4" opacity="0.55" />
        <path d="M112 156c3-28 8-48 17-48s14 20 17 48" opacity="0.55" />
        <path d="M83 150c0-13 8-23 18-23s18 10 18 23v28H83v-28Z" />
        <path d="M128 150c0-13 8-23 18-23s18 10 18 23v28h-36v-28Z" />
        <circle cx="101" cy="113" r="12" />
        <circle cx="146" cy="113" r="12" />
        <path d="M108 142c6-4 11-6 18-7 7 1 12 3 18 7v20c-6-4-11-6-18-7-7 1-12 3-18 7v-20Z" />
        <path d="M126 136v22" />
        <path d="M178 204c8-18 9-39 3-60M181 176c-7-4-11-12-10-21 8 1 13 8 13 17M180 158c7-2 12-8 13-16-8 0-14 5-16 13" />
        <path d="M171 205h23M175 205l-3 19h25l-3-19" />
        <path d="M34 52c.5 2.4 1.3 3.2 3.7 3.7-2.4.5-3.2 1.3-3.7 3.7-.5-2.4-1.3-3.2-3.7-3.7 2.4-.5 3.2-1.3 3.7-3.7Z" opacity="0.7" />
      </g>
    </svg>
  );
}

function TinyBookshelf() {
  return (
    <svg viewBox="0 0 230 250" className="h-auto w-full" aria-hidden>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      >
        <path d="M27 34h176v184H27zM31 117h168M31 197h168" />
        <path d="M36 52v57M53 43v66M68 50v59M77 58v51M95 46v63M109 55v54M128 42v67M145 52v57M160 47v62M176 55v54M192 49v60" opacity="0.8" />
        <path d="M36 72h19M36 84h19M77 72h18M77 84h18M95 70h14M145 70h15M160 66h16M176 74h16" opacity="0.5" />
        <path d="M43 141v48M61 134v55M79 146v43M91 139v50M108 132v57M122 145v44M140 137v52M157 143v46M173 135v54" opacity="0.8" />
        <path d="M60 226c4-19 5-37 2-55M103 226c-2-18 0-35 4-52M162 226c1-22 2-40-2-58" opacity="0.55" />
        <path d="M62 193c-7-2-12-7-14-14 7-2 14 1 18 7M107 194c6-4 9-11 9-18-7 1-12 6-14 13M160 190c-6-2-10-7-11-13 6-1 11 2 14 7" />
        <path d="M198 152c5-13 6-27 2-41M200 131c-5-3-8-8-7-14 6 0 10 5 10 11M199 119c5-2 8-6 9-12-6 0-10 3-12 8" />
        <path d="M193 153h16M196 153l-2 14h16l-2-14" />
      </g>
    </svg>
  );
}

function TwoLamps() {
  return (
    <svg viewBox="0 0 330 220" className="h-auto w-full" aria-hidden>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      >
        <path d="M61 51h58l19 39H42l19-39Z" />
        <path d="M90 90v89M66 194c0-8 10-14 24-14s24 6 24 14" />
        <path d="M269 51h-58l-19 39h96l-19-39Z" />
        <path d="M240 90v89M216 194c0-8 10-14 24-14s24 6 24 14" />
        <path d="M42 91c22 12 34 29 37 52M288 91c-22 12-34 29-37 52" opacity="0.45" />
        <path d="M116 164c11-6 24-9 38-8 8 1 14 3 19 7v20c-5-4-11-6-19-7-14-2-27 1-38 7v-19Z" />
        <path d="M214 164c-11-6-24-9-38-8-8 1-14 3-19 7v20c5-4 11-6 19-7 14-2 27 1 38 7v-19Z" />
        <path d="M163 159v24M116 170c11-3 23-3 33 0M214 170c-11-3-23-3-33 0" opacity="0.5" />
        <path d="M165 40c.8 4 2.2 5.4 6.2 6.2-4 .8-5.4 2.2-6.2 6.2-.8-4-2.2-5.4-6.2-6.2 4-.8 5.4-2.2 6.2-6.2Z" />
        <path d="M188 106c.5 2.4 1.3 3.2 3.7 3.7-2.4.5-3.2 1.3-3.7 3.7-.5-2.4-1.3-3.2-3.7-3.7 2.4-.5 3.2-1.3 3.7-3.7ZM132 112c.5 2.4 1.3 3.2 3.7 3.7-2.4.5-3.2 1.3-3.7 3.7-.5-2.4-1.3-3.2-3.7-3.7 2.4-.5 3.2-1.3 3.7-3.7Z" opacity="0.6" />
      </g>
    </svg>
  );
}

function WingedBook() {
  return (
    <svg viewBox="0 0 290 190" className="h-auto w-full" aria-hidden>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      >
        <path d="M84 105c16-8 33-11 50-9 8 1 14 3 19 7v35c-5-4-11-6-19-7-17-2-34 1-50 8v-34Z" />
        <path d="M206 105c-16-8-33-11-50-9-8 1-14 3-19 7v35c5-4 11-6 19-7 17-2 34 1 50 8v-34Z" />
        <path d="M145 98v40" opacity="0.55" />
        <path d="M82 100C64 82 49 63 52 45c17-2 39 14 58 39M73 88c-9-14-20-27-29-37M86 98c-7-8-15-16-24-22" />
        <path d="M208 100c18-18 33-37 30-55-17-2-39 14-58 39M217 88c9-14 20-27 29-37M204 98c7-8 15-16 24-22" />
        <path d="M145 41c.9 4.5 2.5 6.1 7 7-4.5.9-6.1 2.5-7 7-.9-4.5-2.5-6.1-7-7 4.5-.9 6.1-2.5 7-7Z" />
        <path d="M110 42c.5 2.4 1.3 3.2 3.7 3.7-2.4.5-3.2 1.3-3.7 3.7-.5-2.4-1.3-3.2-3.7-3.7 2.4-.5 3.2-1.3 3.7-3.7ZM181 34c.5 2.4 1.3 3.2 3.7 3.7-2.4.5-3.2 1.3-3.7 3.7-.5-2.4-1.3-3.2-3.7-3.7 2.4-.5 3.2-1.3 3.7-3.7Z" opacity="0.7" />
        <path d="M30 147c12-3 24-2 35 4M229 150c10-4 21-4 31 0" opacity="0.45" />
      </g>
    </svg>
  );
}

function FloatingPages() {
  return (
    <svg viewBox="0 0 220 220" className="h-auto w-full" aria-hidden>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      >
        <path d="M42 71c19-5 37-2 49 9v74c-12-11-30-14-49-9V71Z" transform="rotate(-11 66 112)" />
        <path d="M111 46c22-3 40 6 48 20v81c-8-14-26-23-48-20V46Z" transform="rotate(8 135 96)" />
        <path d="M59 100l19 3M59 111l19 3M59 122l19 3M124 80l22 6M124 92l22 6M124 104l22 6" opacity="0.5" />
        <path d="M184 141c.7 3.6 1.9 4.8 5.5 5.5-3.6.7-4.8 1.9-5.5 5.5-.7-3.6-1.9-4.8-5.5-5.5 3.6-.7 4.8-1.9 5.5-5.5Z" />
        <path d="M56 38c.5 2.4 1.3 3.2 3.7 3.7-2.4.5-3.2 1.3-3.7 3.7-.5-2.4-1.3-3.2-3.7-3.7 2.4-.5 3.2-1.3 3.7-3.7Z" opacity="0.7" />
        <path d="M171 55c3-3 8-2 10 1 2 4 1 8-3 10-4 2-8 0-9-3-1-3 0-6 2-8Z" opacity="0.65" />
      </g>
    </svg>
  );
}

function ReadingCalendar() {
  return (
    <svg viewBox="0 0 240 210" className="h-auto w-full" aria-hidden>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      >
        <path d="M31 48h164v136H31zM31 75h164" />
        <path d="M62 48V33M164 48V33M62 33h-5v15h10V33M164 33h-5v15h10V33" opacity="0.7" />
        <path d="M53 99h20M84 99h20M115 99h20M146 99h20M53 130h20M84 130h20M115 130h20M146 130h20M53 161h20M84 161h20M115 161h20" opacity="0.55" />
        <path d="M88 94l5 5 9-10M150 156l5 5 9-10" />
        <path d="M200 22c.6 3 1.6 4 4.5 4.6-2.9.6-3.9 1.6-4.5 4.6-.6-3-1.6-4-4.5-4.6 2.9-.6 3.9-1.6 4.5-4.6Z" />
        <path d="M205 93c5-2 9 0 10 4 1 4-2 8-6 8-4 1-7-2-7-6" opacity="0.6" />
        <path d="M179 187c-2-14 2-27 11-37M182 174c-7-3-11-9-11-17 7 0 12 5 14 12M184 160c6-3 9-9 9-16-7 0-12 4-14 11" opacity="0.55" />
      </g>
    </svg>
  );
}

function PlantedBooks() {
  return (
    <svg viewBox="0 0 220 220" className="h-auto w-full" aria-hidden>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      >
        <path d="M48 164h124v12H48zM39 178h144v13H39zM61 150h92v12H61z" />
        <path d="M48 164v12M172 164v12M39 178v13M183 178v13" opacity="0.5" />
        <path d="M101 150c3-18 3-35-1-52M139 150c1-15 0-29-4-43M78 150c-2-13-5-25-11-36" />
        <path d="M100 120c-8-2-13-8-15-16 7-1 14 3 18 10M100 133c8-4 12-10 13-19-8 0-14 4-17 12M137 126c-7-1-12-6-14-13 7-1 13 2 17 8" />
        <path d="M77 137c6-5 8-12 6-19-7 1-11 7-11 14M154 143c4-9 3-18-3-26M154 143c8-4 13-11 13-21" />
        <path d="M91 108c-4-4-4-10 0-14 5-4 11-3 14 2 3 5 0 11-5 13" opacity="0.75" />
        <path d="M161 119c.6 3 1.6 4 4.5 4.6-2.9.6-3.9 1.6-4.5 4.6-.6-3-1.6-4-4.5-4.6 2.9-.6 3.9-1.6 4.5-4.6Z" opacity="0.7" />
      </g>
    </svg>
  );
}

function MagnifiedBook() {
  return (
    <svg viewBox="0 0 250 210" className="h-auto w-full" aria-hidden>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      >
        <path d="M32 131c17-9 38-12 58-8 10 2 18 6 23 11v39c-6-5-14-9-24-11-20-3-40 0-57 8v-39Z" />
        <path d="M191 131c-17-9-38-12-58-8-10 2-18 6-23 11v39c6-5 14-9 24-11 20-3 40 0 57 8v-39Z" />
        <path d="M113 135v38M89 128c9 1 16 3 24 7M157 128c-9 1-16 3-24 7" opacity="0.5" />
        <circle cx="179" cy="57" r="34" />
        <circle cx="179" cy="57" r="26" opacity="0.45" />
        <path d="M203 82l24 29M187 45c5 3 8 8 9 14" />
        <path d="M171 61c6-3 14-3 21 0M171 69c7-2 15-2 21 1" opacity="0.55" />
        <path d="M51 59c.6 3 1.6 4 4.5 4.6-2.9.6-3.9 1.6-4.5 4.6-.6-3-1.6-4-4.5-4.6 2.9-.6 3.9-1.6 4.5-4.6Z" />
        <path d="M95 37c.5 2.4 1.3 3.2 3.7 3.7-2.4.5-3.2 1.3-3.7 3.7-.5-2.4-1.3-3.2-3.7-3.7 2.4-.5 3.2-1.3 3.7-3.7Z" opacity="0.65" />
      </g>
    </svg>
  );
}

function FloatingHeart() {
  return (
    <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden>
      <path
        d="M20 32c-7-5-12-9-12-15 0-4 3-7 7-7 3 0 5 2 5 4 0-2 2-4 5-4 4 0 7 3 7 7 0 6-5 10-12 15Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TinySparkle() {
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden>
      <path
        d="M12 2c.8 5.7 3.5 8.4 9.2 9.2-5.7.8-8.4 3.5-9.2 9.2-.8-5.7-3.5-8.4-9.2-9.2C8.5 10.4 11.2 7.7 12 2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ── Scattered layouts ─────────────────────────────────────────────── */

type Placement = {
  scene: ReactNode;
  className: string;
  mobile?: boolean;
};

const shared = {
  sofa: {
    scene: <CoupleOnSofa />,
    className: "bottom-[3%] left-[-8%] w-[21rem] text-forest md:left-[-5%] md:w-[30rem]",
  },
  tree: { scene: <CoupleUnderTree />, className: "top-[4%] right-[2%] w-[19rem] text-ink" },
  openBook: { scene: <OpenBookStars />, className: "top-[12%] left-[4%] w-[16rem] text-terracotta" },
  hands: { scene: <HandsHoldingBook />, className: "bottom-[8%] right-[5%] w-[17rem] text-olive" },
  stack: { scene: <BookStackFlowers />, className: "bottom-[4%] right-[3%] w-[12rem] text-terracotta" },
  coffee: { scene: <CoffeeAndBook />, className: "bottom-[12%] left-[3%] w-[14rem] text-olive" },
  window: { scene: <WindowReader />, className: "top-[6%] right-[-2%] w-[20rem] text-forest" },
  shelf: { scene: <TinyBookshelf />, className: "top-[20%] left-[-1%] w-[15rem] text-olive" },
  lamps: { scene: <TwoLamps />, className: "top-[5%] left-[10%] w-[22rem] text-gold" },
  wing: { scene: <WingedBook />, className: "top-[18%] right-[4%] w-[20rem] text-terracotta" },
  pages: { scene: <FloatingPages />, className: "bottom-[7%] left-[5%] w-[14rem] text-olive" },
  calendar: { scene: <ReadingCalendar />, className: "top-[10%] right-[3%] w-[16rem] text-forest" },
  plants: { scene: <PlantedBooks />, className: "bottom-[5%] right-[4%] w-[14rem] text-olive" },
  magnifier: { scene: <MagnifiedBook />, className: "top-[11%] left-[3%] w-[18rem] text-ink" },
} satisfies Record<string, Placement>;

const heart = (className: string): Placement => ({
  scene: <FloatingHeart />,
  className,
  mobile: true,
});
const sparkle = (className: string): Placement => ({
  scene: <TinySparkle />,
  className,
  mobile: true,
});

const LAYOUTS: Record<DoodleVariant, Placement[]> = {
  home: [
    { ...shared.sofa, mobile: true },
    shared.openBook,
    shared.tree,
    shared.coffee,
    heart("top-[28%] left-[43%] w-6 text-terracotta"),
    sparkle("top-[42%] right-[22%] w-5 text-gold"),
    sparkle("bottom-[24%] left-[30%] w-4 text-gold"),
  ],
  shelf: [
    { ...shared.shelf, mobile: true },
    shared.stack,
    shared.openBook,
    { ...shared.hands, mobile: true },
    sparkle("top-[38%] right-[17%] w-5 text-gold"),
    heart("bottom-[32%] left-[14%] w-5 text-terracotta"),
  ],
  discover: [
    { ...shared.magnifier, mobile: true },
    shared.wing,
    shared.pages,
    shared.openBook,
    sparkle("top-[44%] right-[13%] w-5 text-gold"),
    heart("bottom-[16%] right-[22%] w-4 text-terracotta"),
  ],
  library: [
    { ...shared.lamps, mobile: true },
    shared.coffee,
    shared.window,
    { ...shared.pages, mobile: true },
    sparkle("top-[38%] right-[8%] w-5 text-gold"),
  ],
  wishlist: [
    { ...shared.wing, mobile: true },
    shared.stack,
    shared.hands,
    heart("top-[24%] left-[18%] w-7 text-terracotta"),
    heart("bottom-[18%] right-[25%] w-5 text-terracotta"),
    sparkle("top-[52%] right-[12%] w-4 text-gold"),
  ],
  stats: [
    { ...shared.calendar, mobile: true },
    shared.stack,
    shared.openBook,
    { ...shared.pages, mobile: true },
    sparkle("top-[38%] left-[28%] w-4 text-gold"),
    sparkle("bottom-[28%] right-[18%] w-5 text-gold"),
  ],
  profiles: [
    { ...shared.sofa, mobile: true },
    shared.plants,
    shared.hands,
    heart("top-[24%] right-[26%] w-6 text-terracotta"),
    sparkle("bottom-[24%] left-[31%] w-4 text-gold"),
  ],
  auth: [
    { ...shared.sofa, mobile: true },
    shared.stack,
    shared.wing,
    shared.openBook,
    shared.coffee,
    heart("top-[22%] right-[18%] w-6 text-terracotta"),
    sparkle("bottom-[30%] left-[32%] w-4 text-gold"),
  ],
};

export function SiteDoodles() {
  const { pathname } = useLocation();
  if (pathname.startsWith("/read/")) return null;

  const variant = variantForPath(pathname);
  const placements = LAYOUTS[variant];

  return (
    <div aria-hidden className="doodle-field">
      {placements.map((placement, index) => (
        <div
          key={`${variant}-${index}`}
          className={`doodle-scene ${placement.className} ${
            placement.mobile ? "" : "hidden md:block"
          }`}
        >
          {placement.scene}
        </div>
      ))}
    </div>
  );
}
