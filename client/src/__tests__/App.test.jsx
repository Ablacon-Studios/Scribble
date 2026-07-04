/**
 * Tests for the App root component.
 */
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import App from '../App';

test('App renders the SplashScreen component', () => {
  render(<App />);
  expect(screen.getByRole('status')).toBeInTheDocument();
});
