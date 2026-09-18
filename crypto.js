import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export async function hashCode(code) {
  return bcrypt.hash(code, SALT_ROUNDS);
}

export async function verifyCode(code, hash) {
  return bcrypt.compare(code, hash);
}
