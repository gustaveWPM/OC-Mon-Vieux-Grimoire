import bcrypt from 'bcrypt';

const HASH_N = 10;
export const TOKENS_EXPIRATION_DELAY: string | number | undefined = '24h';

export async function isValidPassword(sentInput: string, expected: string): Promise<boolean> {
  const isValidPassword = await bcrypt.compare(sentInput, expected);
  if (!isValidPassword) {
    return false;
  }
  return isValidPassword;
}

export async function processPasswordHashing(passwordToHash: string) {
  const hash = await bcrypt.hash(passwordToHash, HASH_N);
  return hash;
}
