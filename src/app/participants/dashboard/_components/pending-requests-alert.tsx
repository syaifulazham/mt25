import PendingRequestsAlertClient from "./pending-requests-alert-client";

interface PendingRequestsAlertProps {
  userId: number; // For backward compatibility
  participantId?: number;
}

export default function PendingRequestsAlert({ userId, participantId }: PendingRequestsAlertProps) {
  return <PendingRequestsAlertClient userId={userId} participantId={participantId} />;
}
