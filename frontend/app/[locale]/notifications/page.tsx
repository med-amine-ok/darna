import Container from "@/components/Container";
import { getNotifications } from "@/lib/data/notifications";
import NotificationsClient from "@/components/notifications/NotificationsClient";

export default async function NotificationsPage() {
  const notifications = await getNotifications();

  return (
    <div className="min-h-screen bg-bg-light/40 py-10">
      <Container>
        <NotificationsClient initialNotifications={notifications} />
      </Container>
    </div>
  );
}
