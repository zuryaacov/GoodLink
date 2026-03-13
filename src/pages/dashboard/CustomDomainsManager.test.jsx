import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import CustomDomainsManager from './CustomDomainsManager.jsx';

vi.mock('../../components/common/ToastProvider.jsx', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

// Configurable per test: set before render
const mockConfig = {
  planType: 'pro',
  subscriptionStatus: 'active',
  domains: [],
  profileError: null,
};

vi.mock('../../lib/supabase', () => ({
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
              single: vi.fn(() =>
                mockConfig.profileError
                  ? Promise.resolve({ data: null, error: mockConfig.profileError })
                  : Promise.resolve({
                      data: {
                        plan_type: mockConfig.planType,
                        subscription_status: mockConfig.subscriptionStatus,
                      },
                      error: null,
                    })
              ),
            })),
          })),
        };
      }
      if (table === 'custom_domains') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              neq: vi.fn(() => ({
                order: vi.fn(() =>
                  Promise.resolve({
                    data: mockConfig.domains,
                    error: null,
                  })
                ),
              })),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() =>
              Promise.resolve({
                data: null,
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
    }),
  },
}));

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  mockConfig.planType = 'pro';
  mockConfig.subscriptionStatus = 'active';
  mockConfig.domains = [];
  mockConfig.profileError = null;
});

function renderCustomDomains() {
  return render(
    <MemoryRouter initialEntries={['/dashboard/domains']}>
      <Routes>
        <Route path="/dashboard/domains" element={<CustomDomainsManager />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('CustomDomainsManager – basic states and actions', () => {
  it('shows empty state and New Domain button when there are no custom domains', async () => {
    renderCustomDomains();

    await screen.findByRole('heading', { name: /Custom Domains/i });

    expect(
      screen.getByText(/No custom domains yet/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /New Domain/i })
    ).toBeInTheDocument();
  });

  it('shows paywall when user is on FREE plan', async () => {
    mockConfig.planType = 'free';
    mockConfig.subscriptionStatus = 'active';
    mockConfig.domains = [];

    renderCustomDomains();

    await screen.findByRole('heading', { name: /Unlock Custom Domains/i });
    expect(
      screen.getAllByText(/ADVANCED/i).length
    ).toBeGreaterThanOrEqual(1);
  });

  it('renders existing domains and allows opening the actions menu', async () => {
    mockConfig.domains = [
      {
        id: 'dom-1',
        domain: 'go.mybrand.com',
        status: 'active',
        root_redirect: 'mybrand.com',
      },
    ];

    renderCustomDomains();

    await screen.findByText('go.mybrand.com');

    const menuButton = screen.getByRole('button', { name: /Actions menu/i });
    fireEvent.click(menuButton);

    await waitFor(() => {
      expect(screen.getByText(/Edit Root/i)).toBeInTheDocument();
      expect(screen.getByText(/Details/i)).toBeInTheDocument();
    });
    expect(screen.getAllByText(/Delete/i).length).toBeGreaterThanOrEqual(1);
  });
});

describe('CustomDomainsManager – edge cases and subscription states', () => {
  it('shows SubscriptionCancelledScreen when subscription_status is cancelled', async () => {
    mockConfig.planType = 'pro';
    mockConfig.subscriptionStatus = 'cancelled';
    mockConfig.domains = [];

    renderCustomDomains();

    await screen.findByRole('heading', { name: /Subscription Cancelled/i });
    expect(
      screen.getByRole('button', { name: /Renew in Account Settings/i })
    ).toBeInTheDocument();
  });

  it('on profile fetch error (fail open), still shows main UI or empty state', async () => {
    mockConfig.profileError = { message: 'Profile not found' };
    mockConfig.domains = [];

    renderCustomDomains();

    await waitFor(
      () => {
        expect(
          screen.getByRole('heading', { name: /Custom Domains/i })
        ).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
    expect(screen.getByText(/No custom domains yet/i)).toBeInTheDocument();
  });
});
