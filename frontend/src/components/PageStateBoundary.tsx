import EmptyState from './EmptyState.tsx';
import SkeletonCard from './SkeletonCard.tsx';
import SkeletonTable from './SkeletonTable.tsx';

function getSkeletonFromPage(pageName) {
    const name = String(pageName || '').toLowerCase();
    const isTablePage = name.includes('employees') || name.includes('departments');
    return isTablePage ? <SkeletonTable /> : <SkeletonCard />;
}

export default function PageStateBoundary({ loading = null, error = null, empty = null, children = null, pageName = '' }) {
    const activeState = loading || error || empty;

    if (loading) {
        return getSkeletonFromPage(pageName);
    }

    if (activeState) {
        return (
            <EmptyState
                icon={activeState.icon}
                title={activeState.title}
                description={activeState.description}
            />
        );
    }

    return children ?? null;
}
