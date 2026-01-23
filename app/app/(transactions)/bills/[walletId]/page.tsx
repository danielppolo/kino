import BillsList from "@/components/shared/bills-list";

interface PageParams {
  params: Promise<{ walletId: string }>;
}

export const dynamic = "force-dynamic";

export default async function BillsPage({ params }: PageParams) {
  const { walletId } = await params;

  return <BillsList walletId={walletId} />;
}

