import * as Crypto from 'expo-crypto';

/**
 * Hash a PIN using SHA-256
 * @param pin - The PIN to hash
 * @returns Hashed PIN string
 */
export const hashPin = async (pin: string): Promise<string> => {
    try {
        const hashed = await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            pin
        );
        return hashed;
    } catch (error) {

        throw error;
    }
};

/**
 * Verify a PIN against a hashed PIN
 * @param pin - The plain text PIN to verify
 * @param hashedPin - The hashed PIN to compare against
 * @returns True if PIN matches, false otherwise
 */
export const verifyPin = async (pin: string, hashedPin: string): Promise<boolean> => {
    try {
        const hashedInput = await hashPin(pin);
        return hashedInput === hashedPin;
    } catch (error) {

        return false;
    }
};
