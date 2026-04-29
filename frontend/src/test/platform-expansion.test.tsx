import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

import { PAGE_ORDER, SIDEBAR_ITEMS } from '../navigation.ts';
import { canCreateOnPage, getRoleLabel } from '../permissions.ts';
import PlatformCard from '../components/platform/PlatformCard.tsx';
import PlatformListPage from '../components/platform/PlatformListPage.tsx';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('platform expansion navigation', () => {
  it('registers only canonical pages in navigation and page order', () => {
    expect(PAGE_ORDER).toEqual([
      'dashboard',
      'employees',
      'organization',
      'complaints',
      'onboarding',
      'development',
      'profile',
      'activity',
      'audit',
      'operations',
      'system'
    ]);

    expect(SIDEBAR_ITEMS.map(item => item.page)).toEqual([
      'dashboard',
      'employees',
      'organization',
      'complaints',
      'onboarding',
      'development',
      'activity',
      'audit',
      'operations',
      'system'
    ]);

    expect(PAGE_ORDER).not.toEqual(expect.arrayContaining([
      'departments',
      'positions',
      'documents',
      'payroll',
      'training',
      'scheduling',
      'performance',
      'time-off',
      'employee360',
      'workflows',
      'import',
      'reports',
      'inbox',
      'notifications',
      'rbac',
      'portal',
      'org-chart',
      'compliance',
      'audit-log',
      'recruitment',
      'helpDesk',
      'surveys',
      'settings',
      'featureFlags'
    ]));
  });

  it('centralizes role labels and create permissions', () => {
    expect(getRoleLabel('admin')).toBe('Адміністратор');
    expect(getRoleLabel('unknown')).toBe('Користувач');
    expect(canCreateOnPage('admin', 'organization')).toBe(true);
    expect(canCreateOnPage('admin', 'operations')).toBe(true);
    expect(canCreateOnPage('admin', 'system')).toBe(true);
    expect(canCreateOnPage('user', 'organization')).toBe(false);
    expect(canCreateOnPage('user', 'complaints')).toBe(true);
  });
});

describe('PlatformListPage', () => {
  it('loads API data and renders cards', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => [{ id: 7, title: 'Документ', filename: 'doc.txt' }]
    });

    render(
      <PlatformListPage
        title="Документи"
        description="Тестовий список"
        endpoint="/api/documents"
        icon="folder"
        renderItem={item => (
          <PlatformCard key={item.id} icon="description" title={item.title} meta={item.filename} />
        )}
      />
    );

    await waitFor(() => expect(screen.getByText('Документ')).toBeInTheDocument());
    expect(screen.getByText('doc.txt')).toBeInTheDocument();
  });
});
