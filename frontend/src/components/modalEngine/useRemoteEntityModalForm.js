import { isAbortedLoad, useAbortableLoadEffect } from '../../hooks/useAbortableLoadEffect.js';

export default function useRemoteEntityModalForm({
    deps = [],
    emptyForm,
    entityId,
    errorMessageOnLoad,
    failWithError,
    finishLoading,
    handleUnauthorized,
    isAdmin,
    isOpen,
    loadEntity,
    mapEntityToForm,
    mode,
    onClose,
    resetAsyncStatus,
    setForm,
    setIsSaving,
    startLoading
}) {
    useAbortableLoadEffect({
        enabled: Boolean(isOpen && isAdmin && mode === 'edit' && entityId),
        deps: [entityId, isAdmin, isOpen, mode, onClose, handleUnauthorized, ...deps],
        onDisabled: () => {
            if (!isOpen) {
                setForm(emptyForm);
                setIsSaving(false);
                resetAsyncStatus();
                return;
            }

            if (!isAdmin) {
                onClose();
                return;
            }

            if (mode !== 'edit' || !entityId) {
                setForm(emptyForm);
                resetAsyncStatus();
            }
        },
        load: async ({ signal }) => {
            startLoading();

            try {
                const entity = await loadEntity({ entityId, signal });
                if (!signal.aborted) {
                    setForm(mapEntityToForm(entity));
                }
            } catch (error) {
                if (isAbortedLoad(error, signal)) return;
                if (error?.status === 401) {
                    onClose();
                    handleUnauthorized(error.message || 'Сесію завершено. Увійдіть повторно.');
                    return;
                }

                failWithError(error, errorMessageOnLoad);
            } finally {
                if (!signal.aborted) finishLoading();
            }
        }
    });
}
