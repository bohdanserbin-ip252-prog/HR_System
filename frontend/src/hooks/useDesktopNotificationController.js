import { useEffect, useRef } from 'react';
import { loadDevelopmentSnapshot, loadOnboardingSnapshot } from '../appRuntime.js';
import {
    MAX_REMINDERS_PER_CHECK,
    REMINDER_POLL_INTERVAL_MS,
    buildDesktopReminderPayloads,
    ensureDesktopNotificationPermission,
    getDesktopNotificationPermission,
    getToastTypeForReminder,
    getUnseenReminderNotifications,
    rememberReminderNotification,
    storeReminderInboxNotification,
    shouldUseDesktopNotifications,
    showDesktopNotification,
} from '../desktopNotifications.js';
import { showToast } from '../toast.js';

function formatToastMessage(reminder) {
    return `${reminder.title}. ${reminder.message}`;
}

export function useDesktopNotificationController({ authStatus, currentUser, desktopNotificationsEnabled, onUnauthorized }) {
    const onUnauthorizedRef = useRef(onUnauthorized);

    useEffect(() => {
        onUnauthorizedRef.current = onUnauthorized;
    }, [onUnauthorized]);

    useEffect(() => {
        if (authStatus !== 'authenticated' || !currentUser || !desktopNotificationsEnabled) return;
        void ensureDesktopNotificationPermission();
    }, [authStatus, currentUser?.id, desktopNotificationsEnabled]);

    useEffect(() => {
        if (authStatus !== 'authenticated' || !currentUser) return undefined;

        let disposed = false;

        async function runReminderCheck() {
            try {
                const handleUnauthorized = message => onUnauthorizedRef.current?.(message);
                const [development, onboarding] = await Promise.all([
                    loadDevelopmentSnapshot({ forceRefresh: true, onUnauthorized: handleUnauthorized }),
                    loadOnboardingSnapshot({ forceRefresh: true, onUnauthorized: handleUnauthorized }),
                ]);

                if (disposed) return;

                const pendingReminders = getUnseenReminderNotifications(
                    buildDesktopReminderPayloads({ development, onboarding }),
                ).slice(0, MAX_REMINDERS_PER_CHECK);

                pendingReminders.forEach(reminder => {
                    storeReminderInboxNotification(reminder);

                    const isPageHidden = shouldUseDesktopNotifications();
                    const canUseDesktop =
                        desktopNotificationsEnabled &&
                        isPageHidden &&
                        getDesktopNotificationPermission() === 'granted';

                    if (canUseDesktop) {
                        showDesktopNotification(reminder);
                        rememberReminderNotification(reminder.id);
                        return;
                    }

                    if (!isPageHidden) {
                        showToast(formatToastMessage(reminder), getToastTypeForReminder(reminder));
                        rememberReminderNotification(reminder.id);
                    }
                });
            } catch (error) {
                if (disposed || error?.status === 401) return;
                // Reminders are best-effort; ignore transient polling errors.
            }
        }

        function handleVisibilityChange() {
            void runReminderCheck();
        }

        void runReminderCheck();

        document.addEventListener('visibilitychange', handleVisibilityChange);
        const intervalId = window.setInterval(() => {
            void runReminderCheck();
        }, REMINDER_POLL_INTERVAL_MS);

        return () => {
            disposed = true;
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.clearInterval(intervalId);
        };
    }, [authStatus, currentUser?.id, desktopNotificationsEnabled]);
}
