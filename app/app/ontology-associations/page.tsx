import Container from "@/components/shared/container";
import { OntologyAssociationInput } from "@/components/shared/ontology-association-input";
import PageHeader from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function OntologyAssociationsPage() {
  return (
    <Container className="max-w-4xl space-y-4">
      <PageHeader>
        <h1 className="font-semibold">Ontology Associations</h1>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Mock association input for finance notes and transaction context
          </CardTitle>
        </CardHeader>
        <CardContent>
          <OntologyAssociationInput />
        </CardContent>
      </Card>
    </Container>
  );
}
