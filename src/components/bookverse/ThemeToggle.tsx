import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle({ className }: { className?: string }) {
  const { isDark, toggle } = useTheme();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={toggle}
      aria-pressed={isDark}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "rounded-full border border-border/70 text-muted-foreground transition-colors hover:border-olive/50 hover:bg-olive/10 hover:text-foreground",
        className,
      )}
    >
      {isDark ? (
        <Sun className="size-4" strokeWidth={1.6} />
      ) : (
        <Moon className="size-4" strokeWidth={1.6} />
      )}
    </Button>
  );
}

export function ThemedToaster() {
  const { theme } = useTheme();
  return <Toaster theme={theme} position="top-right" />;
}
