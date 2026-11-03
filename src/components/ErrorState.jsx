// Friendly "something went wrong" message that can retry. Two looks:
//   <ErrorState onRetry={...} />                      -> a full card (for whole pages)
//   <ErrorState variant="strip" what="Trending" onRetry={...} />  -> a thin strip (for one row)
// onRetry must re-run the request that failed.
import { Link } from "react-router-dom";
import { TriangleAlert, RotateCw } from "lucide-react";
import "../states.css";

export default function ErrorState({ variant = "card", what, onRetry }) {
  if (variant === "strip") {
    return (
      <div className="state-strip" role="alert">
        <TriangleAlert className="icon state-strip-icon" aria-hidden="true" />
        <p>{what ? `${what} couldn't load.` : "This couldn't load."}</p>
        {onRetry && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}>
            <RotateCw className="icon" aria-hidden="true" /> Retry
          </button>
        )}
      </div>
    );
  }
  return (
    <div className="state-card fade-in" role="alert">
      <TriangleAlert className="state-icon" aria-hidden="true" />
      <h2 className="t-h3 state-title">Couldn't load right now, try again</h2>
      <p className="state-text">Our anime data source didn't answer in time. Your list and filters are safe.</p>
      <div className="state-actions">
        {onRetry && <button type="button" className="btn btn-primary" onClick={onRetry}>Try again</button>}
        <Link to="/" className="btn btn-secondary">Go home</Link>
      </div>
    </div>
  );
}
