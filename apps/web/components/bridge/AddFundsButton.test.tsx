import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AddFundsButton, BridgeToBuyButton } from './AddFundsButton';

const openBridge = vi.fn();
vi.mock('@initia/interwovenkit-react', () => ({
  useInterwovenKit: () => ({ openBridge }),
}));

beforeEach(() => openBridge.mockClear());

describe('<AddFundsButton />', () => {
  it('renders and calls openBridge with destChainId', () => {
    render(<AddFundsButton />);
    fireEvent.click(screen.getByTestId('add-funds'));
    expect(openBridge).toHaveBeenCalledWith({ destChainId: 'provenance-1' });
  });
});

describe('<BridgeToBuyButton />', () => {
  it('passes destAmount and destDenom in correct shape', () => {
    render(<BridgeToBuyButton destAmountUinit={5_000_000n} />);
    fireEvent.click(screen.getByTestId('bridge-to-buy'));
    expect(openBridge).toHaveBeenCalledWith({
      destChainId: 'provenance-1',
      destAmount: '5000000',
      destDenom: 'uinit',
    });
  });
});
