import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { fetchJSON } from '../../api.ts';
import { ENDPOINTS } from '../../app/endpoints.ts';
import { isAbortedLoad, useAbortableLoadEffect } from '../../hooks/useAbortableLoadEffect.ts';
import { useAsyncStatus } from '../../hooks/useAsyncStatus.ts';

export const STATUS_OPTIONS = [
  { value: '', label: 'Усі статуси', icon: 'checklist' },
  { value: 'active', label: 'Активний', icon: 'status-active' },
  { value: 'on_leave', label: 'У відпустці', icon: 'status-on_leave' },
  { value: 'fired', label: 'Звільнений', icon: 'status-fired' }
];

export function useEmployeesPageData({ currentUser, isActive, refreshKey, handleUnauthorized }) {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [status, setStatus] = useState('');
  const [sortBy, setSortBy] = useState('id');
  const [sortDir, setSortDir] = useState('desc');
  const [openDropdown, setOpenDropdown] = useState('');
  const searchQuery = useDeferredValue(searchInput.trim());

  const asyncStatus = useAsyncStatus();
  const { failWithError, finishLoading, isLoading, resetAsyncStatus, startLoading } = asyncStatus;

  useEffect(() => {
    function handleDocumentClick(event) {
      const target = event.target;
      if (!(target instanceof Element) || !target.closest('.custom-select')) setOpenDropdown('');
    }

    if (!openDropdown) return undefined;
    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, [openDropdown]);

  useAbortableLoadEffect({
    enabled: Boolean(currentUser),
    deps: [currentUser, handleUnauthorized, refreshKey],
    onDisabled: () => {
      if (!currentUser) {
        setEmployees([]);
        setDepartments([]);
        resetAsyncStatus();
      }
    },
    load: async ({ signal }) => {
      try {
        const data = await fetchJSON(ENDPOINTS.departments, { signal });
        if (!signal.aborted) setDepartments(Array.isArray(data) ? data : []);
      } catch (error) {
        if (isAbortedLoad(error, signal)) return;
        if (error?.status === 401) {
          handleUnauthorized(error.message || 'Сесію завершено. Увійдіть повторно.');
          return;
        }
        failWithError(error, 'Помилка завантаження відділів');
      }
    }
  });

  useAbortableLoadEffect({
    enabled: Boolean(currentUser && isActive),
    deps: [currentUser, departmentId, handleUnauthorized, isActive, refreshKey, searchQuery, sortBy, sortDir, status],
    onDisabled: () => {
      if (!currentUser) {
        setEmployees([]);
        resetAsyncStatus();
      }
    },
    load: async ({ signal }) => {
      startLoading();

      try {
        const params = new URLSearchParams();
        if (searchQuery) params.set('search', searchQuery);
        if (departmentId) params.set('department_id', departmentId);
        if (status) params.set('status', status);
        params.set('sort_by', sortBy);
        params.set('sort_dir', sortDir);

        const data = await fetchJSON(ENDPOINTS.employeesQuery({
          search: searchQuery,
          department_id: departmentId,
          status,
          sort_by: sortBy,
          sort_dir: sortDir
        }), { signal });
        if (!signal.aborted) setEmployees(Array.isArray(data) ? data : []);
      } catch (error) {
        if (isAbortedLoad(error, signal)) return;
        if (error?.status === 401) {
          handleUnauthorized(error.message || 'Сесію завершено. Увійдіть повторно.');
          return;
        }
        setEmployees([]);
        failWithError(error, 'Помилка завантаження працівників');
      } finally {
        if (!signal.aborted) finishLoading();
      }
    }
  });

  const activeDepartment = useMemo(
    () => departments.find(item => String(item.id) === String(departmentId)),
    [departments, departmentId]
  );

  const departmentOptions = useMemo(
    () => [
      { value: '', label: 'Усі відділи', icon: 'category' },
      ...departments.map(item => ({ value: String(item.id), label: item.name, icon: 'apartment' }))
    ],
    [departments]
  );

  return {
    ...asyncStatus,
    employees,
    departments,
    searchInput,
    setSearchInput,
    departmentId,
    setDepartmentId,
    status,
    setStatus,
    sortBy,
    setSortBy,
    sortDir,
    setSortDir,
    openDropdown,
    setOpenDropdown,
    activeDepartment,
    departmentOptions,
    isLoading
  };
}
