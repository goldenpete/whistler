import React, { Component, type ReactNode, type ErrorInfo } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Global Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-screen bg-background items-center justify-center p-8">
            <div className="flex flex-col md:flex-row w-full max-w-5xl gap-8 md:gap-12 items-center justify-center">
                {/* Left Side: Message */}
                <div className="flex flex-col items-center md:items-start text-center md:text-left justify-center text-red-400 gap-4 flex-1">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">Something went wrong</h1>
                        <span className="text-lg text-white/50">The application encountered a critical error.</span>
                    </div>
                    
                    <Button 
                        variant="outline" 
                        onClick={() => window.location.reload()}
                        className="mt-2"
                    >
                        Reload Application
                    </Button>
                </div>

                {/* Right Side: Console Output */}
                <div className="flex-1 h-[400px] w-full bg-zinc-950/50 rounded-lg border border-red-900/20 p-4 font-mono text-xs text-zinc-400 overflow-auto shadow-inner">
                    <div className="text-red-400 font-bold mb-2">
                        {this.state.error?.toString()}
                    </div>
                    <div className="whitespace-pre-wrap opacity-70">
                        {this.state.errorInfo?.componentStack || this.state.error?.stack || "No stack trace available"}
                    </div>
                </div>
            </div>
        </div>
      );
    }

    return this.props.children;
  }
}
