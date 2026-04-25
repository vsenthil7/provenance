import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/msw';
import { SequencerBanner } from './SequencerBanner';
import { useHealth } from '@/lib/health';

beforeEach(() => {
  useHealth.setState({
    chainHealthy: true,
    lastBlockHeight: 0,
    lastCheckedAt: 0,
    unhealthySinceMs: null,
  });
});

describe('<SequencerBanner />', () => {
  it('renders nothing when chain healthy', async () => {
    server.use(
      http.get('*/status', () =>
        HttpResponse.json({
          result: { sync_info: { latest_block_height: '99', catching_up: false } },
        }),
      ),
    );
    render(<SequencerBanner />);
    expect(screen.queryByTestId('sequencer-banner')).toBeNull();
  });

  it('renders banner once unhealthy state has been observed for >60s', async () => {
    // Simulate unhealthy state already past the 60s grace period
    useHealth.setState({
      chainHealthy: false,
      lastBlockHeight: 0,
      lastCheckedAt: 0,
      unhealthySinceMs: Date.now() - 120_000,
    });
    server.use(http.get('*/status', () => HttpResponse.error()));
    render(<SequencerBanner />);
    expect(await screen.findByTestId('sequencer-banner')).toBeInTheDocument();
  });

  it('cleans up interval on unmount', () => {
    const clearSpy = vi.spyOn(global, 'clearInterval');
    const { unmount } = render(<SequencerBanner />);
    unmount();
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });
});
