import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/** Catches render/runtime errors so a crash shows a message, not a blank screen. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface in console for debugging.
    // eslint-disable-next-line no-console
    console.error("Community Hero crashed:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="text-4xl">⚠️</div>
          <h1 className="text-lg font-bold text-white">Something went wrong</h1>
          <pre className="max-w-full overflow-auto rounded-xl bg-black/40 p-3 text-left text-[11px] text-red-300">
            {this.state.error.message}
          </pre>
          <button
            onClick={() => {
              this.setState({ error: null });
              window.location.href = "/login";
            }}
            className="rounded-2xl bg-teal px-5 py-3 text-sm font-bold text-midnight"
          >
            Back to login
          </button>
          <button
            onClick={() => window.location.reload()}
            className="text-xs text-gray-400 underline"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
