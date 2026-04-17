export function normalizeDepartmentLabel(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function inferDepartmentKeyFromNormalized(normalized: string): string {
  if (!normalized) return "";

  const padded = ` ${normalized} `;

  if (
    normalized.includes("human resources") ||
    normalized === "hr" ||
    padded.includes(" hr ")
  ) {
    return "hr";
  }

  if (normalized.includes("quality")) return "quality";
  if (normalized.includes("environment")) return "environmental";

  if (
    normalized.includes("field") ||
    normalized.includes("field operations") ||
    normalized.includes("field operation") ||
    normalized.includes("operations group") ||
    normalized.includes("operation")
  ) {
    return "field";
  }

  return "";
}

export function resolveDepartmentKey(
  value: string | null | undefined,
  labelToKey: Record<string, string>,
): string {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return "";

  if (labelToKey[raw]) return labelToKey[raw];

  const normalized = normalizeDepartmentLabel(raw);

  for (const [label, key] of Object.entries(labelToKey)) {
    if (normalizeDepartmentLabel(label) === normalized) return key;
  }

  return inferDepartmentKeyFromNormalized(normalized);
}

export function isSafetyDepartmentAccount(user?: {
  department?: string | null;
  role?: string | null;
} | null): boolean {
  const dept = normalizeDepartmentLabel(user?.department || "");
  const role = normalizeDepartmentLabel(user?.role || "");

  if (!dept && !role) return false;

  if (role === "admin") return true;
  if (role === "all department" || role === "all departments") return true;

  if (dept.includes("safety")) return true;
  if (role.includes("safety")) return true;

  return false;
}

