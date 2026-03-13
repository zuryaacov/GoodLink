import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SubscriptionCancelledScreen from './SubscriptionCancelledScreen.jsx';

describe('SubscriptionCancelledScreen', () => {
  it('renders title and Renew in Account Settings button', () => {
    render(
      <MemoryRouter>
        <SubscriptionCancelledScreen />
      </MemoryRouter>
    );

    expect(
      screen.getByRole('heading', { name: /Subscription Cancelled/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Renew in Account Settings/i })
    ).toBeInTheDocument();
  });

  it('shows message that data is saved and features are frozen', () => {
    render(
      <MemoryRouter>
        <SubscriptionCancelledScreen />
      </MemoryRouter>
    );

    expect(
      screen.getByText(/Your data is saved. Some features are temporarily frozen/i)
    ).toBeInTheDocument();
  });
});
