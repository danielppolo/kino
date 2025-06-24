import LabelSection from "./(components)/labels-section";
import { Title } from "@/components/ui/typography";

export default async function Page() {
  return (
    <div className="container max-w-2xl py-8 space-y-6">
      <Title>Labels</Title>
      <LabelSection />
    </div>
  );
}
