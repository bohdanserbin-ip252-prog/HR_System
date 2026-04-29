import { useState } from 'react';
import { fetchJSON } from '../../api.ts';
import { ENDPOINTS } from '../../app/endpoints.ts';
import { isAbortedLoad, useAbortableLoadEffect } from '../../hooks/useAbortableLoadEffect.ts';
import { useAsyncStatus } from '../../hooks/useAsyncStatus.ts';
import { createEmptyForm, mapEmployeeToForm } from './formUtils.ts';

export function useEmployeeModalData({ isOpen, isAdmin, mode, employeeId, onClose, handleUnauthorized }) {
  const [form, setForm] = useState(createEmptyForm());
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  const asyncStatus = useAsyncStatus();
  const { failWithError, finishLoading, resetAsyncStatus, startLoading } = asyncStatus;

  useAbortableLoadEffect({
    enabled: Boolean(isOpen && isAdmin),
    deps: [employeeId, handleUnauthorized, isAdmin, isOpen, mode, onClose],
    onDisabled: () => {
      if (!isOpen) {
        setForm(createEmptyForm());
        setDepartments([]);
        setPositions([]);
        setIsSaving(false);
        resetAsyncStatus();
        return;
      }

      if (!isAdmin) onClose();
    },
    load: async ({ signal }) => {
      startLoading();
      setForm(createEmptyForm());

      try {
        const refsPromise = Promise.all([
          fetchJSON(ENDPOINTS.departments, { signal }),
          fetchJSON(ENDPOINTS.positions, { signal })
        ]);

        if (mode === 'edit' && employeeId) {
          const [references, employee] = await Promise.all([
            refsPromise,
            fetchJSON(ENDPOINTS.employeeById(employeeId), { signal })
          ]);

          if (!signal.aborted) {
            const [nextDepartments, nextPositions] = references;
            setDepartments(Array.isArray(nextDepartments) ? nextDepartments : []);
            setPositions(Array.isArray(nextPositions) ? nextPositions : []);
            setForm(mapEmployeeToForm(employee));
          }

          return;
        }

        const [nextDepartments, nextPositions] = await refsPromise;
        if (!signal.aborted) {
          setDepartments(Array.isArray(nextDepartments) ? nextDepartments : []);
          setPositions(Array.isArray(nextPositions) ? nextPositions : []);
          setForm(createEmptyForm());
        }
      } catch (error) {
        if (isAbortedLoad(error, signal)) return;
        if (error?.status === 401) {
          onClose();
          handleUnauthorized(error.message || 'Сесію завершено. Увійдіть повторно.');
          return;
        }
        failWithError(error, 'Помилка завантаження форми працівника');
      } finally {
        if (!signal.aborted) finishLoading();
      }
    }
  });

  return {
    ...asyncStatus,
    form,
    setForm,
    departments,
    positions,
    isSaving,
    setIsSaving
  };
}
