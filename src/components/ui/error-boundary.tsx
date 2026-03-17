import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex flex-col items-center justify-center p-4 text-center h-full min-h-[200px] bg-muted/10 border border-border/50">
          <h3 className="text-lg font-semibold text-destructive mb-2">Something went wrong</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-[300px]">
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <Button 
            variant="outline" 
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
