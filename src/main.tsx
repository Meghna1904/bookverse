import { ThemedToaster } from "@/components/bookverse/ThemeToggle";
import React, { StrictMode, useEffect, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router";
import { AppShell } from "./components/bookverse/AppShell";
import { SiteDoodles } from "./components/bookverse/DoodleBackdrop";
import "./index.css";

// Lazy load route components for better code splitting
const Home = lazy(() => import("./pages/Home.tsx"));
const Shelf = lazy(() => import("./pages/Shelf.tsx"));
const BookDetail = lazy(() => import("./pages/BookDetail.tsx"));
const Discover = lazy(() => import("./pages/Discover.tsx"));
const Library = lazy(() => import("./pages/Library.tsx"));
const PdfReader = lazy(() => import("./pages/PdfReader.tsx"));
const Wishlist = lazy(() => import("./pages/Wishlist.tsx"));
const Memories = lazy(() => import("./pages/Memories.tsx"));
const Stats = lazy(() => import("./pages/Stats.tsx"));
const Profiles = lazy(() => import("./pages/Profiles.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

// Simple loading fallback for route transitions
function RouteLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  );
}

/** Hard guard so runtime errors never leave the preview as a blank page. */
class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string; stack: string }
> {
  state = { hasError: false, message: "", stack: "" };
  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      message: error.message || "Unknown runtime error",
      stack: error.stack || "",
    };
  }
  componentDidCatch(err: Error) {
    console.error("[Preview] Root crash:", err);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
          <div className="max-w-lg text-center">
            <p className="text-sm font-semibold">Preview runtime error</p>
            <p className="mt-2 text-xs text-muted-foreground break-words">
              {this.state.message}
            </p>
            {this.state.stack && (
              <pre className="mt-3 text-left text-[10px] leading-4 text-muted-foreground/80 max-h-40 overflow-auto rounded border border-border/60 p-2">
                {this.state.stack}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function RouteSyncer() {
  const location = useLocation();
  useEffect(() => {
    window.parent.postMessage(
      { type: "iframe-route-change", path: location.pathname },
      "*",
    );
  }, [location.pathname]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "navigate") {
        if (event.data.direction === "back") window.history.back();
        if (event.data.direction === "forward") window.history.forward();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}


createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RootErrorBoundary>
      <BrowserRouter>
          <RouteSyncer />
          <SiteDoodles />
          <Suspense fallback={<RouteLoading />}>
            <Routes>
              <Route path="/" element={<Navigate to="/home" replace />} />
              <Route path="/auth" element={<Navigate to="/home" replace />} />
              <Route path="/welcome" element={<Navigate to="/home" replace />} />
              <Route path="/read/:documentId" element={<PdfReader />} />
              <Route element={<AppShell />}>
                <Route path="/home" element={<Home />} />
                <Route path="/shelf" element={<Shelf />} />
                <Route path="/book/:bookId" element={<BookDetail />} />
                <Route path="/discover" element={<Discover />} />
                <Route path="/library" element={<Library />} />
                <Route path="/wishlist" element={<Wishlist />} />
                <Route path="/memories" element={<Memories />} />
                <Route path="/stats" element={<Stats />} />
                <Route path="/profiles" element={<Profiles />} />
                <Route path="/dashboard" element={<Navigate to="/home" replace />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
      </BrowserRouter>
        <ThemedToaster />
    </RootErrorBoundary>
  </StrictMode>,
);
