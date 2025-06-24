import TagsSection from "./(components)/tags-section";
import { Title } from "@/components/ui/typography";

export default function Page() {
  return (
    <div className="container max-w-2xl py-8 space-y-6">
      <Title>Tags</Title>
      <TagsSection />
    </div>
  );
}
