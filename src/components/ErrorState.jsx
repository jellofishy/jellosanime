// Friendly "something went wrong" message that can retry. Two looks:
//   <ErrorState onRetry={...} />                      -> a full glass card (for whole pages)
//   <ErrorState variant="strip" what="Trending" onRetry={...} />  -> a thin strip (for one row)
// onRetry must re-run the request that failed.
import { Link } from "react-router-dom";
import "../states.css";

export default function ErrorState({ variant = "card", what, onRetry }) {
  if (variant === "strip") {
    return (
      <div className="state-strip glass" role="alert">
        <p>{what ? `${what} couldn't load.` : "This couldn't load."}</p>
        {onRetry && <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}>Retry</button>}
      </div>
    );
  }
  return (
    <div className="state-card glass fade-in" role="alert">
      <h2 className="t-h3 state-title">Couldn't load right now, try again</h2>
      <p className="state-text">Our anime data source didn't answer in time. Your list and filters are safe.</p>
      <div className="state-actions">
        {onRetry && <button type="button" className="btn btn-primary" onClick={onRetry}>Try again</button>}
        <Link to="/" className="btn btn-secondary">Go home</Link>
      </div>
    </div>
  );
}
