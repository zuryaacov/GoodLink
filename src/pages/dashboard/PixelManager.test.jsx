import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PixelManager from './PixelManager.jsx';

// Simple toast mock
vi.mock('../../components/common/ToastProvider.jsx', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

// Configurable mock for plan and subscription status
const pixelMockConfig = {
  planType: 'pro',
  subscriptionStatus: 'active',
  pixelsError: null,
};

vi.mock('../../lib/supabase', () => {
  const auth = {
    getUser: vi.fn().mockResolvedValue({
      data: { user: { id: 'user-1', email: 'user@example.com' } },
    }),
  };

  const from = vi.fn((table) => {
    if (table === 'profiles') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({
                data: {
                  plan_type: pixelMockConfig.planType,
                  subscription_status: pixelMockConfig.subscriptionStatus,
                },
                error: null,
              })
            ),
          })),
        })),
      };
    }

    if (table === 'pixels') {
      return {
        select: () => ({
          eq: () => ({
            neq: () => ({
              order: () =>
                pixelMockConfig.pixelsError
                  ? Promise.reject(pixelMockConfig.pixelsError)
                  : Promise.resolve({
                      data: [],
                      error: null,
                    }),
            }),
          }),
        }),
      };
    }

    return {
      select: () => ({
        eq: () =>
          Promise.resolve({
            data: [],
            error: null,
          }),
      }),
    };
  });

  return { supabase: { auth, from } };
});

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  pixelMockConfig.planType = 'pro';
  pixelMockConfig.subscriptionStatus = 'active';
  pixelMockConfig.pixelsError = null;
});

function renderPixelManager() {
  return render(
    <MemoryRouter initialEntries={['/dashboard/pixels']}>
      <Routes>
        <Route path="/dashboard/pixels" element={<PixelManager />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('PixelManager – smoke test', () => {
  it('renders main heading and empty state when no pixels', async () => {
    renderPixelManager();

    expect(
      await screen.findByRole('heading', { name: /CAPI Manager/i })
    ).toBeInTheDocument();

    expect(
      screen.getByText(/No CAPI profiles yet/i)
    ).toBeInTheDocument();
  });
});

describe('PixelManager – edge cases and subscription states', () => {
  it('shows SubscriptionCancelledScreen when subscription_status is cancelled', async () => {
    pixelMockConfig.subscriptionStatus = 'cancelled';

    renderPixelManager();

    await screen.findByRole('heading', { name: /Subscription Cancelled/i });
    expect(
      screen.getByRole('button', { name: /Renew in Account Settings/i })
    ).toBeInTheDocument();
  });

  it('shows paywall when user is on FREE plan', async () => {
    pixelMockConfig.planType = 'free';
    pixelMockConfig.subscriptionStatus = 'active';

    renderPixelManager();

    await screen.findByText(/Unlock CAPI Manager/i);
    expect(screen.getByText(/Upgrade to/i)).toBeInTheDocument();
  });
});

