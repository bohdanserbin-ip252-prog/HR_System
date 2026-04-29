import { fetchJSON } from '../../api.ts';

function resolveEndpoint(endpoint, entityId) {
    if (typeof endpoint === 'function') return endpoint(entityId);
    return endpoint;
}

export async function submitEntityMutation({
    afterMutation,
    entityId = null,
    errorMessageFallback = 'Помилка збереження',
    failWithError,
    handleUnauthorized,
    onClose,
    payload,
    setErrorMessage,
    setIsSaving,
    successMessageCreate = 'Створено',
    successMessageUpdate = 'Оновлено',
    updateEndpoint,
    createEndpoint
}) {
    setIsSaving(true);
    setErrorMessage('');

    try {
        const isUpdate = Boolean(entityId);
        const method = isUpdate ? 'PUT' : 'POST';
        const endpoint = isUpdate
            ? resolveEndpoint(updateEndpoint ?? createEndpoint, entityId)
            : resolveEndpoint(createEndpoint, entityId);

        await fetchJSON(endpoint, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        onClose();
        await afterMutation({
            successMessage: isUpdate ? successMessageUpdate : successMessageCreate
        }).catch(() => {});
    } catch (error) {
        if (error?.status === 401) {
            onClose();
            handleUnauthorized(error.message || 'Сесію завершено. Увійдіть повторно.');
            return;
        }

        failWithError(error, errorMessageFallback);
    } finally {
        setIsSaving(false);
    }
}
