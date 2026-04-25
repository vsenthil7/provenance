import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Footer } from './Footer';

describe('<Footer />', () => {
  it('renders the brand mark', () => {
    render(<Footer />);
    // Footer has the wordmark + the bottom tagline. Both should render.
    const matches = screen.getAllByText(/provenance/i);
    expect(matches.length).toBeGreaterThan(0);
  });

  it('renders the build column links', () => {
    render(<Footer />);
    expect(screen.getByText(/system status/i)).toBeInTheDocument();
    expect(screen.getByText(/source/i)).toBeInTheDocument();
    expect(screen.getByText(/what this is not/i)).toBeInTheDocument();
  });

  it('renders chain metadata', () => {
    render(<Footer />);
    expect(screen.getByText(/provenance-1 \(testnet\)/i)).toBeInTheDocument();
    expect(screen.getByText(/MiniMove/)).toBeInTheDocument();
    expect(screen.getByText(/InitiaScan/)).toBeInTheDocument();
  });

  it('renders the license summary', () => {
    render(<Footer />);
    expect(screen.getByText(/code: mit/i)).toBeInTheDocument();
    expect(screen.getByText(/docs: cc-by-sa/i)).toBeInTheDocument();
  });

  it('renders the honest-caveat tagline', () => {
    render(<Footer />);
    expect(screen.getByText(/six conditions stand between this and production/i)).toBeInTheDocument();
  });
});
