export default function PlatformCard({ icon, title, meta, children, tone = '' }) {
  return (
    <article className={`platform-card ${tone}`}>
      <div className="platform-card__head">
        <span className="material-symbols-outlined" aria-hidden="true">{icon}</span>
        <div>
          <h3>{title}</h3>
          <p>{meta}</p>
        </div>
      </div>
      {children ? <div className="platform-card__body">{children}</div> : null}
    </article>
  );
}
