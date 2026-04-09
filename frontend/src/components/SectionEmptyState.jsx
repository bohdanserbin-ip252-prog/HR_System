import EmptyState from './EmptyState.jsx';

export default function SectionEmptyState({
    hasContent,
    icon,
    title,
    description,
    children = null
}) {
    if (!hasContent) {
        return (
            <EmptyState
                icon={icon}
                title={title}
                description={description}
            />
        );
    }

    return children ?? null;
}
