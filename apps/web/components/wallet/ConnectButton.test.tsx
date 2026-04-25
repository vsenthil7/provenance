import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConnectButton } from './ConnectButton';

const openConnect = vi.fn();
const openProfile = vi.fn();
let mockState: any = {};

vi.mock('@initia/interwovenkit-react', () => ({
  useInterwovenKit: () => mockState,
}));

beforeEach(() => {
  openConnect.mockClear();
  openProfile.mockClear();
});

describe('<ConnectButton />', () => {
  it('renders Connect when disconnected', () => {
    mockState = { initiaAddress: undefined, username: undefined, openConnect, openProfile };
    render(<ConnectButton />);
    expect(screen.getByRole('button', { name: /connect wallet/i })).toBeInTheDocument();
  });

  it('calls openConnect when clicked while disconnected', () => {
    mockState = { initiaAddress: undefined, username: undefined, openConnect, openProfile };
    render(<ConnectButton />);
    fireEvent.click(screen.getByRole('button'));
    expect(openConnect).toHaveBeenCalledOnce();
  });

  it('renders username.init when connected and username is set', () => {
    mockState = {
      initiaAddress: 'init1lina000000000000000000000000000000lina',
      username: 'lina',
      openConnect,
      openProfile,
    };
    render(<ConnectButton />);
    expect(screen.getByText('lina.init')).toBeInTheDocument();
  });

  it('renders shortened address when no username', () => {
    mockState = {
      initiaAddress: 'init1lina000000000000000000000000000000lina',
      username: null,
      openConnect,
      openProfile,
    };
    render(<ConnectButton />);
    expect(screen.getByText('init1lin…lina')).toBeInTheDocument();
  });

  it('opens profile when connected button clicked', () => {
    mockState = {
      initiaAddress: 'init1lina000000000000000000000000000000lina',
      username: 'lina',
      openConnect,
      openProfile,
    };
    render(<ConnectButton />);
    fireEvent.click(screen.getByTestId('connected-button'));
    expect(openProfile).toHaveBeenCalledOnce();
  });
});
