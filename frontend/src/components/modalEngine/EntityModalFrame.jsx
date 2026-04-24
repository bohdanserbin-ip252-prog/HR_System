import EntityFormFields from './EntityFormFields.jsx';
import FormErrorMessage from '../FormErrorMessage.jsx';
import ModalFrame from '../ModalFrame.jsx';

export default function EntityModalFrame({
    children,
    errorMessage,
    fieldsDisabled,
    formId,
    form,
    isLoading = false,
    isOpen,
    isSaving,
    modalId,
    onClose,
    onSubmit,
    sections,
    setForm,
    size = 'standard',
    submitLabel = 'Зберегти',
    submittingLabel = 'Збереження...',
    title
}) {
    return (
        <ModalFrame
            modalId={modalId}
            title={title}
            size={size}
            isOpen={isOpen}
            onClose={() => {
                if (!isSaving) onClose();
            }}
            footer={(
                <>
                    <button
                        className="btn btn-secondary"
                        onClick={onClose}
                        type="button"
                        disabled={isSaving}
                    >
                        Скасувати
                    </button>
                    <button
                        className="btn btn-primary"
                        type="submit"
                        form={formId}
                        disabled={isLoading || isSaving}
                    >
                        {isSaving ? submittingLabel : submitLabel}
                    </button>
                </>
            )}
        >
            <form id={formId} onSubmit={onSubmit}>
                <FormErrorMessage
                    message={errorMessage}
                    style={{ display: 'block', marginBottom: '16px' }}
                />
                {sections ? (
                    <EntityFormFields
                        sections={sections}
                        form={form}
                        setForm={setForm}
                        disabled={fieldsDisabled ?? (isLoading || isSaving)}
                    />
                ) : children}
            </form>
        </ModalFrame>
    );
}
