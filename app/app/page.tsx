import { redirect } from "next/navigation";

function HomePage() {
  redirect("/app/wallets");
}

export default HomePage;
