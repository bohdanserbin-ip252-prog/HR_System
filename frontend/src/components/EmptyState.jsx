export default function EmptyState({ icon, title, description }) {
    return (
        <div className="empty-state">
            <span className="material-symbols-outlined">{icon}</span>
            <h3>{title}</h3>
            <p>{description}</p>
        </div>
    );
}
