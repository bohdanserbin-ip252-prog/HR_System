import { useAppActions } from '../appContext.jsx';

export default function MoveButtons({ type, id, index, total }) {
    const { moveRecord } = useAppActions();
    const disableUp = index === 0;
    const disableDown = index === total - 1;

    return (
        <>
            <button
                className="btn-icon"
                disabled={disableUp}
                aria-disabled={disableUp}
                style={disableUp ? { opacity: 0.4, cursor: 'default' } : undefined}
                onClick={() => moveRecord(type, id, 'up')}
                title="Перемістити вгору"
                type="button"
            >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>expand_less</span>
            </button>
            <button
                className="btn-icon"
                disabled={disableDown}
                aria-disabled={disableDown}
                style={disableDown ? { opacity: 0.4, cursor: 'default' } : undefined}
                onClick={() => moveRecord(type, id, 'down')}
                title="Перемістити вниз"
                type="button"
            >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>expand_more</span>
            </button>
        </>
    );
}
