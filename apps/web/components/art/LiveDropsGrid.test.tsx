import { describe, expect, it } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/msw';
import { LiveDropsGrid } from './LiveDropsGrid';

const wrapper = (qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })) => {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
};

describe('<LiveDropsGrid />', () => {
  it('shows loading state initially', () => {
    server.use(http.post('*/api/graphql', async () => {
      await new Promise((r) => setTimeout(r, 100));
      return HttpResponse.json({ data: { liveDrops: [] } });
    }));
    render(<LiveDropsGrid />, { wrapper: wrapper() });
    expect(screen.getByTestId('drops-loading')).toBeInTheDocument();
  });

  it('shows empty state when no drops', async () => {
    server.use(http.post('*/api/graphql', () => HttpResponse.json({ data: { liveDrops: [] } })));
    render(<LiveDropsGrid />, { wrapper: wrapper() });
    await waitFor(() => expect(screen.getByTestId('drops-empty')).toBeInTheDocument());
  });

  it('shows error state on fetch failure', async () => {
    server.use(http.post('*/api/graphql', () => HttpResponse.json({}, { status: 500 })));
    render(<LiveDropsGrid />, { wrapper: wrapper() });
    await waitFor(() => expect(screen.getByTestId('drops-error')).toBeInTheDocument());
  });

  it('renders cards when drops returned', async () => {
    server.use(
      http.post('*/api/graphql', () =>
        HttpResponse.json({
          data: {
            liveDrops: [
              {
                id: 1,
                title: 'Test',
                artistAddress: 'init1lina000000000000000000000000000000lina',
                artistUsername: 'lina',
                imageUri: 'https://r2.example/x.png',
                priceUinit: '5000000',
                href: '/listing/1',
              },
            ],
          },
        }),
      ),
    );
    render(<LiveDropsGrid />, { wrapper: wrapper() });
    await waitFor(() => expect(screen.getByText('Test')).toBeInTheDocument());
    expect(screen.getByText('5 INIT')).toBeInTheDocument();
  });
});
