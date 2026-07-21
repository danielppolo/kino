import Container from "@/components/shared/container";
import { OntologyAssociationInput } from "@/components/shared/ontology-association-input";
import PageHeader from "@/components/shared/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function OntologyAssociationsPage() {
  return (
    <Container className="max-w-3xl space-y-6">
      <PageHeader>
        <div className="space-y-1">
          <h1 className="font-semibold tracking-tight">
            Ontology associations
          </h1>
          <p className="text-muted-foreground text-sm">
            Add context to a note by linking people and places.
          </p>
        </div>
      </PageHeader>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Note context</CardTitle>
          <CardDescription>
            Type <span className="font-medium text-foreground">@</span> to
            find a person or place.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OntologyAssociationInput />
        </CardContent>
      </Card>
    </Container>
  );
}
