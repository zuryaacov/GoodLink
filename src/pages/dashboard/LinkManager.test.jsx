import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import LinkManager from './LinkManager.jsx';

// Configurable profile for subscription_status (e.g. cancelled)
const linkManagerMockConfig = {
  subscriptionStatus: 'active',
};

vi.mock('../../lib/supabase', () => {
  return {
    supabase: {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'user@example.com' } },
        }),
      },
      from: vi.fn((table) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockImplementation(() =>
                  Promise.resolve({
                    data: {
                      id: 'user-1',
                      plan_type: 'pro',
                      subscription_status: linkManagerMockConfig.subscriptionStatus,
                    },
                    error: null,
                  })
                ),
              })),
            })),
          };
        }

        // links, link_spaces, and other tables → just return empty data without errors
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              neq: vi.fn(() =>
                Promise.resolve({
                  data: [],
                  error: null,
                })
              ),
              order: vi.fn(() =>
                Promise.resolve({
                  data: [],
                  error: null,
                })
              ),
            })),
          })),
        };
      }),
    },
  };
});

vi.mock('../../components/common/ToastProvider.jsx', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

beforeEach(() => {
  linkManagerMockConfig.subscriptionStatus = 'active';
});

function renderLinkManager(initialPath = '/dashboard/links') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/dashboard/links" element={<LinkManager />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('LinkManager header behavior', () => {
  it('shows "Workspaces" title with a Home button at root when folders are enabled', async () => {
    renderLinkManager();

    const title = await screen.findByRole('heading', { name: /Workspaces/i });
    expect(title).toBeInTheDocument();

    const homeButtons = screen.getAllByRole('button', { name: /Home/i });
    expect(homeButtons.length).toBeGreaterThanOrEqual(1);
  });
});

describe('LinkManager – subscription states', () => {
  it('shows SubscriptionCancelledScreen when subscription_status is cancelled', async () => {
    linkManagerMockConfig.subscriptionStatus = 'cancelled';

    renderLinkManager();

    await screen.findByRole('heading', { name: /Subscription Cancelled/i });
    expect(
      screen.getByRole('button', { name: /Renew in Account Settings/i })
    ).toBeInTheDocument();
  });
});

