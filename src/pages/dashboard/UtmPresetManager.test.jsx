import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import UtmPresetManager from './UtmPresetManager.jsx';

// Toast mock
vi.mock('../../components/common/ToastProvider.jsx', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

// Configurable per test
const utmMockConfig = {
  planType: 'free',
  subscriptionStatus: 'active',
  presetsError: null,
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
            maybeSingle: vi.fn(() =>
              Promise.resolve({
                data: {
                  plan_type: utmMockConfig.planType,
                  subscription_status: utmMockConfig.subscriptionStatus,
                },
                error: null,
              })
            ),
          })),
        })),
      };
    }

    if (table === 'utm_presets') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() =>
              utmMockConfig.presetsError
                ? Promise.reject(utmMockConfig.presetsError)
                : Promise.resolve({
                    data: [],
                    error: null,
                  })
            ),
            order: vi.fn(() =>
              utmMockConfig.presetsError
                ? Promise.reject(utmMockConfig.presetsError)
                : Promise.resolve({
                    data: [],
                    error: null,
                  })
            ),
          })),
        })),
      };
    }

    if (table === 'links') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() =>
            Promise.resolve({
              data: [],
              error: null,
            })
          ),
        })),
      };
    }

    return {
      select: vi.fn(() => ({
        eq: vi.fn(() =>
          Promise.resolve({
            data: [],
            error: null,
          })
        ),
      })),
    };
  });

  return { supabase: { auth, from } };
});

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  utmMockConfig.planType = 'free';
  utmMockConfig.subscriptionStatus = 'active';
  utmMockConfig.presetsError = null;
});

function renderUtmPresetManager() {
  return render(
    <MemoryRouter initialEntries={['/dashboard/utm-presets']}>
      <Routes>
        <Route path="/dashboard/utm-presets" element={<UtmPresetManager />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('UtmPresetManager – smoke test', () => {
  it('renders main heading and paywall when on FREE plan', async () => {
    renderUtmPresetManager();

    expect(
      await screen.findByRole('heading', { name: /Unlock UTM Presets/i })
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/Upgrade/i, { exact: false }).length
    ).toBeGreaterThanOrEqual(1);
  });
});

describe('UtmPresetManager – edge cases and subscription states', () => {
  it('shows SubscriptionCancelledScreen when subscription_status is cancelled', async () => {
    utmMockConfig.planType = 'pro';
    utmMockConfig.subscriptionStatus = 'cancelled';

    renderUtmPresetManager();

    await screen.findByRole('heading', { name: /Subscription Cancelled/i });
    expect(
      screen.getByRole('button', { name: /Renew in Account Settings/i })
    ).toBeInTheDocument();
  });

  it('shows error modal when presets fetch fails', async () => {
    utmMockConfig.planType = 'pro';
    utmMockConfig.subscriptionStatus = 'active';
    utmMockConfig.presetsError = new Error('Network error');

    renderUtmPresetManager();

    await screen.findByText(/Failed to load UTM presets/i);
    expect(
      screen.getByText(/Failed to load UTM presets. Please try again./i)
    ).toBeInTheDocument();
  });
});

