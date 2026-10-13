import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AppPageErrorBoundaryProps {
  children: ReactNode;
}

interface AppPageErrorBoundaryState {
  error: Error | null;
}

/**
 * Keep a render failure inside the main content area rather than allowing
 * one broken lazy-loaded page to blank the entire application shell.
 * AppShell keys this boundary by the current route so navigation resets it.
 */
export class AppPageErrorBoundary extends Component<
  AppPageErrorBoundaryProps,
  AppPageErrorBoundaryState
> {
  state: AppPageErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppPageErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[Kaira Africa] Page rendering failed", error.message, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <section
          role="alert"
          className="mx-auto flex min-h-[50vh] w-full max-w-xl flex-col items-center justify-center px-4 py-10 text-center"
        >
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h1 className="font-display text-xl font-bold text-foreground">
            This page could not be displayed
          </h1>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            Your workspace is still available. Reload this page to try again, or choose another section from the navigation.
          </p>
          <Button className="mt-5 gap-2" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4" />
            Reload page
          </Button>
        </section>
      );
    }

    return this.props.children;
  }
}
