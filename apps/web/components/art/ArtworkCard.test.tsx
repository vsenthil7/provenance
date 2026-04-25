import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ArtworkCard } from './ArtworkCard';

describe('<ArtworkCard />', () => {
  const baseDrop = {
    id: 1,
    title: 'Quiet Series #1',
    artistAddress: 'init1lina000000000000000000000000000000lina',
    artistUsername: 'lina',
    imageUri: 'https://r2.example/art.png',
    priceUinit: '12000000',
    href: '/listing/1',
  };

  it('renders title and price', () => {
    render(<ArtworkCard drop={baseDrop} />);
    expect(screen.getByText('Quiet Series #1')).toBeInTheDocument();
    expect(screen.getByText('12 INIT')).toBeInTheDocument();
  });

  it('renders username when present', () => {
    render(<ArtworkCard drop={baseDrop} />);
    expect(screen.getByText('lina')).toBeInTheDocument();
  });

  it('falls back to shortened address when username null', () => {
    render(<ArtworkCard drop={{ ...baseDrop, artistUsername: null }} />);
    expect(screen.getByText('init1lin…lina')).toBeInTheDocument();
  });

  it('links to the listing href', () => {
    render(<ArtworkCard drop={baseDrop} />);
    expect(screen.getByTestId('artwork-card-1')).toHaveAttribute('href', '/listing/1');
  });

  it('renders the image with alt text and lazy loading', () => {
    render(<ArtworkCard drop={baseDrop} />);
    const img = screen.getByAltText('Quiet Series #1') as HTMLImageElement;
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img.src).toBe('https://r2.example/art.png');
  });
});
