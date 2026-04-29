import { useState } from 'react';
import { fetchJSON } from '../api.ts';
import { ENDPOINTS } from '../app/endpoints.ts';
import { useAppActions } from '../appContext.tsx';
import { isAbortedLoad, useAbortableLoadEffect } from '../hooks/useAbortableLoadEffect.ts';
import { useAsyncStatus } from '../hooks/useAsyncStatus.ts';
import PageStateBoundary from './PageStateBoundary.tsx';
import ProfileMain from './profile/ProfileMain.tsx';
import ProfileSidebar from './profile/ProfileSidebar.tsx';
import { getTenureData } from './profile/profileDateUtils.ts';

export default function ProfilePage({ currentUser, isActive, employeeId, refreshKey = 0 }) {
  const { editEmployee, goBackToEmployees, handleUnauthorized } = useAppActions();
  const [profile, setProfile] = useState(null);
  const { errorMessage, failWithError, finishLoading, isLoading, resetAsyncStatus, startLoading } =
    useAsyncStatus();

  const isAdmin = currentUser?.role === 'admin';
  const requestedEmployeeId = employeeId ?? currentUser?.employee_id ?? null;

  useAbortableLoadEffect({
    enabled: Boolean(currentUser && isActive),
    deps: [currentUser, employeeId, currentUser?.employee_id, handleUnauthorized, isActive, refreshKey],
    onDisabled: () => {
      if (!currentUser) {
        setProfile(null);
        resetAsyncStatus();
      }
    },
    load: async ({ signal }) => {
      startLoading();

      try {
        const endpoint = requestedEmployeeId
          ? ENDPOINTS.profileById(requestedEmployeeId)
          : ENDPOINTS.profileMe;
        const data = await fetchJSON(endpoint, { signal });
        if (!signal.aborted) {
          setProfile(data);
        }
      } catch (error) {
        if (isAbortedLoad(error, signal)) return;
        if (error?.status === 401) {
          handleUnauthorized(error.message || 'Сесію завершено. Увійдіть повторно.');
          return;
        }
        setProfile(null);
        failWithError(error, 'Помилка завантаження профілю');
      } finally {
        if (!signal.aborted) finishLoading();
      }
    }
  });

  const employee = profile?.identity ? {
    id: profile.identity.id,
    first_name: profile.identity.first_name,
    last_name: profile.identity.last_name,
    middle_name: profile.identity.middle_name,
    birth_date: profile.identity.birth_date,
    email: profile.identity.email,
    phone: profile.identity.phone,
    address: profile.identity.address,
    hire_date: profile?.employment?.hire_date || '',
    salary: Number(profile?.employment?.salary || 0),
    status: profile?.employment?.status || 'active',
    department_name: profile?.employment?.department_name || '',
    position_title: profile?.employment?.position_title || ''
  } : null;
  const complaints = Array.isArray(profile?.complaints) ? profile.complaints : [];

  const loadingState = isLoading && !profile ? {
    icon: 'hourglass_top',
    title: 'Завантаження профілю',
    description: 'Отримуємо актуальні дані працівника з бази даних.'
  } : null;

  const errorState = errorMessage ? {
    icon: 'error',
    title: 'Не вдалося завантажити профіль',
    description: errorMessage
  } : null;

  const emptyState = !loadingState && !errorState && !employee ? {
    icon: 'person_search',
    title: 'Профіль недоступний',
    description: requestedEmployeeId
      ? 'Не вдалося завантажити вибраний профіль працівника.'
      : 'Поточний акаунт не привʼязаний до працівника. Відкрийте профіль із реєстру або привʼяжіть employee_id.'
  } : null;

  const content = employee ? (
    <div className="profile-layout profile-details-layout" id="profileContent">
      <ProfileSidebar
        employee={employee}
        tenure={getTenureData(employee.hire_date)}
        isAdmin={isAdmin}
        editEmployee={editEmployee}
        goBackToEmployees={goBackToEmployees}
      />
      <ProfileMain employee={employee} complaints={complaints} tenure={getTenureData(employee.hire_date)} />
    </div>
  ) : null;

  return (
    <PageStateBoundary loading={loadingState} error={errorState} empty={emptyState}>
      {content}
    </PageStateBoundary>
  );
}
