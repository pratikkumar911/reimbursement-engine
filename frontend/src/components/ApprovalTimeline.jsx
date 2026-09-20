export default function ApprovalTimeline({ approvals, currentLevel }) {
  if (!approvals?.length) return null;
  return (
    <ul className="timeline">
      {approvals.map((a, i) => (
        <li key={i}>
          <strong>L{a.level} · {a.role}</strong> — {a.approverName || 'Finance Desk'}
          {' · '}
          {a.decision || (i === currentLevel ? <em>awaiting</em> : <em>pending</em>)}
          {a.date && <> on {new Date(a.date).toLocaleString()}</>}
          {a.remarks && <div className="muted">"{a.remarks}"</div>}
        </li>
      ))}
    </ul>
  );
}