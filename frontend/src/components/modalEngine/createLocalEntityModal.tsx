import { useAppActions } from '../../appContext.tsx';
import { useAsyncStatus } from '../../hooks/useAsyncStatus.ts';
import EntityModalFrame from './EntityModalFrame.tsx';
import { submitEntityMutation } from './submitEntityMutation.ts';
import useLocalEntityModalForm from './useLocalEntityModalForm.ts';

const NOOP_AFTER_MUTATION = async () => {};

export default function createLocalEntityModal(config) {
    const {
        actionName,
        buildPayload,
        createEmptyForm,
        createEndpoint,
        errorMessageFallback,
        formId,
        mapEntityToForm,
        modalId,
        notFoundMessage,
        sections,
        size = 'standard',
        successMessageCreate,
        successMessageUpdate,
        titleCreate,
        titleEdit,
        updateEndpoint,
        validatePayload
    } = config;

    return function LocalEntityModal({
        isOpen,
        mode,
        entityId = null,
        currentUser,
        entities = [],
        onClose
    }) {
        const appActions = useAppActions();
        const { handleUnauthorized } = appActions;
        const afterMutation = typeof appActions[actionName] === 'function'
            ? appActions[actionName]
            : NOOP_AFTER_MUTATION;

        const {
            errorMessage,
            failWithError,
            resetAsyncStatus,
            setErrorMessage
        } = useAsyncStatus();

        const isAdmin = currentUser?.role === 'admin';

        const { form, isSaving, setForm, setIsSaving } = useLocalEntityModalForm({
            createEmptyForm,
            entities,
            entityId,
            isAdmin,
            isOpen,
            mapEntityToForm,
            mode,
            notFoundMessage,
            onClose,
            resetAsyncStatus,
            setErrorMessage
        });

        async function handleSubmit(event) {
            event.preventDefault();
            if (!isAdmin || isSaving) return;

            const payload = buildPayload({
                entityId,
                entities,
                form
            });

            const validationError = validatePayload?.({
                entityId,
                entities,
                form,
                payload
            });
            if (validationError) {
                setErrorMessage(validationError);
                return;
            }

            await submitEntityMutation({
                afterMutation,
                createEndpoint,
                entityId,
                errorMessageFallback,
                failWithError,
                handleUnauthorized,
                onClose,
                payload,
                setErrorMessage,
                setIsSaving,
                successMessageCreate,
                successMessageUpdate,
                updateEndpoint
            });
        }

        return (
            <EntityModalFrame
                modalId={modalId}
                title={entityId ? titleEdit : titleCreate}
                size={size}
                isOpen={isOpen}
                onClose={onClose}
                isSaving={isSaving}
                errorMessage={errorMessage}
                formId={formId}
                onSubmit={handleSubmit}
                sections={sections}
                form={form}
                setForm={setForm}
                fieldsDisabled={isSaving}
            />
        );
    };
}
