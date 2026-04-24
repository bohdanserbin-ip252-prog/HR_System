import { fetchJSON } from '../api.js';
import { ENDPOINTS } from '../app/endpoints.js';
import { useAppActions } from '../appContext.jsx';
import ModalFrame from './ModalFrame.jsx';
import EmployeeModalForm from './employeeModal/EmployeeModalForm.jsx';
import { buildEmployeePayload } from './employeeModal/formUtils.js';
import { useEmployeeModalData } from './employeeModal/useEmployeeModalData.js';

export default function EmployeeModal({ isOpen, mode, employeeId, currentUser, onClose }) {
  const { afterEmployeeMutation, handleUnauthorized } = useAppActions();
  const isAdmin = currentUser?.role === 'admin';

  const {
    form,
    setForm,
    departments,
    positions,
    isSaving,
    setIsSaving,
    errorMessage,
    setErrorMessage,
    failWithError,
    isLoading
  } = useEmployeeModalData({
    isOpen,
    isAdmin,
    mode,
    employeeId,
    onClose,
    handleUnauthorized
  });

  async function handleSubmit(event) {
    event.preventDefault();
    if (!isAdmin || isLoading || isSaving) return;

    const payload = buildEmployeePayload(form);
    if (!payload.first_name || !payload.last_name || !payload.hire_date) {
      setErrorMessage("Ім'я, прізвище та дата прийому обов'язкові");
      return;
    }

    if (payload.salary < 0) {
      setErrorMessage('Зарплата не може бути від’ємною');
      return;
    }

    if (payload.salary === null) {
      setErrorMessage('Зарплата має бути числом');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');

    try {
      const url = employeeId ? ENDPOINTS.employeeById(employeeId) : ENDPOINTS.employees;
      const method = employeeId ? 'PUT' : 'POST';

      const savedEmployee = await fetchJSON(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      onClose();
      await afterEmployeeMutation({
        employeeId: savedEmployee?.id ?? employeeId ?? null,
        reason: employeeId ? 'employee-updated' : 'employee-created',
        successMessage: employeeId ? 'Працівника оновлено' : 'Працівника додано'
      }).catch(() => {});
    } catch (error) {
      if (error?.status === 401) {
        onClose();
        handleUnauthorized(error.message || 'Сесію завершено. Увійдіть повторно.');
        return;
      }
      failWithError(error, 'Помилка збереження');
    } finally {
      setIsSaving(false);
    }
  }

  const title = employeeId && isLoading
    ? 'Завантаження працівника...'
    : employeeId
      ? 'Редагувати працівника'
      : 'Додати працівника';

  const disableFields = isLoading || isSaving;

  return (
    <ModalFrame
      modalId="employeeModal"
      title={title}
      size="wide"
      isOpen={isOpen}
      onClose={() => {
        if (isSaving) return;
        onClose();
      }}
      footer={(
        <>
          <button className="btn btn-secondary" onClick={onClose} type="button" disabled={isSaving}>
            Скасувати
          </button>
          <button className="btn btn-primary" type="submit" form="employeeModalForm" disabled={disableFields}>
            {isSaving ? 'Збереження...' : 'Зберегти'}
          </button>
        </>
      )}
    >
      <EmployeeModalForm
        form={form}
        setForm={setForm}
        departments={departments}
        positions={positions}
        disableFields={disableFields}
        errorMessage={errorMessage}
        onSubmit={handleSubmit}
      />
    </ModalFrame>
  );
}
