import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { AuthPage } from './auth-pages';
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
test('signup rejects a password mismatch before contacting the API', async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  render(
    <MemoryRouter initialEntries={['/signup']}>
      <AuthPage />
    </MemoryRouter>,
  );
  fireEvent.change(screen.getByLabelText('Full name'), {
    target: { value: 'Test Customer' },
  });
  fireEvent.change(screen.getByLabelText('Email address'), {
    target: { value: 'test@example.com' },
  });
  fireEvent.change(screen.getByLabelText('Password', { exact: true }), {
    target: { value: 'Password@123' },
  });
  fireEvent.change(screen.getByLabelText('Confirm password'), {
    target: { value: 'Different@123' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
  expect(await screen.findByText('Passwords must match')).toBeTruthy();
  expect(fetchMock).not.toHaveBeenCalled();
});
test('forgot-password shows a generic confirmation regardless of account existence', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response('{}', { status: 200 })),
  );
  render(
    <MemoryRouter initialEntries={['/forgot-password']}>
      <AuthPage />
    </MemoryRouter>,
  );
  fireEvent.change(screen.getByLabelText('Email address'), {
    target: { value: 'test@example.com' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));
  expect(await screen.findByRole('status')).toHaveProperty(
    'textContent',
    'If an account exists, a reset link has been sent.',
  );
});
