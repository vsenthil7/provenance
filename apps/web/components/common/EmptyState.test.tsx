import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders title only', () => {
    render(<EmptyState title="Nothing here" />);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });

  it('renders body when provided', () => {
    render(<EmptyState title="Nothing" body="No items yet." />);
    expect(screen.getByText('No items yet.')).toBeInTheDocument();
  });

  it('renders CTA when both label and href provided', () => {
    render(<EmptyState title="X" ctaLabel="Browse" ctaHref="/browse" />);
    const link = screen.getByRole('link', { name: 'Browse' });
    expect(link).toHaveAttribute('href', '/browse');
  });

  it('omits CTA when only label provided', () => {
    render(<EmptyState title="X" ctaLabel="Browse" />);
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('omits CTA when only href provided', () => {
    render(<EmptyState title="X" ctaHref="/x" />);
    expect(screen.queryByRole('link')).toBeNull();
  });
});
