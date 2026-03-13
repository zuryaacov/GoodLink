import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import LinkBuilderPage from './LinkBuilderPage.jsx';

// Mock supabase used by LinkBuilderPage and LinkWizardOnePerPage
vi.mock('../../lib/supabase', () => {
  return {
    supabase: {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'user@example.com' } },
        }),
      },
      from: vi.fn((table) => {
        // For duplicate name check (checkName), chain: select->eq->ilike->neq->[neq?]->limit(1)
        if (table === 'links') {
          const limitRes = () => Promise.resolve({ data: [], error: null });
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                ilike: vi.fn(() => ({
                  neq: vi.fn(() => ({
                    neq: vi.fn(() => ({ limit: vi.fn(limitRes) })),
                    limit: vi.fn(limitRes),
                  })),
                })),
              })),
            })),
          };
        }

        // For profiles (fetchPlanType): select->eq->single(); for pixels: select->eq->eq->order()
        const emptyResult = { data: [], error: null };
        const chain = {
          eq: vi.fn(() => chain),
          in: vi.fn(() => Promise.resolve(emptyResult)),
          neq: vi.fn(() => chain),
          order: vi.fn(() => Promise.resolve(emptyResult)),
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        };
        return {
          select: vi.fn(() => chain),
        };
      }),
    },
  };
});

// Mock url safety & validation libs used via LinkWizardOnePerPage
vi.mock('../../lib/urlValidation', () => ({
  validateUrl: (url) => {
    if (!url || url.startsWith('bad://')) {
      return { isValid: false, error: 'Invalid domain' };
    }
    return { isValid: true, normalizedUrl: url.startsWith('http') ? url : `https://${url}` };
  },
}));

vi.mock('../../lib/urlSafetyCheck', () => ({
  checkUrlSafety: vi.fn(async () => ({ isSafe: true, error: null })),
}));

// Mock slug validation to always accept
vi.mock('../../lib/slugValidation', () => ({
  validateSlugFormat: (slug) => {
    if (!slug || slug.includes(' ')) {
      return { isValid: false, error: 'Slug cannot be empty' };
    }
    return { isValid: true, normalizedSlug: slug.toLowerCase() };
  },
  checkSlugAvailability: vi.fn(async () => ({ isAvailable: true })),
}));

// Avoid touching real Redis
vi.mock('../../lib/redisCache', () => ({
  updateLinkInRedis: vi.fn(),
}));

beforeEach(() => {
  // Silence scrollTo in jsdom
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});

function renderLinkBuilder(initialPath = '/dashboard/links/new') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/dashboard/links/new" element={<LinkBuilderPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('LinkBuilderPage – basic link creation validation', () => {
  it('shows error when trying to save link without target URL', async () => {
    renderLinkBuilder();

    // שלב 0: Name your Link
    await screen.findByText(/What should we call your link/i);
    const step0NameInput = screen.getByPlaceholderText(/Black Friday Promo/i);
    fireEvent.change(step0NameInput, { target: { value: 'My First Link' } });
    fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));

    // שלב 1: Target URL – מחכים לשדה ה-URL (ייתכן עיכוב בגלל fetch)
    await screen.findByPlaceholderText('https://...', {}, { timeout: 5000 });
    fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));

    // validation – הודעת שגיאה על URL חסר
    await waitFor(() => {
      expect(
        screen.getByText(/Target URL is required|Please enter a destination URL|destination URL/i)
      ).toBeInTheDocument();
    });
  });

  it('creates link data when required fields are valid (happy path, high level)', async () => {
    renderLinkBuilder();

    // שלב 0: Name your Link
    await screen.findByText(/What should we call your link/i);
    fireEvent.change(screen.getByPlaceholderText(/Black Friday Promo/i), {
      target: { value: 'My Campaign Link' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));

    // שלב 1: Target URL
    const urlInput = await screen.findByPlaceholderText('https://...', {}, { timeout: 5000 });
    fireEvent.change(urlInput, { target: { value: 'https://example.com' } });

    fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));

    // וידוא שלא נתקענו על validation
    await waitFor(() => {
      expect(screen.queryByText(/Please enter a destination URL/i)).toBeNull();
      expect(screen.queryByText(/Please enter a name for your link/i)).toBeNull();
    });
  });
});

