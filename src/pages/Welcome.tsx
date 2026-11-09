import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/bookverse/ThemeToggle";
import { errorMessage } from "@/lib/bookverse";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { BookOpen, Loader2, Lock, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";

export default function Welcome() {
  const data = useQuery(api.households.bootstrap);
  const createHousehold = useMutation(api.households.createHousehold);
  const joinHousehold = useMutation(api.households.joinHousehold);
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<"create" | "join">(
    searchParams.get("code") ? "join" : "create",
  );
  const [libraryName, setLibraryName] = useState("Our BookVerse");
  const [displayName, setDisplayName] = useState("");
  const [code, setCode] = useState((searchParams.get("code") ?? "").toUpperCase());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (data && "hasHousehold" in data && data.hasHousehold) {
      navigate("/home", { replace: true });
    }
  }, [data, navigate]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "create") {
        await createHousehold({
          name: libraryName,
          displayName: displayName || "Reader One",
        });
        toast.success("Your shared library is ready.");
      } else {
        await joinHousehold({ code, displayName: displayName || "Reader Two" });
        toast.success("You have joined the household.");
      }
      navigate("/home");
    } catch (submitError) {
      const message = errorMessage(submitError);
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border/60">
        <div className="page-shell flex h-16 items-center justify-between">
          <span className="font-display text-[1.2rem]">Our BookVerse</span>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              type="button"
              className="text-[0.7rem] text-muted-foreground underline underline-offset-2"
              onClick={async () => {
                await signOut();
                navigate("/");
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="page-shell grid flex-1 items-start gap-12 py-12 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:py-16">
        <div className="max-w-md">
          <p className="label-caps">Household setup</p>
          <h1 className="font-display mt-4 text-[2.8rem] leading-[0.98]">
            Open your shared
            <br />
            reading room.
          </h1>
          <p className="mt-4 text-[0.88rem] leading-relaxed text-muted-foreground">
            Create the household yourself, then give your invitation code to one other
            reader. A household holds exactly two accounts, each with its own shelves,
            private documents and reading history.
          </p>
          <ul className="mt-8 space-y-4 text-[0.8rem]">
            {[
              {
                icon: Users,
                title: "Two readers, two accounts",
                copy: "No shared password. Your reading stays yours; the shelf is shared.",
              },
              {
                icon: BookOpen,
                title: "One record per book",
                copy: "When you both read the same title, it appears once with two reading records.",
              },
              {
                icon: Lock,
                title: "Private PDFs stay private",
                copy: "Documents you keep to yourself are never visible to your partner.",
              },
            ].map((item) => (
              <li key={item.title} className="flex gap-3">
                <item.icon className="mt-0.5 size-4 shrink-0 text-olive" />
                <div>
                  <p className="font-medium text-foreground">{item.title}</p>
                  <p className="mt-0.5 leading-relaxed text-muted-foreground">{item.copy}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="paper-card w-full rounded-lg p-6 sm:p-8">
          <div className="grid grid-cols-2 gap-1 rounded-full border border-border/70 bg-secondary/50 p-1">
            {(["create", "join"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setMode(option)}
                className={cn(
                  "rounded-full px-3 py-2 text-[0.75rem] transition",
                  mode === option
                    ? "bg-card text-forest shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option === "create" ? "Create a household" : "Join with a code"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-6 space-y-5">
            {mode === "create" ? (
              <div className="space-y-2">
                <Label htmlFor="libraryName" className="label-caps">
                  Household name
                </Label>
                <Input
                  id="libraryName"
                  value={libraryName}
                  onChange={(event) => setLibraryName(event.target.value)}
                  placeholder="The Attic Library"
                  maxLength={80}
                  required
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="code" className="label-caps">
                  Invitation code
                </Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(event) => setCode(event.target.value.toUpperCase())}
                  placeholder="ABCD2345"
                  className="font-mono tracking-[0.2em] uppercase"
                  maxLength={12}
                  required
                />
                <p className="text-[0.68rem] text-muted-foreground">
                  Ask the reader who created the household for their eight-character code.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="displayName" className="label-caps">
                Your reader name
              </Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder={mode === "create" ? "Reader One" : "Reader Two"}
                maxLength={60}
              />
              <p className="text-[0.68rem] text-muted-foreground">
                This is how you appear on the shelf, in stats and on profiles.
              </p>
            </div>

            {error ? (
              <p className="rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2 text-[0.75rem] text-destructive">
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              disabled={busy}
              className="h-11 w-full rounded-full bg-forest text-primary-foreground hover:bg-forest/90"
            >
              {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {mode === "create" ? "Create our library" : "Join the household"}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
