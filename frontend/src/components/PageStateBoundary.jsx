import EmptyState from './EmptyState.jsx';

export default function PageStateBoundary({ loading = null, error = null, empty = null, children = null }) {
    const activeState = loading || error || empty;

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
