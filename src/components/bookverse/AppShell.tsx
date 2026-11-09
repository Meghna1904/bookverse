import { api } from "@/lib/data-api";
import { lockRoom } from "@/lib/room-access";
import { cn } from "@/lib/utils";
import { useQueryState } from "@/lib/data-hooks";
import { supabase } from "@/lib/supabase";
import {
  ChartNoAxesCombined,
  BookOpen,
  ChevronDown,
  Heart,
  House,
  Images,
  Library,
  LockKeyhole,
  Search,
  UserRound,
} from "lucide-react";
import { useEffect } from "react";
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from "react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar } from "./primitives";
import { BrandMark } from "./BrandMark";
import { ThemeToggle } from "./ThemeToggle";

const NAV = [
  { to: "/home", label: "Home", icon: House },
  { to: "/shelf", label: "Our Shelf", icon: BookOpen },
  { to: "/library", label: "Library", icon: Library },
  { to: "/wishlist", label: "Wishlist", icon: Heart },
  { to: "/memories", label: "Our Memories", icon: Images },
  { to: "/discover", label: "Discover", icon: Search, iconOnly: true },
  { to: "/stats", label: "Our Stats", icon: ChartNoAxesCombined, iconOnly: true },
  { to: "/profiles", label: "Profiles", icon: UserRound },
];

export function AppShell() {
  const { data, error } = useQueryState(api.households.bootstrap);
  const navigate = useNavigate();
  const location = useLocation();
  const onMemories = location.pathname.startsWith("/memories");

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [location.pathname]);

  const signedInWithHousehold =
    data && "hasHousehold" in data && data.hasHousehold ? data : null;

  useEffect(() => {
    if (data && "hasHousehold" in data && !data.hasHousehold) {
      navigate("/welcome", { replace: true });
    }
  }, [data, navigate]);

  const members = signedInWithHousehold?.members ?? [];
  const me = signedInWithHousehold?.me;

  if (!data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <BrandMark />
        {error ? (
          <div className="max-w-xl space-y-2">
            <p className="font-display text-xl">{supabase ? "Finish setting up your library" : "Connect your Supabase project"}</p>
            <p className="text-sm text-muted-foreground">
              {supabase
                ? "Run supabase/schema.sql in your Supabase SQL Editor, then refresh this page."
                : "Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your local .env file and Vercel environment variables."}
            </p>
            <p className="break-words text-xs text-muted-foreground">{error.message}</p>
          </div>
        ) : <p className="font-display text-lg">Opening your reading room…</p>}
      </div>
    );
  }

  if ("hasHousehold" in data && !data.hasHousehold) {
    return <Navigate to="/welcome" replace />;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/95 shadow-[0_6px_24px_-22px_rgba(53,38,20,0.55)] backdrop-blur-md">
        <div className="page-shell flex h-[4.8rem] items-center justify-between gap-4">
          <NavLink to="/home" className="group flex min-w-0 items-center gap-3">
            <BrandMark />
            <span className="min-w-0 leading-none">
              <span className="font-display block truncate text-[1.35rem] tracking-[-0.02em] text-foreground">
                Our BookVerse
              </span>
              <span className="font-display-italic mt-1 hidden truncate text-[0.74rem] text-muted-foreground sm:block">
                Two readers. One universe of stories.
              </span>
            </span>
          </NavLink>

          <nav className="hidden items-stretch gap-0.5 self-stretch xl:flex">
            {NAV.filter((item) => !item.iconOnly).map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  aria-label={item.iconOnly ? item.label : undefined}
                  title={item.iconOnly ? item.label : undefined}
                  className={({ isActive }) =>
                    cn(
                      "relative inline-flex items-center justify-center transition-colors",
                      item.iconOnly
                        ? "w-8"
                        : "gap-1.5 px-2.5 text-[0.8rem] xl:px-3",
                      isActive
                        ? "text-forest"
                        : "text-muted-foreground hover:text-foreground",
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className={cn(item.iconOnly ? "size-[1.08rem]" : "size-[0.95rem]")}
                        strokeWidth={1.7}
                      />
                      {item.iconOnly ? null : (
                        <span className="whitespace-nowrap">{item.label}</span>
                      )}
                      <span
                        className={cn(
                          "absolute bottom-0 h-[2px] rounded-full bg-forest transition-opacity",
                          item.iconOnly ? "inset-x-1.5" : "inset-x-2.5",
                          isActive ? "opacity-100" : "opacity-0",
                        )}
                      />
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-1">
            <Link
              to="/discover"
              aria-label="Search books"
              title="Search books"
              className="inline-flex size-9 items-center justify-center rounded-full border border-border/70 bg-card/60 text-muted-foreground transition hover:border-olive/60 hover:bg-secondary hover:text-foreground"
            >
              <Search className="size-[1.05rem]" strokeWidth={1.7} />
            </Link>
            <ThemeToggle className="hidden sm:inline-flex" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="group ml-1 inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-secondary p-0.5 pr-1.5 transition hover:border-olive/70"
                  aria-label="Open account menu"
                >
                  <Avatar
                    name={me?.displayName ?? "Reader"}
                    src={me?.avatarUrl}
                    tone="olive"
                    className="size-9 border-background bg-forest text-primary-foreground"
                  />
                  <ChevronDown className="size-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel>
                  <span className="font-display block text-base">
                    {me?.displayName ?? "Reader"}
                  </span>
                  <span className="text-[0.68rem] text-muted-foreground">
                    {signedInWithHousehold?.household.name ?? "Our BookVerse"}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => navigate("/profiles")}>
                  Profiles & privacy
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate("/memories")}>
                  Our memories
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate("/stats")}>
                  <ChartNoAxesCombined className="mr-2 size-3.5" />
                  Our Stats
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => {
                    lockRoom();
                    navigate("/login", { replace: true });
                  }}
                >
                  <LockKeyhole className="mr-2 size-3.5" />
                  Lock reading room
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="border-t border-border/70 xl:hidden">
          <nav className="no-scrollbar page-shell flex gap-1 overflow-x-auto py-2">
            {NAV.filter((item) => !item.iconOnly).map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  aria-label={item.iconOnly ? item.label : undefined}
                  title={item.iconOnly ? item.label : undefined}
                  className={({ isActive }) =>
                    cn(
                      "inline-flex shrink-0 items-center gap-1.5 rounded-full border py-1.5 text-[0.71rem] whitespace-nowrap transition",
                      item.iconOnly ? "w-8 justify-center px-0" : "px-3",
                      isActive
                        ? "border-forest/30 bg-forest text-primary-foreground"
                        : "border-transparent text-muted-foreground",
                    )
                  }
                >
                  <Icon className="size-3.5" strokeWidth={1.8} />
                  {item.iconOnly ? null : item.label}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </header>

      <main className={cn("flex-1", !onMemories && "py-8 sm:py-10")}>
        {onMemories ? (
          <div className="fade-up">
            <Outlet />
          </div>
        ) : (
          <div className="page-shell fade-up">
            <Outlet />
          </div>
        )}
      </main>

      {!onMemories ? (
        <footer className="border-t border-border/60 py-5">
          <div className="page-shell flex flex-wrap items-center justify-between gap-2 text-[0.7rem] text-muted-foreground">
            <span className="font-display text-sm">
              Our BookVerse — two readers, one universe of stories.
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="ornament text-[0.6rem]">✦ ✦ ✦</span>
              Shared with anyone who has this link
            </span>
          </div>
        </footer>
      ) : null}
    </div>
  );
}
