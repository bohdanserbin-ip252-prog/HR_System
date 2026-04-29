import { useState } from 'react';
import { fetchJSON } from '../api.ts';
import { ENDPOINTS } from '../app/endpoints.ts';
import { getRoleLabel } from '../permissions.ts';

export default function SettingsPage({ currentUser }) {
  const [passwordForm, setPasswordForm] = useState({ old: '', new: '', confirm: '' });
  const [passwordMessage, setPasswordMessage] = useState('');

  async function changePassword(event) {
    event.preventDefault();
    if (passwordForm.new !== passwordForm.confirm) {
      setPasswordMessage('Паролі не співпадають');
      return;
    }
    try {
      await fetchJSON(ENDPOINTS.auth.changePassword, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ old_password: passwordForm.old, new_password: passwordForm.new })
      });
      setPasswordMessage('Пароль успішно змінено');
      setPasswordForm({ old: '', new: '', confirm: '' });
    } catch (error) {
      setPasswordMessage(error.message || 'Помилка зміни пароля');
    }
  }

  return (
    <>
      <div className="page-header">
        <h1>Налаштування</h1>
        <p>Керування профілем та параметрами системи.</p>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header-bar"><h2>Профіль</h2></div>
        <div style={{ padding: '1.5rem' }}>
          <div className="form-group">
            <label>Ім&apos;я користувача</label>
            <div className="form-input" style={{ background: 'var(--surface-container)' }}>{currentUser?.username || '—'}</div>
          </div>
          <div className="form-group">
            <label>Роль</label>
            <div className="form-input" style={{ background: 'var(--surface-container)' }}>{getRoleLabel(currentUser?.role)}</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header-bar"><h2>Безпека</h2></div>
        <div style={{ padding: '1.5rem' }}>
          <form onSubmit={changePassword}>
            <div className="form-group">
              <label>Поточний пароль</label>
              <input type="password" className="form-input" value={passwordForm.old} onChange={e => setPasswordForm(v => ({ ...v, old: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label>Новий пароль</label>
              <input type="password" className="form-input" value={passwordForm.new} onChange={e => setPasswordForm(v => ({ ...v, new: e.target.value }))} required minLength={6} />
            </div>
            <div className="form-group">
              <label>Підтвердження пароля</label>
              <input type="password" className="form-input" value={passwordForm.confirm} onChange={e => setPasswordForm(v => ({ ...v, confirm: e.target.value }))} required />
            </div>
            {passwordMessage && <p style={{ fontSize: '13px', color: passwordMessage.includes('успішно') ? 'var(--emerald-700)' : 'var(--error)' }}>{passwordMessage}</p>}
            <button type="submit" className="btn btn-primary">Змінити пароль</button>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header-bar"><h2>Про систему</h2></div>
        <div style={{ padding: '1.5rem' }}>
          <div className="form-group">
            <label>Версія</label>
            <div className="form-input" style={{ background: 'var(--surface-container)' }}>HR System v2.0</div>
          </div>
          <div className="form-group">
            <label>Технології</label>
            <div className="form-input" style={{ background: 'var(--surface-container)' }}>Rust + Axum + SQLite · React 19 + Vite + Tailwind</div>
          </div>
        </div>
      </div>
    </>
  );
}
