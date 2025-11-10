// Simple authentication utility
// TODO: Replace with Better Auth in the future

const DEMO_USER = {
  id: "demo-user",
  email: "demo@gakushukun.app",
  name: "Demo User",
};

export function getCurrentUser() {
  if (typeof window === "undefined") {
    // Server-side: check cookie or session
    return DEMO_USER;
  }

  // Client-side: check localStorage
  const user = localStorage.getItem("gakushukun_user");
  return user ? JSON.parse(user) : null;
}

export function login() {
  if (typeof window !== "undefined") {
    localStorage.setItem("gakushukun_user", JSON.stringify(DEMO_USER));
  }
  return DEMO_USER;
}

export function logout() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("gakushukun_user");
  }
}

export function isAuthenticated() {
  if (typeof window === "undefined") {
    return true; // Server-side: always authenticated for now
  }
  return !!getCurrentUser();
}
