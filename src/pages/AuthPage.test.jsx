import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AuthPage from './AuthPage.jsx';

// Minimal supabase mock so AuthPage side-effects don't hit real network
vi.mock('../lib/supabase', () => {
  return {
    supabase: {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
        signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
        signInWithPassword: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        signUp: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        resetPasswordForEmail: vi.fn().mockResolvedValue({ data: {}, error: null }),
        updateUser: vi.fn().mockResolvedValue({ data: {}, error: null }),
      },
      from: vi.fn(() => {
        const chain = {
          select: vi.fn(() => chain),
          eq: vi.fn(() => chain),
          single: vi.fn().mockResolvedValue({ data: null }),
          update: vi.fn(() => chain),
        };
        return chain;
      }),
    },
  };
});

// Mock Turnstile + fetch for signup validations (so שלא נצא מהרשת)
beforeEach(() => {
  // window.scrollTo לא ממומש ב-jsdom
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

  // Turnstile גלובלית (signup)
  // eslint-disable-next-line no-undef
  window.turnstile = {
    render: vi.fn().mockReturnValue('widget-id'),
    reset: vi.fn(),
    remove: vi.fn(),
  };

  // mock fetch for Turnstile verification
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ success: true }),
  });
});

function renderAuth(initialPath = '/login') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<AuthPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('AuthPage (login & forgot-password views)', () => {
  it('renders the login view by default', async () => {
    renderAuth();

    // Heading and subtitle of the login view
    expect(await screen.findByText(/Welcome Back/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Log in to your GoodLink\.ai account/i)
    ).toBeInTheDocument();

    // Primary action button label
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
  });

  it('switches to the forgot-password view when clicking "Forgot\?"', async () => {
    renderAuth();

    const forgotButton = await screen.findByText(/Forgot\?/i);
    fireEvent.click(forgotButton);

    // Forgot-password view heading and helper text
    expect(await screen.findByText(/Reset Password/i)).toBeInTheDocument();
    expect(
      screen.getByText(/We'LL send you recovery instructions/i)
    ).toBeInTheDocument();

    // The submit button in forgot-password view
    expect(screen.getByRole('button', { name: /Send Link/i })).toBeInTheDocument();
  });

  it('shows validation error when trying to sign up with invalid email', async () => {
    renderAuth();

    // עבור ל-signup
    const createOneButton = await screen.findByRole('button', {
      name: /Create one for free/i,
    });
    fireEvent.click(createOneButton);

    // מלא שם מלא חוקי (מחכים ל-signup form אחרי מעבר view)
    fireEvent.change(await screen.findByPlaceholderText(/Your full name/i), {
      target: { value: 'John Doe' },
    });

    // מייל לא תקין
    fireEvent.change(screen.getByPlaceholderText('name@example.com'), {
      target: { value: 'bad-email' },
    });

    // סיסמה ו-confirm מספיק חזקות כדי שלא יפלו על סיסמה
    fireEvent.change(screen.getAllByPlaceholderText('••••••••')[0], {
      target: { value: 'ValidPass1' },
    });
    fireEvent.change(screen.getAllByPlaceholderText('••••••••')[1], {
      target: { value: 'ValidPass1' },
    });

    // סימולציה של Turnstile קיים (token)
    // eslint-disable-next-line no-undef
    Object.defineProperty(window, 'turnstile', {
      value: window.turnstile,
      writable: true,
    });

    // בכדי לעקוף disabled, נשים state token ישירות דרך data-attribute
    // בפועל, בגלל ה-mock, handleSubmit ייקרא ויפול על isValidEmail
    const submitBtn = screen.getByRole('button', { name: /Create Account/i });
    submitBtn.disabled = false;

    fireEvent.click(submitBtn);

    expect(
      await screen.findByText(
        'Please enter a valid email address (e.g. name@example.com)'
      )
    ).toBeInTheDocument();
  });

  it('shows validation error when password is too short on signup', async () => {
    renderAuth();

    const createOneButton = await screen.findByRole('button', {
      name: /Create one for free/i,
    });
    fireEvent.click(createOneButton);

    // שם ומייל תקינים (מחכים ל-signup form)
    fireEvent.change(await screen.findByPlaceholderText(/Your full name/i), {
      target: { value: 'John Doe' },
    });
    fireEvent.change(screen.getByPlaceholderText('name@example.com'), {
      target: { value: 'user@example.com' },
    });

    // סיסמה קצרה מדי
    fireEvent.change(screen.getAllByPlaceholderText('••••••••')[0], {
      target: { value: 'Aa1' },
    });
    fireEvent.change(screen.getAllByPlaceholderText('••••••••')[1], {
      target: { value: 'Aa1' },
    });

    const submitBtn = screen.getByRole('button', { name: /Create Account/i });
    submitBtn.disabled = false;

    fireEvent.click(submitBtn);

    expect(
      await screen.findByText('Password must be at least 8 characters long')
    ).toBeInTheDocument();
  });

  it('shows validation error when passwords do not match on signup', async () => {
    renderAuth();

    const createOneButton = await screen.findByRole('button', {
      name: /Create one for free/i,
    });
    fireEvent.click(createOneButton);

    // שם + מייל + סיסמה חזקה (מחכים ל-signup form)
    fireEvent.change(await screen.findByPlaceholderText(/Your full name/i), {
      target: { value: 'John Doe' },
    });
    fireEvent.change(screen.getByPlaceholderText('name@example.com'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getAllByPlaceholderText('••••••••')[0], {
      target: { value: 'ValidPass1' },
    });
    fireEvent.change(screen.getAllByPlaceholderText('••••••••')[1], {
      target: { value: 'OtherPass1' },
    });

    const submitBtn = screen.getByRole('button', { name: /Create Account/i });
    submitBtn.disabled = false;

    fireEvent.click(submitBtn);

    expect(
      await screen.findByText('Passwords do not match')
    ).toBeInTheDocument();
  });
});

