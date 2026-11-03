// Catches a crash in any page below it, so visitors see a friendly message instead of a blank screen.
// (React only supports this with a class component.)
import { Component } from "react";
import "../states.css";

export default class ErrorBoundary extends Component {
  state = { failed: false };

  // React calls this when something below crashes.
  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error("Page crashed:", error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="state-card glass" role="alert">
        <h2 className="t-h3 state-title">Something went wrong</h2>
        <p className="state-text">Please try again. Your list and filters are safe.</p>
        <div className="state-actions">
          {/* A normal link (full reload) so the page starts fresh. */}
          <a href="/" className="btn btn-primary">Go back home</a>
        </div>
      </div>
    );
  }
}
