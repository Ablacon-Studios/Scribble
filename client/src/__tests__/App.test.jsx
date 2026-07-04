/**
 * Tests for the App root component.
 */
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../App';

test('App renders the SplashScreen heading', async () => {
  render(<App />);

  // The App bootstraps auth context (CSRF + session check) which is async.
  // Wait for the SplashScreen heading to appear once loading settles.
  await waitFor(() => {
    expect(screen.getByRole('heading', { name: /scribble/i })).toBeInTheDocument();
  });
});
