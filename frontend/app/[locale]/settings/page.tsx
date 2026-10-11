import Container from "@/components/Container";
import { getCurrentUser } from "@/lib/data/auth";
import SettingsClient from "@/components/settings/SettingsClient";

export default async function SettingsPage() {
  const currentUser = await getCurrentUser();

  return (
    <div className="min-h-screen bg-bg-light/40 py-8">
      <Container>
        <SettingsClient currentUser={currentUser} />
      </Container>
    </div>
  );
}
