export function normalizeComplianceActionStatus(
  status: string | null | undefined,
): string {
  return (status || "")
    .toLowerCase()
    .replace(/[^a-z]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function isOpenComplianceActionStatus(
  status: string | null | undefined,
): boolean {
  const s = normalizeComplianceActionStatus(status);
  return s === "pending_review" || s === "reviewed";
}

