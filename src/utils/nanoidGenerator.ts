import { customAlphabet } from "nanoid";
import { PASSKEY_ID_LENGTH } from "../constants/enums";

/**
 * Define the alphabet for passkey generation
 * Using only uppercase letters and numbers for better readability
 * Excluding similar-looking characters (0, O, 1, I) to prevent confusion
 */
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * Create a custom nanoid generator with our alphabet and length
 */
const nanoid = customAlphabet(alphabet, PASSKEY_ID_LENGTH);

/**
 * Generate a single unique passkey ID
 */
export const generatePasskeyId = (): string => {
  return nanoid();
};

/**
 * Generate multiple unique passkey IDs
 * @param count Number of passkey IDs to generate
 * @returns Array of unique passkey IDs
 */
export const generateMultiplePasskeyIds = (count: number): string[] => {
  const passkeys: string[] = [];

  for (let i = 0; i < count; i++) {
    passkeys.push(generatePasskeyId());
  }

  return passkeys;
};

/**
 * Validate if a string matches the passkey ID format
 * @param passkeyId The passkey ID to validate
 * @returns True if valid, false otherwise
 */
export const isValidPasskeyFormat = (passkeyId: string): boolean => {
  // Check length
  if (passkeyId.length !== PASSKEY_ID_LENGTH) {
    return false;
  }

  // Check if all characters are from our alphabet
  const validChars = new Set(alphabet);
  return passkeyId.split("").every((char) => validChars.has(char));
};
