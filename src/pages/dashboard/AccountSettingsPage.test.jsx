import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AccountSettingsPage from './AccountSettingsPage.jsx';

// Configurable profile for subscription_status (free_trial, cancelled, active)
const settingsMockConfig = {
  subscriptionStatus: 'active',
  subscriptionData: {
    data: {
      attributes: {
        urls: {
          customer_portal_update_subscription: 'https://portal.lemonsqueezy.com/subscription/update',
        },
      },
    },
  },
};
const profileUpdateMock = vi.fn(() => ({
  eq: vi.fn(() => Promise.resolve({ error: null })),
}));

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
                      lemon_squeezy_customer_portal_url: 'https://portal.lemonsqueezy.com/billing',
                      lemon_squeezy_subscription_data: settingsMockConfig.subscriptionData,
                      timezone: 'UTC',
                    },
                    error: null,
                  })
                ),
              })),
            })),
            update: profileUpdateMock,
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
  settingsMockConfig.subscriptionData = {
    data: {
      attributes: {
        urls: {
          customer_portal_update_subscription: 'https://portal.lemonsqueezy.com/subscription/update',
        },
      },
    },
  };
  profileUpdateMock.mockClear();
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

describe('AccountSettingsPage ג€“ subscription states (free_trial, cancelled)', () => {
  it('when subscription_status is free_trial: shows pricing Plans section, marks PRO as recommended, and hides Cancel subscription button', async () => {
    settingsMockConfig.subscriptionStatus = 'free_trial';
    renderAccountSettings();

    await screen.findByText(/Account Settings/i);
    await waitFor(() => {
      expect(screen.getByText(/Free Trial/i)).toBeInTheDocument();
    });

    // Pricing cards section is shown for free_trial
    expect(screen.getByRole('heading', { name: /^Plans$/i })).toBeInTheDocument();
    expect(screen.getByText(/Recommended/i)).toBeInTheDocument();
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

describe('AccountSettingsPage ג€“ cancel flow', () => {
  it('opens Lemon Squeezy portal without updating subscription status locally', async () => {
    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    renderAccountSettings();

    const cancelSubscriptionButton = await screen.findByRole('button', {
      name: /Cancel subscription/i,
    });

    fireEvent.click(cancelSubscriptionButton);

    const confirmButton = await screen.findByRole('button', { name: /^Confirm$/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(windowOpenSpy).toHaveBeenCalledWith(
        'https://portal.lemonsqueezy.com/billing',
        '_blank',
        'noopener,noreferrer'
      );
    });

    expect(profileUpdateMock).not.toHaveBeenCalled();
    windowOpenSpy.mockRestore();
  });
});

describe('AccountSettingsPage ג€“ plan change flow', () => {
  it('opens customer_portal_update_subscription URL for users with active paid subscription', async () => {
    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    renderAccountSettings();

    const switchPlanButton = await screen.findByRole('button', {
      name: /Switch to this plan ג€” STARTER plan/i,
    });
    fireEvent.click(switchPlanButton);

    await waitFor(() => {
      expect(windowOpenSpy).toHaveBeenCalledWith(
        'https://portal.lemonsqueezy.com/subscription/update',
        '_blank',
        'noopener,noreferrer'
      );
    });

    windowOpenSpy.mockRestore();
  });

  it('opens fresh checkout URL when lemon_squeezy_subscription_data is empty', async () => {
    settingsMockConfig.subscriptionData = null;
    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    renderAccountSettings();

    const switchPlanButton = await screen.findByRole('button', {
      name: /Switch to this plan ג€” STARTER plan/i,
    });
    fireEvent.click(switchPlanButton);

    await waitFor(() => {
      expect(windowOpenSpy).toHaveBeenCalledWith(
        'https://goodlink.lemonsqueezy.com/checkout/buy/315d0e60-5a87-44f0-90c7-7f7789aa85a0?checkout[email]=user%40example.com&checkout[custom][user_id]=user-1&embed=1',
        '_blank',
        'noopener,noreferrer'
      );
    });

    windowOpenSpy.mockRestore();
  });
});

