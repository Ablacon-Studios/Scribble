/**
 * Tests for the SplashScreen component.
 */
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import SplashScreen from '../SplashScreen';

// Mocks — SplashScreen renders Navbar which uses useAuth and react-router-dom
const mockUseAuth = jest.fn();

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  Link: ({ children, to, ...props }) => (
    <a href={to} {...props}>{children}</a>
  ),
}));

describe('SplashScreen', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: null, logout: jest.fn() });
  });

  // -----------------------------------------------------------------------
  // Test 1: Renders Scribble title heading
  // -----------------------------------------------------------------------
  test('renders the Scribble title heading', () => {
    render(<SplashScreen />);

    const heading = screen.getByRole('heading', { name: /scribble/i });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent('Scribble');
  });

  // -----------------------------------------------------------------------
  // Test 2: Renders the logo SVG
  // -----------------------------------------------------------------------
  test('renders the Scribble logo SVG', () => {
    render(<SplashScreen />);

    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('viewBox', '0 0 64 64');
  });

  // -----------------------------------------------------------------------
  // Test 3: Renders Log in CTA button
  // -----------------------------------------------------------------------
  test('renders a Log in link pointing to /login', () => {
    render(<SplashScreen />);

    const loginLink = screen.getByText('Log in');
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute('href', '/login');
  });

  // -----------------------------------------------------------------------
  // Test 4: Renders Sign up CTA button
  // -----------------------------------------------------------------------
  test('renders a Sign up link pointing to /register', () => {
    render(<SplashScreen />);

    const signUpLink = screen.getByText('Sign up');
    expect(signUpLink).toBeInTheDocument();
    expect(signUpLink).toHaveAttribute('href', '/register');
  });

  // -----------------------------------------------------------------------
  // Test 5: Log in button has primary background styling
  // -----------------------------------------------------------------------
  test('Log in button has primary background styling', () => {
    render(<SplashScreen />);

    const loginLink = screen.getByText('Log in');
    expect(loginLink).toHaveClass('bg-scribble-primary');
    expect(loginLink).toHaveClass('text-white');
  });

  // -----------------------------------------------------------------------
  // Test 6: Accessibility — aria-label on the main container
  // -----------------------------------------------------------------------
  test('has aria-label on the main container', () => {
    render(<SplashScreen />);

    // The main content container has aria-label="Scribble home"
    const container = screen.getByLabelText('Scribble home');
    expect(container).toBeInTheDocument();
  });
});
