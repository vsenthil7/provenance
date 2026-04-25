import { notFound } from 'next/navigation';
import { fetchCollection, fetchCollectionArtworks } from '@/lib/api/collection';
import { CollectionHeader } from '@/components/art/CollectionHeader';
import { ArtworkGrid } from '@/components/art/ArtworkGrid';

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const collection = await fetchCollection(id);
  if (!collection) notFound();

  const artworks = await fetchCollectionArtworks(id);

  return (
    <div>
      <CollectionHeader collection={collection} />
      <section className="mt-12">
        <ArtworkGrid artworks={artworks} />
      </section>
    </div>
  );
}
