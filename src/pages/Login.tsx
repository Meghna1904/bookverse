import { BrandMark } from "@/components/bookverse/BrandMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { READER_IDS } from "@/lib/db-types";
import { setReaderId, useReaderId } from "@/lib/reader-store";
import { unlockRoom, useRoomUnlocked } from "@/lib/room-access";
import { cn } from "@/lib/utils";
import { ArrowRight, KeyRound } from "lucide-react";
import { FormEvent, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";

const READERS = [
  { id: READER_IDS.whiskeyy, name: "Whiskeyy" },
  { id: READER_IDS.matildaa, name: "Matildaa" },
];

export default function Login() {
  const unlocked = useRoomUnlocked();
  const readerId = useReaderId();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;

  if (unlocked) return <Navigate to="/home" replace />;

  const enterRoom = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!unlockRoom(pin)) {
      setError("That PIN doesn’t match. Try again.");
      setPin("");
      return;
    }
    setError("");
    navigate(from && from !== "/login" ? from : "/home", { replace: true });
  };

  return (
    <main className="relative z-10 flex min-h-svh items-center justify-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-md">
        <header className="mb-8 text-center">
          <BrandMark className="mx-auto size-16" markClassName="size-10" />
          <p className="label-caps mt-5">A shared reading room</p>
          <h1 className="font-display mt-2 text-4xl leading-tight sm:text-5xl">
            Our BookVerse
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            A warm little corner for Whiskeyy + Matildaa.
          </p>
        </header>

        <form
          onSubmit={enterRoom}
          className="paper-card space-y-5 rounded-2xl border border-border/80 bg-card/90 p-5 sm:p-7"
        >
          <div>
            <Label className="label-caps">Who is walking in?</Label>
            <div className="mt-2 grid grid-cols-2 rounded-full border border-border bg-secondary/70 p-1">
              {READERS.map((reader) => (
                <button
                  key={reader.id}
                  type="button"
                  aria-pressed={readerId === reader.id}
                  onClick={() => setReaderId(reader.id)}
                  className={cn(
                    "h-10 rounded-full px-3 text-sm transition-colors",
                    readerId === reader.id
                      ? "bg-forest text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {reader.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="room-pin" className="label-caps">Common PIN</Label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="room-pin"
                type="password"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={4}
                value={pin}
                onChange={(event) => {
                  setPin(event.target.value.replace(/\D/g, "").slice(0, 4));
                  setError("");
                }}
                placeholder="Enter 4-digit PIN"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "pin-error" : "pin-hint"}
                className="h-12 rounded-full pl-11 text-base tracking-[0.35em]"
              />
            </div>
            {error ? (
              <p id="pin-error" role="alert" className="text-sm text-destructive">{error}</p>
            ) : (
              <p id="pin-hint" className="text-xs text-muted-foreground">
                One shared PIN for both readers.
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={pin.length !== 4}
            className="h-12 w-full rounded-full bg-forest text-base text-primary-foreground hover:bg-forest/90"
          >
            Open the room <ArrowRight className="size-4" />
          </Button>
        </form>

        <footer className="mt-6 text-center text-xs text-muted-foreground">
          Made for Whiskeyy + Matildaa, with love.
        </footer>
        <p className="mx-auto mt-5 max-w-sm text-center text-[0.68rem] leading-relaxed text-muted-foreground/75">
          This PIN is a convenience lock for this browser. It does not restrict direct access to the Supabase data.
        </p>
      </div>
    </main>
  );
}
