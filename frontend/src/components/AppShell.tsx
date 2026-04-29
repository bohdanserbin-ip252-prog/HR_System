import { useEffect, useState } from 'react';
import { useAppActions } from '../appContext.tsx';
import { hasFabAction } from '../app/pageRegistry.tsx';
import { PAGE_ORDER, SIDEBAR_ITEMS, TOP_NAV_ITEMS } from '../navigation.ts';
import { canCreateOnPage, getRoleLabel } from '../permissions.ts';
import useDarkMode from '../hooks/useDarkMode.ts';
import GlobalSearch from './GlobalSearch.tsx';
import NotificationBell from './NotificationBell.tsx';
const DRAWER_MEDIA_QUERY = '(max-width: 1024px)';

function getAvatarLetter(username) {
    return username?.[0]?.toUpperCase() || '—';
}

function getIsDrawerViewport() {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return false;
    }

    return window.matchMedia(DRAWER_MEDIA_QUERY).matches;
}

export default function AppShell({
    badgeCounts,
    isVisible,
    currentUser,
    currentPage,
    desktopNotificationsEnabled,
    isDesktopNotificationsSupported,
    isSidebarOpen,
    renderedPages,
    onNavigate,
    onToggleSidebar,
    onDesktopNotificationsToggle,
    onLogout,
    onFab
}) {
    const { openEmployeeCreate } = useAppActions();
    const isAdmin = currentUser?.role === 'admin';
    const isProfilePage = currentPage === 'profile';
    const [isDrawerViewport, setIsDrawerViewport] = useState(getIsDrawerViewport);
    const { isDark, toggle: toggleDarkMode } = useDarkMode();
    const avatarLetter = getAvatarLetter(currentUser?.username);
    const menuButtonLabel = isSidebarOpen ? 'Закрити навігацію' : 'Відкрити навігацію';
    const showFab = isVisible && hasFabAction(currentPage) && canCreateOnPage(currentUser?.role, currentPage);
    const isDrawerClosed = isDrawerViewport && !isSidebarOpen;
    const shellClassName = [
        'app-shell',
        isSidebarOpen ? 'app-shell--sidebar-open' : '',
        isProfilePage ? 'app-shell--profile' : ''
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <>
            <div className={shellClassName} id="appContainer" style={{ display: isVisible ? 'block' : 'none' }}>
                <header className="top-header">
                    <div className="top-header-brand">
                        {!isProfilePage ? (
                            <button
                                aria-controls="sidebar"
                                aria-expanded={isSidebarOpen}
                                aria-label={menuButtonLabel}
                                id="menuBtn"
                                onClick={onToggleSidebar}
                                type="button"
                            >
                                <span className="material-symbols-outlined" aria-hidden="true">menu</span>
                            </button>
                        ) : null}
                        <h1>HR System</h1>
                        <nav className="top-nav" id="topNav">
                            {TOP_NAV_ITEMS.map(item => (
                                <button
                                    aria-current={currentPage === item.page ? 'page' : undefined}
                                    key={item.page}
                                    className={currentPage === item.page ? 'active' : ''}
                                    data-page={item.page}
                                    onClick={() => onNavigate(item.page)}
                                    type="button"
                                >
                                    {item.label}
                                </button>
                            ))}
                        </nav>
                    </div>
                    <div className="top-header-right">
                        <GlobalSearch />
                        <NotificationBell onNavigate={onNavigate} />
                        <button
                            aria-label={isDark ? 'Увімкнути світлу тему' : 'Увімкнути темну тему'}
                            className="theme-toggle-btn"
                            onClick={toggleDarkMode}
                            title={isDark ? 'Світла тема' : 'Темна тема'}
                            type="button"
                        >
                            <span className="material-symbols-outlined" aria-hidden="true">
                                {isDark ? 'light_mode' : 'dark_mode'}
                            </span>
                        </button>
                        <div className="user-avatar-sm" id="headerAvatar" title="Профіль">{avatarLetter}</div>
                    </div>
                </header>

                {!isProfilePage ? (
                    <>
                        <aside aria-hidden={isDrawerClosed} className={`sidebar${isSidebarOpen ? ' open' : ''}`} id="sidebar">
                            <div className="sidebar-title-block">
                                <h2>Панель управління</h2>
                                <p>HR Operations Control</p>
                            </div>

                            <nav className="sidebar-nav">
                                {SIDEBAR_ITEMS.map(item => (
                                    <button
                                        aria-current={currentPage === item.page ? 'page' : undefined}
                                        key={item.page}
                                        className={`nav-item${currentPage === item.page ? ' active' : ''}`}
                                        data-page={item.page}
                                        onClick={() => onNavigate(item.page)}
                                        type="button"
                                    >
                                        <span className="material-symbols-outlined" aria-hidden="true">{item.icon}</span>
                                        <span>{item.label}</span>
                                        {item.badgeKey ? <span className="nav-badge">{badgeCounts[item.badgeKey]}</span> : null}
                                    </button>
                                ))}
                            </nav>

                            <div className="sidebar-footer">
                                {isAdmin ? (
                                    <button className="btn btn-primary" onClick={openEmployeeCreate} type="button">
                                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }} aria-hidden="true">summarize</span>
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
                                        <div className="role" id="sidebarUserRole">{getRoleLabel(currentUser?.role)}</div>
                                    </div>
                                    <button aria-label="Вийти" className="logout-btn" onClick={onLogout} title="Вийти" type="button">
                                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }} aria-hidden="true">logout</span>
                                    </button>
                                </div>
                            </div>
                        </aside>
                        <button
                            aria-label="Закрити навігацію"
                            aria-hidden={isDrawerClosed}
                            className={`sidebar-backdrop${isSidebarOpen ? ' sidebar-backdrop--active' : ''}`}
                            onClick={onToggleSidebar}
                            type="button"
                        ></button>
                    </>
                ) : null}

                <div className="main-content">
                    {PAGE_ORDER.map(page => (
                        <div
                            key={page}
                            className={`page-section${isVisible && currentPage === page ? ' active' : ''}`}
                            id={`page-${page}`}
                        >
                            {renderedPages?.[page] || null}
                        </div>
                    ))}
                </div>
            </div>

            <button
                aria-label="Додати"
                className="fab"
                id="fabBtn"
                onClick={onFab}
                style={{ display: showFab ? 'flex' : 'none' }}
                title="Додати"
                type="button"
            >
                <span className="material-symbols-outlined" aria-hidden="true">add_circle</span>
            </button>

            <div className="toast-container" id="toastContainer"></div>
        </>
    );
}
