import CategorySection from "./(components)/category-section";

import "lucide-static/font/lucide.css";

export default async function Page() {
  return (
    <div className="w-full">
      <h1>Categories</h1>

      <CategorySection type="income" title="Income" />
      <CategorySection type="expense" title="Expense" />
    </div>
  );
}
