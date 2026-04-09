import FormErrorMessage from './FormErrorMessage.jsx';
export default function LoginScreen({
    isVisible,
    username,
    password,
    errorMessage,
    isBusy,
    onUsernameChange,
    onPasswordChange,
    onSubmit
}) {
    return (
        <div id="loginScreen" style={{ display: isVisible ? 'flex' : 'none' }}>
            <form className="login-container" onSubmit={onSubmit}>
                <div className="login-logo">
                    <div className="logo-box"><span className="material-symbols-outlined">apartment</span></div>
                    <h1>HR System</h1>
                    <p>Кадровий облік підприємства</p>
                </div>
                <FormErrorMessage id="loginError" message={errorMessage} />
                <div className="form-group">
                    <label htmlFor="loginUsername">Логін</label>
                    <input
                        id="loginUsername"
                        type="text"
                        className="form-input"
                        placeholder="Введіть логін"
                        autoComplete="username"
                        value={username}
                        onChange={event => onUsernameChange(event.target.value)}
                        disabled={isBusy}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="loginPassword">Пароль</label>
                    <input
                        id="loginPassword"
                        type="password"
                        className="form-input"
                        placeholder="••••••"
                        autoComplete="current-password"
                        value={password}
                        onChange={event => onPasswordChange(event.target.value)}
                        disabled={isBusy}
                    />
                </div>
                <button className="btn btn-primary btn-full" type="submit" disabled={isBusy}>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>login</span>
                    {isBusy ? 'Завантаження...' : 'Увійти'}
                </button>
            </form>
        </div>
    );
}
