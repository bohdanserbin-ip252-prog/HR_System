import { useState } from 'react';
import { fetchJSON } from '../api.js';
import { ENDPOINTS } from '../app/endpoints.js';
import { useAppActions } from '../appContext.jsx';
import { isAbortedLoad, useAbortableLoadEffect } from '../hooks/useAbortableLoadEffect.js';
import { useAsyncStatus } from '../hooks/useAsyncStatus.js';
import PageStateBoundary from './PageStateBoundary.jsx';

export default function TrainingPage({ currentUser, isActive }) {
  const isAdmin = currentUser?.role === 'admin';
  const { handleUnauthorized } = useAppActions();
  const [courses, setCourses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const { errorMessage, failWithError, finishLoading, isLoading, resetAsyncStatus, startLoading } =
    useAsyncStatus();

  useAbortableLoadEffect({
    enabled: Boolean(isActive),
    deps: [isActive, handleUnauthorized],
    onDisabled: () => { setCourses([]); resetAsyncStatus(); },
    load: async ({ signal }) => {
      startLoading();
      try {
        const data = await fetchJSON(ENDPOINTS.trainingCourses, { signal });
        if (!signal.aborted) setCourses(Array.isArray(data) ? data : []);
      } catch (error) {
        if (isAbortedLoad(error, signal)) return;
        if (error?.status === 401) { handleUnauthorized(error.message); return; }
        failWithError(error, 'Помилка завантаження курсів');
      } finally {
        if (!signal.aborted) finishLoading();
      }
    }
  });

  async function createCourse(event) {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      await fetchJSON(ENDPOINTS.trainingCourses, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      event.currentTarget.reset();
      setShowForm(false);
      const data = await fetchJSON(ENDPOINTS.trainingCourses);
      setCourses(Array.isArray(data) ? data : []);
    } catch (error) {
      failWithError(error, 'Помилка створення курсу');
    }
  }

  async function assignCourse(courseId, employeeId) {
    try {
      await fetchJSON(ENDPOINTS.trainingAssignments, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ course_id: Number(courseId), employee_id: Number(employeeId) })
      });
      alert('Курс призначено!');
    } catch (error) {
      failWithError(error, 'Помилка призначення');
    }
  }

  const loadingState = isLoading && !courses.length ? { icon: 'hourglass_top', title: 'Завантаження...', description: 'Отримуємо каталог курсів...' } : null;
  const errorState = errorMessage ? { icon: 'error', title: 'Помилка', description: errorMessage } : null;
  const emptyState = !loadingState && !errorState && !courses.length ? { icon: 'school', title: 'Курсів немає', description: 'Додайте перший курс навчання.' } : null;

  return (
    <>
      <div className="page-header platform-header">
        <div>
          <h1>Training / LMS</h1>
          <p>Каталог курсів, призначення та прогрес навчання.</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowForm(v => !v)} type="button">
            {showForm ? 'Скасувати' : 'Додати курс'}
          </button>
        )}
      </div>
      <PageStateBoundary loading={loadingState} error={errorState} empty={emptyState}>

      {showForm && (
        <div className="card card-padded" style={{ marginBottom: '1.5rem' }}>
          <h3>Новий курс</h3>
          <form className="platform-inline-form" onSubmit={createCourse}>
            <input name="title" placeholder="Назва курсу" required className="form-input" />
            <input name="description" placeholder="Опис" className="form-input" />
            <input name="due_date" type="date" className="form-input" />
            <button className="btn btn-primary" type="submit">Створити</button>
          </form>
        </div>
      )}

      <div className="platform-grid">
        {courses.map(course => (
          <div className="card platform-card" key={course.id}>
            <div className="platform-card__head">
              <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--primary)' }}>school</span>
              <div>
                <h3>{course.title}</h3>
                <p>{course.description || 'Курс готовий до призначення'}</p>
              </div>
            </div>
            <div className="platform-card__body">
              {course.dueDate && <div style={{ fontSize: '13px', color: 'var(--on-surface-variant)' }}>Дедлайн: {course.dueDate}</div>}
              {isAdmin && (
                <div className="platform-inline-form" style={{ marginTop: '8px' }}>
                  <input placeholder="ID працівника" type="number" id={`assign-${course.id}`} className="form-input" style={{ maxWidth: '140px' }} />
                  <button className="btn btn-outline" onClick={() => assignCourse(course.id, document.getElementById(`assign-${course.id}`).value)} type="button">
                    Призначити
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </PageStateBoundary>
    </>
  );
}
