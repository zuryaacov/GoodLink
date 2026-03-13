import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import DashboardOverview from './DashboardOverview.jsx';

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});

function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/dashboard" element={<DashboardOverview />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('DashboardOverview – smoke test', () => {
  it('renders main heading and top-performing links table', () => {
    renderDashboard();

    expect(
      screen.getByRole('heading', { name: /Dashboard/i })
    ).toBeInTheDocument();

    expect(
      screen.getByRole('heading', { name: /Top Performing Links/i })
    ).toBeInTheDocument();

    expect(
      screen.getByText(/Total Clicks/i)
    ).toBeInTheDocument();
  });
});

