// A friendly "nothing here" card. Give it a title, a line of text and (optionally) buttons as children.
//   <EmptyState title="No anime matches “moon”" text="Or loosen a filter."><button className="btn">Clear filters</button></EmptyState>
import "../states.css";

export default function EmptyState({ title, text, children }) {
  return (
    <div className="state-card glass fade-in">
      <h2 className="t-h3 state-title">{title}</h2>
      {text && <p className="state-text">{text}</p>}
      {children && <div className="state-actions">{children}</div>}
    </div>
  );
}
