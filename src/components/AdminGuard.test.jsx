import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AdminGuard from './AdminGuard.jsx';

// Shared state so the hoisted mock always reads current test values
const mockState = {
  user: { id: 'user-1', email: 'admin@test.com' },
  profileRole: 'admin',
};

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockImplementation(() =>
        Promise.resolve({
          data: { user: mockState.user },
        })
      ),
    },
    from: vi.fn((table) => {
      if (table !== 'profiles') return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null }) }) }) };
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({
                data: mockState.profileRole ? { role: mockState.profileRole } : null,
                error: null,
              })
            ),
          })),
        })),
      };
    }),
  },
}));

function renderWithRouter(user, profileRole) {
  if (user !== undefined) mockState.user = user;
  if (profileRole !== undefined) mockState.profileRole = profileRole;

  return render(
    <MemoryRouter initialEntries={['/dashboard/admin']}>
      <Routes>
        <Route
          path="/dashboard/admin"
          element={
            <AdminGuard>
              <div>Admin Content</div>
            </AdminGuard>
          }
        />
        <Route path="/dashboard" element={<div>Dashboard</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('AdminGuard – permissions and edge cases', () => {
  beforeEach(() => {
    mockState.user = { id: 'user-1', email: 'admin@test.com' };
    mockState.profileRole = 'admin';
  });

  it('renders children when user is admin', async () => {
    renderWithRouter({ id: 'user-1', email: 'admin@test.com' }, 'admin');

    expect(
      await screen.findByText('Admin Content', {}, { timeout: 3000 })
    ).toBeInTheDocument();
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });

  it('shows Loading... while checking auth', () => {
    renderWithRouter();
    expect(screen.getByText(/Loading.../i)).toBeInTheDocument();
  });

  it('redirects to /dashboard when user is not logged in', async () => {
    renderWithRouter(null, 'admin');

    await waitFor(
      () => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });

  it('redirects to /dashboard when user is logged in but role is not admin', async () => {
    renderWithRouter({ id: 'user-1', email: 'u@test.com' }, 'user');

    await waitFor(
      () => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });
});
