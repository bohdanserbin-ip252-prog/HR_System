import MoveButtons from '../MoveButtons.tsx';

export default function DevelopmentItemActions({
    isAdmin,
    type,
    id,
    index,
    total,
    onEdit,
    onDelete,
    editTitle,
    deleteTitle,
    style
}) {
    if (!isAdmin) return null;

    return (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '12px', ...style }}>
            <MoveButtons type={type} id={id} index={index} total={total} />
            <button className="btn-icon" onClick={onEdit} title={editTitle} type="button">
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit</span>
            </button>
            <button className="btn-icon" onClick={onDelete} title={deleteTitle} type="button">
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
            </button>
        </div>
    );
}
