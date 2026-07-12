import { TransitOpsShell } from "@/components/layout/transit-ops-shell"
import { DispatchTripForm } from "@/components/workflows/dispatch-trip-form"

export default function DispatchPage() {
  return <TransitOpsShell user={{ name: "Taylor Chen", email: "taylor.chen@spireops.io", role: "Fleet Manager", initials: "TC" }}><DispatchTripForm /></TransitOpsShell>
}
