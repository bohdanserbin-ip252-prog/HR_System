export default function SkeletonTable({ rows = 5 }) {
    return (
        <div className="skeleton-table" aria-busy="true" aria-label="Завантаження таблиці">
            <div className="skeleton-row skeleton-header-row">
                <div className="skeleton-cell" style={{ width: '40%' }} />
                <div className="skeleton-cell" style={{ width: '25%' }} />
                <div className="skeleton-cell" style={{ width: '20%' }} />
                <div className="skeleton-cell" style={{ width: '15%' }} />
            </div>
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="skeleton-row">
                    <div className="skeleton-cell" style={{ width: '40%' }} />
                    <div className="skeleton-cell" style={{ width: '25%' }} />
                    <div className="skeleton-cell" style={{ width: '20%' }} />
                    <div className="skeleton-cell" style={{ width: '15%' }} />
                </div>
            ))}
        </div>
    );
}
