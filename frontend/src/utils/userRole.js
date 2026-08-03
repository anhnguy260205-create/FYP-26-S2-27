// Utility functions for managing user roles and related information.
export function getStoredUser() {
  try {
    //get the current user from session storage, which is stored as a JSON string. If the user is not found, return null.
    return JSON.parse(sessionStorage.getItem("currentUser") || "null");
  } catch {
    return null;
  }
}
// Check if the user has the "expert" role. 
export function isExpertUser(user) {
  if (!user) return false;
  return user.is_expert === true || String(user.role || "").toLowerCase() === "expert";
}

// Check if the user is a verified expert.
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
// Get the background gradient for the page based on the user's role. 
export function getPageBackground(fadeAt = 130) {
  const user = getStoredUser();
  const top = isExpertUser(user) ? "#B273FF" : isPremiumUser(user) ? "#FFD500" : "#73ADFF";
  return `linear-gradient(to bottom, ${top} 0px, #FFFFFF ${fadeAt}px, #FFFFFF 100%)`;
}
// Get the avatar gradient for the user based on their role.
export function getAvatarGradient() {
  return isExpertUser(getStoredUser())
    ? "linear-gradient(135deg, #4338ca, #7e22ce)"
    : "linear-gradient(135deg, #0092b8, #155dfc)";
}
