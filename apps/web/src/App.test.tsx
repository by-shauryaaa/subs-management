import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import App from './App';

afterEach(cleanup);

test('opens the welcome screen with an accessible theme toggle', () => {
  render(<App />);

  expect(
    screen.getByRole('heading', {
      name: 'Welcome back.',
      level: 1,
    }),
  ).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Use light theme' })).toBeTruthy();
});
