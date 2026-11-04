import { errors } from "jose";

/** Only a verified SDK/JWE expiration becomes anonymous; other errors must propagate. */
export async function readWithSessionExpiry<T>(
  read: () => Promise<T>,
  clearCookies: () => void,
): Promise<T | undefined> {
  try {
    return await read();
  } catch (error) {
    if (!(error instanceof errors.JWTExpired) || error.claim !== "exp")
      throw error;
    clearCookies();
    return undefined;
  }
}
