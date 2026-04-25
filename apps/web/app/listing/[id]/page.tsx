import { notFound } from 'next/navigation';
import { fetchListing } from '@/lib/api/listing';
import { ListingDetail } from '@/components/art/ListingDetail';
import { BuyPanel } from '@/components/art/BuyPanel';

export const dynamic = 'force-dynamic';

export default async function ListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const listing = await fetchListing(id);
  if (!listing) notFound();

  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
      <ListingDetail listing={listing} />
      <BuyPanel listing={listing} />
    </div>
  );
}
