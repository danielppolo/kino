import CategorySection from "./(components)/category-section";

import { listCategories } from "@/utils/supabase/queries";
import { createClient } from "@/utils/supabase/server";
import { Category } from "@/utils/supabase/types";

export default async function Page() {
  const supabase = createClient();

  const { data, error } = await listCategories(supabase);

  if (error) {
    throw error;
  }

  const [incomeCategories, expenseCategories] = data.reduce<
    [Category[], Category[]]
  >(
    ([income, expense], category) => {
      if (category.type === "income") {
        income.push(category);
      } else if (category.type === "expense") {
        expense.push(category);
      }
      return [income, expense];
    },
    [[], []],
  );

  return (
    <div className="w-full">
      <h1>Categories</h1>

      <CategorySection data={incomeCategories} type="income" title="Income" />
      <CategorySection
        data={expenseCategories}
        type="expense"
        title="Expense"
      />
    </div>
  );
}
