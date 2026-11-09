const ITERATIONS = 210_000;
const KEY_BITS = 256;
const SALT_BYTES = 16;
const PREFIX = "pbkdf2-sha256";

function toHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function fromHex(value: string) {
  if (value.length % 2 !== 0 || /[^0-9a-f]/i.test(value)) return null;
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}

async function derive(secret: string, salt: Uint8Array, iterations: number) {
  const saltBuffer = new Uint8Array(salt).buffer as ArrayBuffer;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret.normalize("NFKC")),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: saltBuffer, iterations, hash: "SHA-256" },
    key,
    KEY_BITS,
  );
  return new Uint8Array(bits);
}

/** Salted PBKDF2-SHA-256. The salt and iteration count travel with the hash. */
export async function hashPin(pin: string) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const key = await derive(pin, salt, ITERATIONS);
  return `${PREFIX}$${ITERATIONS}$${toHex(salt)}$${toHex(key)}`;
}

export async function verifyPin(pin: string, stored: string) {
  const [prefix, iterationText, saltHex, keyHex] = stored.split("$");
  const iterations = Number.parseInt(iterationText ?? "", 10);
  const salt = fromHex(saltHex ?? "");
  const expected = fromHex(keyHex ?? "");
  if (
    prefix !== PREFIX ||
    !Number.isFinite(iterations) ||
    iterations < 100_000 ||
    !salt ||
    !expected
  ) {
    return false;
  }
  const actual = await derive(pin, salt, iterations);
  return constantTimeEqual(actual, expected);
}
