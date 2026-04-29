import { formatDate, getAvatarColor, statusLabel } from '../../uiUtils.ts';

export default function ProfileSidebar({ employee, tenure, isAdmin, editEmployee, goBackToEmployees }) {
  const displayName = `${employee.last_name} ${employee.first_name} ${employee.middle_name || ''}`.trim();
  const initials = `${employee.first_name?.[0] || ''}${employee.last_name?.[0] || ''}`;
  const locationText = employee.address || 'Адреса не вказана';
  const canEmail = Boolean(employee.email);

  return (
    <aside className="profile-sidebar">
      <div className="profile-back">
        <button className="btn btn-secondary btn-sm" onClick={goBackToEmployees} type="button">
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_back</span>
          Назад до реєстру
        </button>
      </div>
      <div className="profile-identity">
        <div className="profile-avatar-wrap">
          <div className="profile-avatar" id="profileAvatar" style={{ background: getAvatarColor(employee.last_name) }}>
            {initials || '—'}
          </div>
          <div className={`profile-status-dot ${employee.status}`} id="profileStatusDot" title={statusLabel(employee.status)}></div>
        </div>
        <h1 className="profile-name" id="profileName">{displayName || '—'}</h1>
        <p className="profile-position" id="profilePosition">{employee.position_title || 'Без посади'}</p>
        <p className="profile-location" id="profileLocation">
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>location_on</span>{' '}
          {locationText}
        </p>
      </div>
      <div className="profile-actions">
        {isAdmin ? (
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => editEmployee(employee.id)} type="button">
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit</span>
            Редагувати
          </button>
        ) : null}
        {canEmail ? (
          <a className="btn-icon" href={`mailto:${encodeURIComponent(employee.email)}`} title="Написати">
            <span className="material-symbols-outlined">mail</span>
          </a>
        ) : (
          <button className="btn-icon" title="Email не вказано" type="button" disabled>
            <span className="material-symbols-outlined">mail</span>
          </button>
        )}
      </div>
      <div className="profile-meta-cards">
        <div className="profile-meta-card">
          <div className="profile-meta-icon"><span className="material-symbols-outlined">mail</span></div>
          <div>
            <span className="profile-meta-label">Email</span>
            <span className="profile-meta-value" id="profileEmail">{employee.email || '—'}</span>
          </div>
        </div>
        <div className="profile-meta-card">
          <div className="profile-meta-icon"><span className="material-symbols-outlined">group</span></div>
          <div>
            <span className="profile-meta-label">Відділ</span>
            <span className="profile-meta-value" id="profileDept">{employee.department_name || '—'}</span>
          </div>
        </div>
        <div className="profile-meta-card">
          <div className="profile-meta-icon"><span className="material-symbols-outlined">phone</span></div>
          <div>
            <span className="profile-meta-label">Телефон</span>
            <span className="profile-meta-value" id="profilePhone">{employee.phone || '—'}</span>
          </div>
        </div>
        <div className="profile-meta-card">
          <div className="profile-meta-icon"><span className="material-symbols-outlined">schedule</span></div>
          <div>
            <span className="profile-meta-label">Дата прийому</span>
            <span className="profile-meta-value" id="profileHireDate">{formatDate(employee.hire_date)}</span>
            <span className="profile-meta-sub" id="profileTenure">{`Стаж: ${tenure.tenureLabel}`}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
