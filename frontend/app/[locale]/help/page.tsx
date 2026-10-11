import Container from "@/components/Container";
import HelpClient from "@/components/help/HelpClient";

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-bg-light/40 py-10">
      <Container>
        <HelpClient />
      </Container>
    </div>
  );
}
