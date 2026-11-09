import { api } from "@/convex/_generated/api";
import { HeroReadingScene } from "@/components/bookverse/HeroReadingScene";
import { BrandMark } from "@/components/bookverse/BrandMark";
import { Avatar } from "@/components/bookverse/primitives";
import { ThemeToggle } from "@/components/bookverse/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { useAction, useQuery } from "convex/react";
import {
  ArrowRight,
  Delete,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";

interface AuthProps {
  redirectAfterAuth?: string;
}

const FALLBACK_READERS = [
  { slot: "whiskeyy", displayName: "Whiskeyy", avatarUrl: null },
  { slot: "matildaa", displayName: "Matildaa", avatarUrl: null },
];

function resolveRedirectAfterAuth(returnTo: string | null, fallback = "/home") {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) return returnTo;
  return fallback;
}

function friendlyPinError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (message.includes("PIN_LOCKED") || message.toLowerCase().includes("too many")) {
    return "This reader is resting for a little while. Try again in 15 minutes.";
  }
  if (message.toLowerCase().includes("incorrect") || message.includes("PIN_INCORRECT")) {
    return "That PIN doesn't match this reader. Take a breath and try again.";
  }
  return "The door didn't open. Check the PIN and try again.";
}

function friendlyActionError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return (
    message
      .replace(/^Uncaught ConvexError:\s*/i, "")
      .replace(/^ConvexError:\s*/i, "")
      .replace(/^\[CONVEX[^\]]*\]\s*/i, "")
      .trim() || "That didn't work. Please try again."
  );
}

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading, isAuthenticated, hasConvexSession, signIn, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const room = useQuery(api.pinAuth.room);
  const recoverPin = useAction(api.pinAuth.recoverPin);
  const redirect = resolveRedirectAfterAuth(searchParams.get("returnTo"), redirectAfterAuth);
  const readers = room?.readers?.length ? room.readers : FALLBACK_READERS;

  const [selected, setSelected] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [recoverySlot, setRecoverySlot] = useState<string>("whiskeyy");
  const [recoveryKey, setRecoveryKey] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showRecoveryKey, setShowRecoveryKey] = useState(false);
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoveryDone, setRecoveryDone] = useState(false);

  const selectedReader = useMemo(
    () => readers.find((reader) => reader.slot === selected) ?? null,
    [readers, selected],
  );

  useEffect(() => {
    if (!isLoading && isAuthenticated) navigate(redirect, { replace: true });
  }, [isLoading, isAuthenticated, navigate, redirect]);

  useEffect(() => {
    // A leftover email or guest session is not room access. Clear it quietly.
    if (!isLoading && hasConvexSession && !isAuthenticated) void signOut();
  }, [isLoading, hasConvexSession, isAuthenticated, signOut]);

  const appendDigit = (digit: string) => {
    setError(null);
    setPin((current) => `${current}${digit}`.replace(/\D/g, "").slice(0, 6));
  };

  const chooseReader = (slot: string) => {
    setSelected(slot);
    setPin("");
    setError(null);
    setRecoveryOpen(false);
    setRecoveryDone(false);
  };

  const handleSignIn = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!selected || pin.length !== 6 || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await signIn("pin", { reader: selected, pin });
    } catch (signInError) {
      setError(friendlyPinError(signInError));
      setPin("");
    } finally {
      setSubmitting(false);
    }
  };

  const openRecovery = () => {
    setRecoveryOpen(true);
    setRecoverySlot(selected ?? "whiskeyy");
    setRecoveryError(null);
    setRecoveryDone(false);
    setRecoveryKey("");
    setNewPin("");
    setConfirmPin("");
  };

  const handleRecovery = async (event: React.FormEvent) => {
    event.preventDefault();
    if (recoveryBusy) return;
    if (newPin.length !== 6) {
      setRecoveryError("Choose a new six-digit PIN.");
      return;
    }
    if (newPin !== confirmPin) {
      setRecoveryError("The two new PINs do not match.");
      return;
    }
    setRecoveryBusy(true);
    setRecoveryError(null);
    try {
      await recoverPin({
        slot: recoverySlot,
        recoveryKey,
        newPin,
      });
      setRecoveryDone(true);
      setRecoveryKey("");
      setNewPin("");
      setConfirmPin("");
      setSelected(recoverySlot);
      setPin("");
    } catch (recoveryFailure) {
      setRecoveryError(friendlyActionError(recoveryFailure));
    } finally {
      setRecoveryBusy(false);
    }
  };

  return (
    <div className="room-entrance relative min-h-screen overflow-hidden">
      <RoomDoodles />

      <header className="relative z-20">
        <div className="page-shell flex h-20 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BrandMark className="size-10" markClassName="size-[1.8rem]" />
            <span className="leading-none">
              <span className="font-display block text-[1.22rem] tracking-tight">
                Our BookVerse
              </span>
              <span className="mt-1 block text-[0.52rem] tracking-[0.2em] text-muted-foreground uppercase">
                A private reading room
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 text-[0.66rem] text-muted-foreground sm:inline-flex">
              <LockKeyhole className="size-3.5 text-olive" />
              Two readers. One key each.
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="page-shell relative z-10 grid items-center gap-12 pb-16 pt-6 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16 lg:pb-24 lg:pt-10">
        <section className="mx-auto w-full max-w-[35rem]">
          <p className="room-eyebrow">
            <span aria-hidden>✦</span>
            Your little world of stories
          </p>
          <p className="mt-4 text-[0.58rem] font-medium tracking-[0.28em] text-muted-foreground uppercase">
            A private reading room
          </p>
          <h1 className="font-display mt-3 text-[4.1rem] leading-[0.86] tracking-[-0.055em] sm:text-[5.4rem] lg:text-[5.8rem]">
            Come on{" "}
            <span className="font-display-italic text-terracotta">in.</span>
          </h1>
          <p className="font-display mt-5 max-w-md text-[1.25rem] leading-relaxed text-muted-foreground">
            Who&apos;s entering our little library today?
          </p>
          <p className="mt-3 max-w-md text-[0.78rem] leading-relaxed text-muted-foreground">
            Choose your name and turn your own key. No email, no password — just the
            two of you and the books you keep between these walls.
          </p>

          <div className="room-vignette relative mt-9 overflow-hidden rounded-[1.15rem] border border-[#cbb99b]/70 bg-[#faf2e1]/80 shadow-[0_18px_44px_-34px_rgba(66,44,24,0.55)]">
            <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 py-3 text-[0.52rem] tracking-[0.2em] text-[#7c6b54] uppercase">
              <span>Our reading nook</span>
              <span className="flex items-center gap-1.5">
                <Sparkles className="size-3 text-gold" />
                Just the two of us
              </span>
            </div>
            <div className="h-[19rem] sm:h-[21rem]">
              <HeroReadingScene />
            </div>
            <div className="room-vignette-caption flex flex-wrap items-center justify-between gap-2 border-t border-[#cbb99b]/55 px-5 py-3">
              <p className="font-display-italic text-[0.92rem] text-[#6d5e4c]">
                &ldquo;Your reading room is waiting.&rdquo;
              </p>
              <span className="text-[0.5rem] tracking-[0.17em] text-[#8d7c64] uppercase">
                Est. for two
              </span>
            </div>
          </div>
        </section>

        <section className="relative mx-auto w-full max-w-[30rem]">
          <div className="room-entry-card relative overflow-hidden rounded-[1.35rem] border border-[#cbb99b]/80 bg-[#fbf6e9]/95 p-5 shadow-[0_28px_70px_-44px_rgba(55,37,18,0.65)] sm:p-7">
            <div className="pointer-events-none absolute inset-2 rounded-[1rem] border border-dashed border-[#b8a17d]/40" />
            <div className="relative">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[0.54rem] font-medium tracking-[0.23em] text-[#8a765a] uppercase">
                    The entrance
                  </p>
                  <h2 className="font-display mt-2 text-[2rem] leading-none">
                    Choose your name.
                  </h2>
                </div>
                <span className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-full border border-[#c3ad88]/70 bg-[#f4e8d3] text-[#7d6a4d]">
                  <KeyRound className="size-4" strokeWidth={1.6} />
                </span>
              </div>
              <p className="mt-2 text-[0.74rem] leading-relaxed text-muted-foreground">
                Two doors, two keys. Your PIN stays yours.
              </p>

              <div className="mt-5 grid grid-cols-2 gap-2.5">
                {readers.map((reader, index) => {
                  const active = selected === reader.slot;
                  return (
                    <button
                      key={reader.slot}
                      type="button"
                      onClick={() => chooseReader(reader.slot)}
                      aria-pressed={active}
                      className={cn("room-reader-card text-left", active && "is-selected")}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <Avatar
                          name={reader.displayName}
                          src={reader.avatarUrl}
                          tone={index === 0 ? "olive" : "terracotta"}
                          className={cn(
                            "size-11 border-2 text-[0.8rem]",
                            active ? "border-[#f8efdb]" : "border-[#e5d7bf]",
                          )}
                        />
                        <span
                          className={cn(
                            "flex size-4 items-center justify-center rounded-full border transition",
                            active
                              ? "border-[#43523b] bg-[#43523b] text-[#f8efdb]"
                              : "border-[#bcae95] text-transparent",
                          )}
                        >
                          <span className="text-[0.55rem]">✓</span>
                        </span>
                      </span>
                      <span className="mt-3 block text-[0.48rem] font-medium tracking-[0.18em] text-muted-foreground uppercase">
                        {index === 0 ? "Reader one" : "Reader two"}
                      </span>
                      <span className="font-display mt-0.5 block text-[1.3rem] leading-none">
                        {reader.displayName}
                      </span>
                      <span className="mt-1.5 block text-[0.58rem] text-muted-foreground">
                        {active ? "At the door" : "Tap to choose"}
                      </span>
                    </button>
                  );
                })}
              </div>

              {selectedReader ? (
                <form onSubmit={handleSignIn} className="room-pin-panel mt-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[0.54rem] tracking-[0.18em] text-muted-foreground uppercase">
                        Welcome back
                      </p>
                      <p className="font-display mt-0.5 text-[1.35rem] leading-none">
                        {selectedReader.displayName}.
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#b8c1aa]/70 bg-[#edf0e4] px-2.5 py-1 text-[0.55rem] tracking-[0.1em] text-[#526047] uppercase">
                      <ShieldCheck className="size-3" />
                      Your PIN
                    </span>
                  </div>

                  <div className="mt-4">
                    <Label
                      htmlFor="reader-pin"
                      className="text-[0.54rem] tracking-[0.18em] uppercase"
                    >
                      Six-digit room key
                    </Label>
                    <div className="relative mt-1.5">
                      <Input
                        id="reader-pin"
                        type={showPin ? "text" : "password"}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        autoComplete="off"
                        value={pin}
                        onChange={(event) => {
                          setError(null);
                          setPin(event.target.value.replace(/\D/g, "").slice(0, 6));
                        }}
                        placeholder="••••••"
                        className="h-12 border-[#c8b697] bg-[#fffaf0]/80 pr-11 pl-4 text-center font-mono text-[1.3rem] tracking-[0.5em] shadow-none placeholder:tracking-[0.28em] placeholder:text-[#b8a98f] focus-visible:border-[#718061] focus-visible:ring-[#718061]/20"
                        aria-invalid={Boolean(error)}
                        disabled={submitting}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPin((current) => !current)}
                        aria-label={showPin ? "Hide PIN" : "Show PIN"}
                        className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-full p-1.5 text-muted-foreground transition hover:bg-[#ede2cf] hover:text-foreground"
                      >
                        {showPin ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-1.5">
                    {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
                      <button
                        key={digit}
                        type="button"
                        onClick={() => appendDigit(digit)}
                        disabled={submitting}
                        className="room-key h-9 rounded-md font-display text-[1.05rem]"
                      >
                        {digit}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setPin("");
                        setError(null);
                      }}
                      disabled={submitting}
                      className="room-key h-9 rounded-md text-[0.56rem] font-medium tracking-[0.14em] uppercase"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={() => appendDigit("0")}
                      disabled={submitting}
                      className="room-key h-9 rounded-md font-display text-[1.05rem]"
                    >
                      0
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPin((current) => current.slice(0, -1));
                        setError(null);
                      }}
                      disabled={submitting}
                      aria-label="Delete last digit"
                      className="room-key flex h-9 items-center justify-center rounded-md"
                    >
                      <Delete className="size-4" />
                    </button>
                  </div>

                  {error ? (
                    <p
                      role="alert"
                      className="mt-3 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-[0.68rem] leading-relaxed text-destructive"
                    >
                      {error}
                    </p>
                  ) : null}

                  <Button
                    type="submit"
                    disabled={pin.length !== 6 || submitting}
                    className="mt-3 h-11 w-full gap-2 rounded-full bg-forest text-[0.78rem] text-primary-foreground shadow-none hover:bg-forest/90 disabled:opacity-45"
                  >
                    {submitting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <KeyRound className="size-3.5" />
                    )}
                    Enter Our BookVerse
                    <ArrowRight className="size-3.5 opacity-70" />
                  </Button>
                </form>
              ) : (
                <div className="mt-4 flex min-h-[9.5rem] flex-col items-center justify-center rounded-lg border border-dashed border-[#c8b697]/80 bg-[#f8eedc]/45 px-6 text-center">
                  <span className="flex size-9 items-center justify-center rounded-full border border-[#d2bf9f] bg-[#fbf4e5] text-[#8b7759]">
                    <LockKeyhole className="size-3.5" />
                  </span>
                  <p className="font-display mt-2 text-[1.02rem] text-[#5e503e]">
                    The room is waiting.
                  </p>
                  <p className="mt-1 max-w-[15rem] text-[0.64rem] leading-relaxed text-muted-foreground">
                    Choose Whiskeyy or Matildaa above, then enter your private six-digit
                    PIN.
                  </p>
                </div>
              )}

              <div className="mt-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={openRecovery}
                  className="text-[0.62rem] text-muted-foreground underline decoration-[#b9a88e] underline-offset-4 transition hover:text-terracotta"
                >
                  Forgotten your PIN?
                </button>
                <span className="inline-flex items-center gap-1 text-[0.54rem] tracking-[0.12em] text-muted-foreground uppercase">
                  <LockKeyhole className="size-2.5" />
                  Private by design
                </span>
              </div>

              {recoveryOpen ? (
                <div className="mt-4 rounded-lg border border-[#cbb99b]/80 bg-[#f5ead7]/80 p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-[1.05rem] leading-none">
                        Open the door again.
                      </p>
                      <p className="mt-1 text-[0.62rem] leading-relaxed text-muted-foreground">
                        Owner recovery uses the private room recovery key. Existing PINs
                        are never shown.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRecoveryOpen(false)}
                      className="text-[0.58rem] text-muted-foreground underline underline-offset-2"
                    >
                      Close
                    </button>
                  </div>

                  {recoveryDone ? (
                    <div className="mt-3 rounded-md border border-forest/18 bg-[#edf0e4] px-3 py-2.5 text-[0.68rem] leading-relaxed text-[#4c5c42]">
                      Your new PIN is set. Choose your name and come in.
                    </div>
                  ) : (
                    <form onSubmit={handleRecovery} className="mt-3 space-y-2.5">
                      <div className="grid grid-cols-2 gap-2">
                        {readers.map((reader) => (
                          <button
                            key={reader.slot}
                            type="button"
                            onClick={() => setRecoverySlot(reader.slot)}
                            className={cn(
                              "rounded-md border px-2 py-1.5 text-[0.64rem] transition",
                              recoverySlot === reader.slot
                                ? "border-[#6f7e61] bg-[#e8ecdf] text-[#43523b]"
                                : "border-[#cbb99b]/70 bg-[#fbf4e5]/70 text-muted-foreground",
                            )}
                          >
                            {reader.displayName}
                          </button>
                        ))}
                      </div>
                      <div className="relative">
                        <Input
                          type={showRecoveryKey ? "text" : "password"}
                          value={recoveryKey}
                          onChange={(event) => setRecoveryKey(event.target.value)}
                          placeholder="Room recovery key"
                          autoComplete="off"
                          className="h-9 border-[#c8b697] bg-[#fffaf0]/80 pr-9 text-[0.7rem]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRecoveryKey((current) => !current)}
                          aria-label={showRecoveryKey ? "Hide recovery key" : "Show recovery key"}
                          className="absolute top-1/2 right-2 -translate-y-1/2 p-1 text-muted-foreground"
                        >
                          {showRecoveryKey ? (
                            <EyeOff className="size-3.5" />
                          ) : (
                            <Eye className="size-3.5" />
                          )}
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="password"
                          inputMode="numeric"
                          maxLength={6}
                          value={newPin}
                          onChange={(event) =>
                            setNewPin(event.target.value.replace(/\D/g, "").slice(0, 6))
                          }
                          placeholder="New PIN"
                          className="h-9 border-[#c8b697] bg-[#fffaf0]/80 text-center font-mono text-[0.8rem] tracking-[0.22em]"
                        />
                        <Input
                          type="password"
                          inputMode="numeric"
                          maxLength={6}
                          value={confirmPin}
                          onChange={(event) =>
                            setConfirmPin(event.target.value.replace(/\D/g, "").slice(0, 6))
                          }
                          placeholder="Repeat PIN"
                          className="h-9 border-[#c8b697] bg-[#fffaf0]/80 text-center font-mono text-[0.8rem] tracking-[0.22em]"
                        />
                      </div>
                      {recoveryError ? (
                        <p className="text-[0.64rem] leading-relaxed text-destructive">
                          {recoveryError}
                        </p>
                      ) : null}
                      <Button
                        type="submit"
                        size="sm"
                        disabled={
                          recoveryBusy ||
                          !recoveryKey.trim() ||
                          newPin.length !== 6 ||
                          confirmPin.length !== 6
                        }
                        className="h-9 w-full rounded-full bg-forest text-[0.68rem] text-primary-foreground"
                      >
                        {recoveryBusy ? (
                          <Loader2 className="mr-2 size-3.5 animate-spin" />
                        ) : (
                          <ShieldCheck className="mr-2 size-3.5" />
                        )}
                        Set my new PIN
                      </Button>
                    </form>
                  )}
                </div>
              ) : null}
            </div>
          </div>

          <p className="mt-4 text-center text-[0.62rem] leading-relaxed text-muted-foreground">
            Two readers. One universe of stories.
            <br />
            <span className="text-[0.57rem] opacity-80">
              Each PIN is private and protected by a salted slow hash.
            </span>
          </p>
        </section>
      </main>
    </div>
  );
}

function RoomDoodles() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      <svg
        viewBox="0 0 220 220"
        className="absolute -top-10 -left-16 h-64 w-64 text-olive/25"
      >
        <g fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round">
          <path d="M22 210C48 150 78 102 124 57c18-18 38-30 62-36" />
          <path d="M59 146c-19-4-31-15-37-32M89 110c-12-20-11-38 3-55M114 83c4-24 16-40 36-48M137 67c23 1 39 10 48 28M71 157c8-18 22-28 41-31" />
          <path d="M167 188c1-18 8-32 21-42M178 160c-11-1-19-7-23-17M185 147c9-7 19-8 29-4" />
        </g>
        {[
          [47, 127, -46],
          [76, 92, -65],
          [106, 62, -31],
          [148, 54, 17],
          [166, 80, 45],
          [70, 145, -28],
          [187, 164, -21],
        ].map(([x, y, rotate], index) => (
          <ellipse
            key={index}
            cx={x}
            cy={y}
            rx={11}
            ry={4.2}
            fill="currentColor"
            opacity={0.6}
            transform={`rotate(${rotate} ${x} ${y})`}
          />
        ))}
      </svg>

      <svg
        viewBox="0 0 200 160"
        className="absolute right-[-1.5rem] bottom-16 hidden h-36 w-44 text-terracotta/18 lg:block"
      >
        <g fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round">
          <path d="M20 138c17-24 35-34 58-37 23-3 45 2 65 16M31 132c4-17 13-27 27-32M54 124c-1-15 6-26 20-33M84 118c6-13 16-20 30-21M115 124c12-7 24-6 35 2" />
          <path d="M160 38v24M148 50h24M154 44l12 12M166 44l-12 12" opacity="0.7" />
        </g>
      </svg>

      <svg
        viewBox="0 0 70 90"
        className="absolute top-28 left-[48%] hidden h-20 w-16 text-gold/30 xl:block"
      >
        <path
          d="M35 4c1.8 14 8 20 22 22-14 2-20 8-22 22-2-14-8-20-22-22 14-2 20-8 22-22Z"
          fill="currentColor"
        />
        <path d="M16 58v16M8 66h16" stroke="currentColor" strokeWidth="1" />
      </svg>
    </div>
  );
}

export default function AuthPage(props: AuthProps) {
  return (
    <Suspense>
      <Auth {...props} />
    </Suspense>
  );
}
