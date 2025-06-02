import { redirect } from "next/navigation";

function HomePage() {
  redirect("/app/transactions");
}

export default HomePage;
