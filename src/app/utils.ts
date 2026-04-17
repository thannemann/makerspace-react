export const emailValid = (email: string): boolean => {
  if (!email || typeof email !== "string") return false;

  // No leading/trailing whitespace
  if (email !== email.trim()) return false;

  // No multiple @ signs
  const atCount = (email.match(/@/g) || []).length;
  if (atCount !== 1) return false;

  const [local, domain] = email.split("@");

  // Local part must exist and be reasonable length
  if (!local || local.length === 0 || local.length > 64) return false;

  // No consecutive dots in local part
  if (local.includes("..")) return false;

  // Local part can't start or end with a dot
  if (local.startsWith(".") || local.endsWith(".")) return false;

  // Domain must exist and have at least one dot
  if (!domain || !domain.includes(".")) return false;

  // No consecutive dots in domain
  if (domain.includes("..")) return false;

  // TLD must be at least 2 characters and only letters
  const parts = domain.split(".");
  const tld = parts[parts.length - 1];
  if (!tld || tld.length < 2 || !/^[a-zA-Z]+$/.test(tld)) return false;

  // Full format check
  return (/^([\w.%+-]+)@([\w-]+\.)+(\w{2,})$/i).test(email);
};
