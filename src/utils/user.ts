// utils/user.ts

export interface StoredUser {
  name?: string;
  full_name?: string;
  email: string;
  department: string;
  token?: string;
}

export function getStoredUser<TUser = any>(): TUser | null {
  const userStr = localStorage.getItem("user");
  if (!userStr) return null;

  try {
    return JSON.parse(userStr) as TUser;
  } catch {
    localStorage.removeItem("user");
    return null;
  }
}

export const setStoredUser = (user: StoredUser) => {
  localStorage.setItem("user", JSON.stringify(user));
};

export const removeStoredUser = () => {
  localStorage.removeItem("user");
};

export const isLoggedIn = (): boolean => {
  return getStoredUser() !== null;
};
