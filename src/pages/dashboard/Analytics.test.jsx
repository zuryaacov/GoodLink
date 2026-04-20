import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Analytics from './Analytics.jsx';

// Mock supabase for Analytics page (no data, but no crash)
vi.mock('../../lib/supabase', () => ({
  // Minimal chainable query mock used by Analytics page
  // so tests don't fail with query-builder method errors.
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-1', email: 'user@example.com' } },
      }),
    },
    from: vi.fn(() => {
      const query = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        neq: vi.fn(() => query),
        or: vi.fn(() => query),
        order: vi.fn(() => query),
        range: vi.fn(() =>
          Promise.resolve({
            data: [],
            count: 0,
            error: null,
          })
        ),
        maybeSingle: vi.fn(() =>
          Promise.resolve({
            data: null,
            error: null,
          })
        ),
        then: (resolve) =>
          resolve({
            data: [],
            error: null,
            count: 0,
          }),
      };
      return query;
    }),
  },
}));

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});

function renderAnalytics() {
  return render(
    <MemoryRouter initialEntries={['/dashboard/analytics']}>
      <Routes>
        <Route path="/dashboard/analytics" element={<Analytics />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('Analytics page – smoke test', () => {
  it('renders Analytics heading and empty-state text without crashing', async () => {
    renderAnalytics();

    expect(
      await screen.findByText(/Analytics/i)
    ).toBeInTheDocument();

    // אינדיקציה ל-empty state – הטקסטים האמיתיים בעמוד
    expect(screen.getByText(/No geographic data yet/i)).toBeInTheDocument();
    expect(screen.getByText(/No traffic data yet/i)).toBeInTheDocument();
  });
});

