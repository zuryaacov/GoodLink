import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Analytics from './Analytics.jsx';

// Mock supabase for Analytics page (no data, but no crash)
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-1', email: 'user@example.com' } },
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() =>
          Promise.resolve({
            data: [],
            error: null,
          })
        ),
      })),
    })),
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

