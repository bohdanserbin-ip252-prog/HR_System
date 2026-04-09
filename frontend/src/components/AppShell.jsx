import { useAppActions } from '../appContext.jsx';

const TOP_NAV_ITEMS = [
    { page: 'dashboard', label: 'Огляд' },
    { page: 'employees', label: 'Кадри' },
    { page: 'departments', label: 'Аналітика' }
];

const SIDEBAR_ITEMS = [
    { page: 'dashboard', label: 'Огляд системи', icon: 'insights' },
    { page: 'employees', label: 'Кадровий склад', icon: 'account_balance', badgeKey: 'employees' },
    { page: 'departments', label: 'Відділи', icon: 'pie_chart', badgeKey: 'departments' },
    { page: 'positions', label: 'Посади', icon: 'work', badgeKey: 'positions' },
    { page: 'onboarding', label: 'Адаптація', icon: 'person_add' },
    { page: 'development', label: 'Розвиток', icon: 'trending_up' }
];

const PAGE_ORDER = ['dashboard', 'employees', 'departments', 'positions', 'profile', 'onboarding', 'development'];

function getAvatarLetter(username) {
    return username?.[0]?.toUpperCase() || '—';
}

export default function AppShell({
    badgeCounts,
    isVisible,
    currentUser,
    currentPage,
    desktopNotificationsEnabled,
    isDesktopNotificationsSupported,
    isSidebarOpen,
    pageViews,
    onNavigate,
    onToggleSidebar,
    onDesktopNotificationsToggle,
    onLogout,
    onFab
}) {
    const { openEmployeeCreate } = useAppActions();
    const isAdmin = currentUser?.role === 'admin';
    const isProfilePage = currentPage === 'profile';
    const avatarLetter = getAvatarLetter(currentUser?.username);
    const fabPages = new Set(['employees', 'departments', 'positions', 'development', 'onboarding']);
    const showFab = isVisible && isAdmin && fabPages.has(currentPage);

    return (
        <>
            <div id="appContainer" style={{ display: isVisible ? 'block' : 'none' }}>
                <header className="top-header">
                    <div className="top-header-brand">
                        {!isProfilePage ? (
                            <button id="menuBtn" onClick={onToggleSidebar} style={{ display: 'none' }}>
                                <span className="material-symbols-outlined">menu</span>
                            </button>
                        ) : null}
                        <h1>HR System</h1>
                        <nav className="top-nav" id="topNav">
                            {TOP_NAV_ITEMS.map(item => (
                                <a
                                    key={item.page}
                                    className={currentPage === item.page ? 'active' : ''}
                                    data-page={item.page}
                                    onClick={() => onNavigate(item.page)}
                                >
                                    {item.label}
                                </a>
                            ))}
                        </nav>
                    </div>
                    <div className="top-header-right">
                        <div className="user-avatar-sm" id="headerAvatar" title="Профіль">{avatarLetter}</div>
                    </div>
                </header>

                {!isProfilePage ? (
                    <aside className={`sidebar${isSidebarOpen ? ' open' : ''}`} id="sidebar">
                        <div className="sidebar-title-block">
                            <h2>Панель управління</h2>
                            <p>HR Operations Control</p>
                        </div>

                        <nav className="sidebar-nav">
                            {SIDEBAR_ITEMS.map(item => (
                                <a
                                    key={item.page}
                                    className={`nav-item${currentPage === item.page ? ' active' : ''}`}
                                    data-page={item.page}
                                    onClick={() => onNavigate(item.page)}
                                >
                                    <span className="material-symbols-outlined">{item.icon}</span>
                                    <span>{item.label}</span>
                                    {item.badgeKey ? <span className="nav-badge">{badgeCounts[item.badgeKey]}</span> : null}
                                </a>
                            ))}
                        </nav>

                        <div className="sidebar-footer">
                            {isAdmin ? (
                                <button className="btn btn-primary" onClick={openEmployeeCreate}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>summarize</span>
                                    Додати працівника
                                </button>
                            ) : null}
                            <div className="sidebar-notification-toggle">
                                <div className="sidebar-notification-copy">
                                    <span className="sidebar-notification-title">Desktop-сповіщення</span>
                                    <span className="sidebar-notification-text">
                                        {isDesktopNotificationsSupported
                                            ? 'Показувати системні сповіщення, коли вкладка неактивна.'
                                            : 'Браузер не підтримує системні сповіщення на цьому пристрої.'}
                                    </span>
                                </div>
                                <label className={`toggle-switch${!isDesktopNotificationsSupported ? ' disabled' : ''}`}>
                                    <input
                                        aria-label="Desktop-сповіщення"
                                        checked={desktopNotificationsEnabled}
                                        disabled={!isDesktopNotificationsSupported}
                                        onChange={event => onDesktopNotificationsToggle(event.target.checked)}
                                        type="checkbox"
                                    />
                                    <span className="toggle-slider" aria-hidden="true"></span>
                                </label>
                            </div>
                            <div className="sidebar-user">
                                <div className="user-avatar-sm" id="sidebarAvatar">{avatarLetter}</div>
                                <div className="sidebar-user-info">
                                    <div className="name" id="sidebarUserName">{currentUser?.username || '—'}</div>
                                    <div className="role" id="sidebarUserRole">{isAdmin ? 'Адміністратор' : 'Користувач'}</div>
                                </div>
                                <button className="logout-btn" onClick={onLogout} title="Вийти">
                                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>logout</span>
                                </button>
                            </div>
                        </div>
                    </aside>
                ) : null}

                <div className="main-content" style={{ marginLeft: isProfilePage ? '0' : undefined }}>
                    {PAGE_ORDER.map(page => (
                        <div
                            key={page}
                            className={`page-section${isVisible && currentPage === page ? ' active' : ''}`}
                            id={`page-${page}`}
                        >
                            {pageViews?.[page] || null}
                        </div>
                    ))}
                </div>
            </div>

            <button
                className="fab"
                id="fabBtn"
                onClick={onFab}
                style={{ display: showFab ? 'flex' : 'none' }}
                title="Додати"
            >
                <span className="material-symbols-outlined">add_circle</span>
            </button>

            <div className="toast-container" id="toastContainer"></div>
        </>
    );
}
