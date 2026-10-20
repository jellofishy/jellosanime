// Catches a crash in any page below it, so visitors see a friendly message instead of a blank screen.
// (React only supports this with a class component.)
import { Component } from "react";

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
      <p>
        Something went wrong. {/* A normal link (full reload) so the page starts fresh. */}
        <a href="/" className="link">Go back home</a>
      </p>
    );
  }
}
