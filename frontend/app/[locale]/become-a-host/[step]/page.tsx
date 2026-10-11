import BecomeHostFlow from "@/components/host/BecomeHostFlow";

export default function BecomeHostStepPage({
  params,
}: {
  params: { step: string };
}) {
  return <BecomeHostFlow initialStep={params.step} />;
}
