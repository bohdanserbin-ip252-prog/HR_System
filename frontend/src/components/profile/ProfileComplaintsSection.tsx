const STATUS_LABELS = {
  open: 'Відкрита',
  in_review: 'В роботі',
  resolved: 'Вирішена',
  rejected: 'Відхилена'
};

export default function ProfileComplaintsSection({ complaints = [] }) {
  const activeCount = complaints.filter(item => ['open', 'in_review'].includes(item.status)).length;

  return (
    <section className="profile-section">
      <div className="profile-section-head">
        <h2 className="profile-section-title">
          <span className="material-symbols-outlined">report</span>
          Скарги та звернення
        </h2>
        <span className="badge badge-active">{activeCount} активних</span>
      </div>
      <div className="profile-complaints">
        {complaints.length > 0 ? complaints.map(complaint => (
          <article className="profile-complaint" key={complaint.id}>
            <div>
              <strong>{complaint.title}</strong>
              <span>{STATUS_LABELS[complaint.status] || complaint.status} · {complaint.complaintDate}</span>
            </div>
            <p>{complaint.description}</p>
          </article>
        )) : <p className="muted-text">Для працівника немає зареєстрованих скарг.</p>}
      </div>
    </section>
  );
}
