import { notFound } from 'next/navigation';
import { resolveAddress } from '@/lib/usernames';
import { fetchArtistCollections } from '@/lib/api/artist';
import { ArtistHeader } from '@/components/art/ArtistHeader';
import { CollectionGrid } from '@/components/art/CollectionGrid';

export const revalidate = 60;

export default async function ArtistPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const address = await resolveAddress(username);
  if (!address) notFound();
  const collections = await fetchArtistCollections(address);

  return (
    <div>
      <ArtistHeader address={address} username={username} />
      <section className="mt-12">
        <h2 className="font-display text-2xl text-ink">Collections</h2>
        <CollectionGrid collections={collections} />
      </section>
    </div>
  );
}
