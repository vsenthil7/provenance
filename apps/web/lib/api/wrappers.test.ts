import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGql = vi.fn();
vi.mock('./client', () => ({
  gql: mockGql,
  GraphQLError: class extends Error {},
}));

beforeEach(() => mockGql.mockReset());

describe('api wrappers', () => {
  it('fetchArtistCollections returns items', async () => {
    const { fetchArtistCollections } = await import('./artist');
    mockGql.mockResolvedValueOnce({ collections: { items: [{ id: '1' }] } });
    const r = await fetchArtistCollections('init1a');
    expect(r).toEqual([{ id: '1' }]);
    expect(mockGql).toHaveBeenCalledWith(expect.any(String), { artist: 'init1a' });
  });

  it('fetchAuction returns the auction or null', async () => {
    const { fetchAuction } = await import('./auction');
    mockGql.mockResolvedValueOnce({ auction: { id: '7' } });
    expect(await fetchAuction('7')).toEqual({ id: '7' });
    mockGql.mockResolvedValueOnce({ auction: null });
    expect(await fetchAuction('99')).toBeNull();
  });

  it('fetchListing returns the listing or null', async () => {
    const { fetchListing } = await import('./listing');
    mockGql.mockResolvedValueOnce({ listing: { id: '1' } });
    expect(await fetchListing('1')).toEqual({ id: '1' });
    mockGql.mockResolvedValueOnce({ listing: null });
    expect(await fetchListing('99')).toBeNull();
  });

  it('fetchCollection returns the collection or null', async () => {
    const { fetchCollection } = await import('./collection');
    mockGql.mockResolvedValueOnce({ collection: { id: '1' } });
    expect(await fetchCollection('1')).toEqual({ id: '1' });
    mockGql.mockResolvedValueOnce({ collection: null });
    expect(await fetchCollection('99')).toBeNull();
  });

  it('fetchCollectionArtworks returns items', async () => {
    const { fetchCollectionArtworks } = await import('./collection');
    mockGql.mockResolvedValueOnce({ artworks: { items: [{ id: '1' }, { id: '2' }] } });
    const r = await fetchCollectionArtworks('1');
    expect(r.length).toBe(2);
  });

  it('fetchOwnedArtworks returns items', async () => {
    const { fetchOwnedArtworks } = await import('./portfolio');
    mockGql.mockResolvedValueOnce({ artworks: { items: [{ id: '1' }] } });
    expect(await fetchOwnedArtworks('init1c')).toEqual([{ id: '1' }]);
  });

  it('fetchArtwork returns the artwork or null', async () => {
    const { fetchArtwork } = await import('./artwork');
    mockGql.mockResolvedValueOnce({ artwork: { id: '1', transfers: [] } });
    expect(await fetchArtwork('1')).toMatchObject({ id: '1' });
    mockGql.mockResolvedValueOnce({ artwork: null });
    expect(await fetchArtwork('99')).toBeNull();
  });
});
