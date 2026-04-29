import { useEffect, useState } from 'react';

function defaultFindEntity(entities, entityId) {
    return entities.find(item => item.id === entityId);
}

export default function useLocalEntityModalForm({
    createEmptyForm,
    entities = [],
    entityId,
    findEntity = defaultFindEntity,
    isAdmin,
    isOpen,
    mapEntityToForm,
    mode,
    notFoundMessage,
    onClose,
    resetAsyncStatus,
    setErrorMessage
}) {
    const [form, setForm] = useState(() => createEmptyForm(entities));
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setForm(createEmptyForm(entities));
            setIsSaving(false);
            resetAsyncStatus();
            return;
        }

        if (!isAdmin) {
            onClose();
            return;
        }

        if (mode === 'edit' && entityId) {
            const entity = findEntity(entities, entityId);
            if (!entity) {
                setErrorMessage(notFoundMessage);
                return;
            }
            setForm(mapEntityToForm(entity));
            resetAsyncStatus();
            return;
        }

        setForm(createEmptyForm(entities));
        resetAsyncStatus();
    }, [
        createEmptyForm,
        entities,
        entityId,
        findEntity,
        isAdmin,
        isOpen,
        mapEntityToForm,
        mode,
        notFoundMessage,
        onClose,
        resetAsyncStatus,
        setErrorMessage
    ]);

    return {
        form,
        isSaving,
        setForm,
        setIsSaving
    };
}
