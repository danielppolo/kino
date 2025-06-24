import CategorySection from "./(components)/category-section";

import { Title } from "@/components/ui/typography";

export default async function Page() {
  return (
    <div className="container max-w-2xl py-8 space-y-6">
      <Title>Categories</Title>
      <CategorySection type="income" title="Income" />
      <CategorySection type="expense" title="Expense" />
    </div>
  );
}
