import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Header } from './Header';

vi.mock('@initia/interwovenkit-react', () => ({
  useInterwovenKit: () => ({
    initiaAddress: undefined,
    username: undefined,
    openConnect: vi.fn(),
    openProfile: vi.fn(),
    openBridge: vi.fn(),
  }),
}));

describe('<Header />', () => {
  it('renders the brand link', () => {
    render(<Header />);
    expect(screen.getByText('Provenance')).toBeInTheDocument();
  });

  it('renders the primary nav links', () => {
    render(<Header />);
    expect(screen.getByText(/discover/i)).toBeInTheDocument();
    expect(screen.getByText(/create/i)).toBeInTheDocument();
    expect(screen.getByText(/portfolio/i)).toBeInTheDocument();
    expect(screen.getByText(/sessions/i)).toBeInTheDocument();
  });

  it('renders Connect and Add funds buttons', () => {
    render(<Header />);
    expect(screen.getByRole('button', { name: /connect wallet/i })).toBeInTheDocument();
    expect(screen.getByTestId('add-funds')).toBeInTheDocument();
  });
});
