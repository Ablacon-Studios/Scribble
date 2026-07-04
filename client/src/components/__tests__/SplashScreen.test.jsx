/**
 * Tests for the SplashScreen component.
 */
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import SplashScreen from '../SplashScreen';

describe('SplashScreen', () => {
  // -----------------------------------------------------------------------
  // Test 1: Renders Scribble title heading
  // -----------------------------------------------------------------------
  test('renders the Scribble title heading', () => {
    render(<SplashScreen />);

    const heading = screen.getByRole('heading', { name: /scribble/i });
    expect(heading).toBeInTheDocument();
    // The heading text is "Scribble" (uppercase via Tailwind CSS class)
    expect(heading).toHaveTextContent('Scribble');
  });

  // -----------------------------------------------------------------------
  // Test 2: Renders 4 loading dots
  // -----------------------------------------------------------------------
  test('renders 4 animated loading dots', () => {
    render(<SplashScreen />);

    // The dots are in a container with aria-hidden="true"
    // Each dot is a <span> with rounded-full and bg-scribble-primary classes
    const dots = screen.getAllByText('', { selector: 'span.rounded-full' });
    expect(dots).toHaveLength(4);

    // Verify each dot has the animation class
    dots.forEach((dot) => {
      expect(dot).toHaveClass('rounded-full');
      expect(dot).toHaveClass('bg-scribble-primary');
    });
  });

  // -----------------------------------------------------------------------
  // Test 3: Displays optional message prop
  // -----------------------------------------------------------------------
  test('displays message when message prop is provided', () => {
    const testMessage = 'Connecting to server...';
    render(<SplashScreen message={testMessage} />);

    const messageElement = screen.getByText(testMessage);
    expect(messageElement).toBeInTheDocument();
    // The message should use the muted color class
    expect(messageElement).toHaveClass('text-scribble-muted');
  });

  test('does not display message area when no message prop', () => {
    render(<SplashScreen />);

    // The only <p> elements should not exist or should be empty
    const paragraphs = screen.queryAllByRole('paragraph');
    // With no message prop, there should be no visible <p> element
    // (the "Loading Scribble..." text is in a sr-only span, not a paragraph)
    expect(
      paragraphs.filter((p) => !p.className.includes('sr-only'))
    ).toHaveLength(0);
  });

  // -----------------------------------------------------------------------
  // Test 4: Accessibility attributes
  // -----------------------------------------------------------------------
  test('has accessibility attributes — role status and aria-label', () => {
    render(<SplashScreen />);

    // The main container should have role="status"
    const container = screen.getByRole('status');
    expect(container).toBeInTheDocument();

    // It should have aria-label="Loading Scribble"
    expect(container).toHaveAttribute('aria-label', 'Loading Scribble');
  });

  // -----------------------------------------------------------------------
  // Test 5: Screen-reader-only text
  // -----------------------------------------------------------------------
  test('contains visually hidden loading text for screen readers', () => {
    render(<SplashScreen />);

    // The sr-only span should contain "Loading Scribble..."
    const srText = screen.getByText('Loading Scribble...');
    expect(srText).toBeInTheDocument();
    // The sr-only class makes it visually hidden but available to screen readers
    expect(srText).toHaveClass('sr-only');
  });
});
