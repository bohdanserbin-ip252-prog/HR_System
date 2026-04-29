import { canCreateOnPage as canCreateOnPageByRegistry } from './app/pageRegistry.tsx';

export const ROLE_LABELS = {
  admin: 'Адміністратор',
  user: 'Користувач'
};

export function getRoleLabel(role) {
  return ROLE_LABELS[role] || ROLE_LABELS.user;
}

export function canCreateOnPage(role, page) {
  return canCreateOnPageByRegistry(role, page);
}
