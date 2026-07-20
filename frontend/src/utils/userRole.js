// Merged-roles helpers.
//
// Since the investor/expert merge, everyone logs in with role "investor";
// expert is an add-on flag (`is_expert`) on the same account. These helpers
// keep backward compatibility with old sessions where role === "expert".

export function getStoredUser() {
  try {
    return JSON.parse(sessionStorage.getItem("currentUser") || "null");
  } catch {
    return null;
  }
}

export function isExpertUser(user) {
  if (!user) return false;
  return user.is_expert === true || String(user.role || "").toLowerCase() === "expert";
}

export function isVerifiedExpert(user) {
  return (
    isExpertUser(user) &&
    ["approved", "active"].includes(String(user.verification_status || "").toLowerCase())
  );
}

export function isPremiumUser(user) {
  // Verified experts enjoy complimentary premium benefits.
  return (
    String(user?.subscription_status || "").toLowerCase() === "premium" ||
    isVerifiedExpert(user)
  );
}
