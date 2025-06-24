import { Title } from "@/components/ui/typography";

export default async function Page() {
  return (
    <div className="container max-w-2xl py-8 space-y-6">
      <Title>Settings</Title>
      <p className="text-sm text-muted-foreground">Select an option from the sidebar.</p>
    </div>
  );
}
