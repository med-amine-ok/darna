import EmptyState from "@/components/EmptyState";

export default function NotFound() {
  return (
    <EmptyState
      title="404 - Page Not Found"
      subtitle="The page you are looking for does not exist."
      showReset
    />
  );
}
