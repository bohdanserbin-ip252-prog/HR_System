export default function ActionHeader({
    containerClassName = '',
    containerStyle,
    title,
    titleLevel = 'h2',
    titleClassName = '',
    titleStyle,
    titleIcon,
    titleIconStyle,
    showAction = false,
    actionLabel = '',
    actionIcon = 'add',
    onAction
}) {
    const TitleTag = titleLevel;

    return (
        <div className={containerClassName || undefined} style={containerStyle}>
            <TitleTag className={titleClassName || undefined} style={titleStyle}>
                {titleIcon ? (
                    <>
                        <span className="material-symbols-outlined" style={titleIconStyle}>{titleIcon}</span>
                        {' '}
                    </>
                ) : null}
                {title}
            </TitleTag>
            {showAction ? (
                <button className="btn btn-secondary" onClick={onAction} type="button">
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{actionIcon}</span>
                    {actionLabel}
                </button>
            ) : null}
        </div>
    );
}
