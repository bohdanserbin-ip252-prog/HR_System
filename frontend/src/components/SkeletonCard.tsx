export default function SkeletonCard() {
    return (
        <div className="skeleton-card" aria-busy="true" aria-label="Завантаження">
            <div className="skeleton-header">
                <div className="skeleton-circle" />
                <div className="skeleton-lines">
                    <div className="skeleton-line short" />
                    <div className="skeleton-line" />
                </div>
            </div>
            <div className="skeleton-body">
                <div className="skeleton-line" />
                <div className="skeleton-line medium" />
                <div className="skeleton-line short" />
            </div>
        </div>
    );
}
