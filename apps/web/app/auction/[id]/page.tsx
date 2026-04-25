import { notFound } from 'next/navigation';
import { fetchAuction } from '@/lib/api/auction';
import { AuctionDetail } from '@/components/art/AuctionDetail';
import { BidPanel } from '@/components/bid/BidPanel';

export const dynamic = 'force-dynamic';

export default async function AuctionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const auction = await fetchAuction(id);
  if (!auction) notFound();

  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
      <AuctionDetail auction={auction} />
      <BidPanel
        auctionObjectAddr={auction.object_addr}
        currentBidUinit={BigInt(auction.current_bid_uinit)}
        reserveUinit={BigInt(auction.reserve_uinit)}
        minIncrementBps={auction.min_increment_bps}
      />
    </div>
  );
}
