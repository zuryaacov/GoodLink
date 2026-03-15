import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AccountSettingsPage from './AccountSettingsPage.jsx';

// Configurable profile for subscription_status (free_trial, cancelled, active)
const settingsMockConfig = {
  subscriptionStatus: 'active',
};

vi.mock('../../lib/supabase', () => {
  const countChain = {
    select: vi.fn(function () {
      return this;
    }),
    eq: vi.fn(function () {
      return this;
    }),
    neq: vi.fn(() => Promise.resolve({ count: 0 })),
  };
  // yes
  return {
    supabase: {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'user@example.com' } },
        }),
        updateUser: vi.fn().mockResolvedValue({ data: {}, error: null }),
        updateUserById: vi.fn().mockResolvedValue({ data: {}, error: null }),
      },
      from: vi.fn((table) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() =>
                  Promise.resolve({
                    data: {
                      full_name: 'Test User',
                      plan_type: 'pro',
                      subscription_status: settingsMockConfig.subscriptionStatus,
                      timezone: 'UTC',
                    },
                    error: null,
                  })
                ),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null })),
            })),
          };
        }
        return countChain;
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
  settingsMockConfig.subscriptionStatus = 'active';
});

function renderAccountSettings() {
  return render(
    <MemoryRouter initialEntries={['/dashboard/settings']}>
      <Routes>
        <Route path="/dashboard/settings" element={<AccountSettingsPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('AccountSettingsPage basic rendering', () => {
  it('renders the Account Settings header and profile form once loading finishes', async () => {
    renderAccountSettings();

    expect(await screen.findByText(/Account Settings/i)).toBeInTheDocument();

    expect(screen.getByText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByText(/Email Address/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Subscription/i })).toBeInTheDocument();
    });
  });
});

describe('AccountSettingsPage – subscription states (free_trial, cancelled)', () => {
  it('when subscription_status is free_trial: hides pricing Plans section and Cancel subscription button', async () => {
    settingsMockConfig.subscriptionStatus = 'free_trial';
    renderAccountSettings();

    await screen.findByText(/Account Settings/i);
    await waitFor(() => {
      expect(screen.getByText(/Free Trial/i)).toBeInTheDocument();
    });

    // Pricing cards section is hidden for free_trial
    expect(screen.queryByRole('heading', { name: /^Plans$/i })).not.toBeInTheDocument();
    // Cancel subscription button is hidden when free_trial
    expect(screen.queryByText(/Cancel subscription/i)).not.toBeInTheDocument();
  });

  it('when subscription_status is cancelled: shows Cancelled badge and hides Cancel subscription button', async () => {
    settingsMockConfig.subscriptionStatus = 'cancelled';
    renderAccountSettings();

    await screen.findByText(/Account Settings/i);
    await waitFor(() => {
      expect(screen.getByText(/Cancelled/i)).toBeInTheDocument();
    });

    expect(screen.queryByText(/Cancel subscription/i)).not.toBeInTheDocument();
  });
});
