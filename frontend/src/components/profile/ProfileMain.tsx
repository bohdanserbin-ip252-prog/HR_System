import { formatDate, formatMoney, statusLabel } from '../../uiUtils.ts';
import ProfileComplaintsSection from './ProfileComplaintsSection.tsx';

const SECONDARY_SKILLS = ['Корпоративна етика', 'Командна робота', 'Комунікація', 'Аналітичне мислення'];
const PROFILE_INFO_LABEL_STYLE = {
  fontSize: '12px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '1px',
  color: 'var(--on-surface-variant)',
  marginBottom: '4px'
};
const PROFILE_INFO_VALUE_STYLE = { fontSize: '15px', fontWeight: 500 };

function ProfileInfoItem({ label, value, fullWidth = false }) {
  return (
    <div className={fullWidth ? 'profile-info-grid-full' : undefined}>
      <p style={PROFILE_INFO_LABEL_STYLE}>{label}</p>
      <p style={PROFILE_INFO_VALUE_STYLE}>{value}</p>
    </div>
  );
}

export default function ProfileMain({ employee, complaints = [], tenure }) {
  const displayName = `${employee.last_name} ${employee.first_name} ${employee.middle_name || ''}`.trim();
  const primarySkills = employee.position_title
    ? [employee.position_title, employee.department_name || '', statusLabel(employee.status)].filter(Boolean)
    : ['Не призначено'];
  const salaryPct = employee.salary > 0 ? Math.min(Math.round((employee.salary / 100000) * 100), 100) : 0;
  const profileInfoItems = [
    { label: "Повне ім'я", value: displayName },
    { label: 'Посада', value: employee.position_title || 'Не вказано' },
    { label: 'Дата народження', value: employee.birth_date ? formatDate(employee.birth_date) : 'Не вказано' },
    { label: 'Email', value: employee.email || 'Не вказано' },
    { label: 'Телефон', value: employee.phone || 'Не вказано' },
    { label: 'Адреса', value: employee.address || 'Не вказано', fullWidth: true }
  ];

  return (
    <div className="profile-main">
      <div className="profile-hero-gradient"></div>
      <div className="profile-main-inner">
        <section className="profile-section">
          <h2 className="profile-section-title">
            <span className="material-symbols-outlined">person_book</span>
            Персональні дані
          </h2>
          <div className="card card-padded" id="profileNarrative">
            <div className="profile-info-grid">
              {profileInfoItems.map(item => <ProfileInfoItem key={item.label} {...item} />)}
            </div>
          </div>
        </section>

        <section className="profile-section">
          <h2 className="profile-section-title">
            <span className="material-symbols-outlined">psychology</span>
            Компетенції та кваліфікація
          </h2>
          <div id="profileSkills">
            <div className="skills-group">
              <div className="skills-group-label">Основні компетенції</div>
              <div className="skills-tags">
                {primarySkills.map(skill => (
                  <span key={skill} className="skill-tag primary">{skill}</span>
                ))}
              </div>
            </div>
            <div className="skills-group">
              <div className="skills-group-label">Загальні навички</div>
              <div className="skills-tags">
                {SECONDARY_SKILLS.map(skill => (
                  <span key={skill} className="skill-tag secondary">{skill}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="profile-section">
          <div className="profile-section-head">
            <h2 className="profile-section-title">
              <span className="material-symbols-outlined">timeline</span>
              Кар&apos;єрний шлях
            </h2>
            <span className="badge badge-active" id="profileJourneyBadge" style={{ fontSize: '13px', padding: '6px 14px' }}>
              {tenure.tenureLabel}
            </span>
          </div>
          <div className="profile-timeline" id="profileTimeline">
            <div className="timeline-item">
              <div className="timeline-node"></div>
              <div className="timeline-card current">
                <div className="timeline-card-head">
                  <h3>{employee.position_title || 'Працівник'}</h3>
                  <span className="date">{`${formatDate(employee.hire_date)} — Теперішній час`}</span>
                </div>
                <div className="team-label">{employee.department_name || 'Загальний відділ'}</div>
                <ul className="timeline-achievements">
                  <li>
                    <span className="material-symbols-outlined">check_circle</span>
                    <span>{`Зарплата: ${formatMoney(employee.salary)} ₴ / міс.`}</span>
                  </li>
                  <li>
                    <span className="material-symbols-outlined">check_circle</span>
                    <span>{`Статус: ${statusLabel(employee.status)}`}</span>
                  </li>
                </ul>
              </div>
            </div>
            <div className="timeline-item">
              <div className="timeline-node past"></div>
              <div className="timeline-join">
                <div className="timeline-join-icon">
                  <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>waving_hand</span>
                </div>
                <div>
                  <h3>Прийнятий в компанію</h3>
                  <p>{tenure.hireDateLabel}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="profile-section">
          <h2 className="profile-section-title">
            <span className="material-symbols-outlined">target</span>
            Поточний фокус
          </h2>
          <div className="profile-focus-grid" id="profileFocus">
            <div className="focus-card">
              <div className="focus-card-head">
                <div className="focus-card-icon green"><span className="material-symbols-outlined">payments</span></div>
                <h3>Заробітна плата</h3>
              </div>
              <p>{`Поточний рівень оплати праці працівника з урахуванням посади «${employee.position_title || '—'}» в відділі «${employee.department_name || '—'}».`}</p>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                  <span>{`${formatMoney(employee.salary)} ₴ / міс.`}</span>
                  <span>{`${salaryPct}%`}</span>
                </div>
                <div className="progress-track"><div className="progress-fill" style={{ width: `${salaryPct}%` }}></div></div>
              </div>
            </div>
            <div className="focus-card">
              <div className="focus-card-head">
                <div className="focus-card-icon teal"><span className="material-symbols-outlined">trending_up</span></div>
                <h3>Стаж роботи</h3>
              </div>
              <p>{`Загальний стаж роботи на підприємстві з дати прийому ${tenure.hireDateLabel}.`}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 'auto' }}>
                <span className="badge badge-active" style={{ fontSize: '12px', padding: '4px 12px' }}>{tenure.tenureLabel}</span>
                <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>{`з ${formatDate(employee.hire_date)}`}</span>
              </div>
            </div>
          </div>
        </section>

        <ProfileComplaintsSection complaints={complaints} />
      </div>
    </div>
  );
}
