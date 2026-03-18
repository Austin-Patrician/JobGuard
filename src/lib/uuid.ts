function byteToHex(byte: number): string {
  return byte.toString(16).padStart(2, "0");
}

function formatUuidFromBytes(bytes: Uint8Array): string {
  const normalized = bytes.slice(0, 16);

  normalized[6] = (normalized[6] & 0x0f) | 0x40;
  normalized[8] = (normalized[8] & 0x3f) | 0x80;

  const hex = Array.from(normalized, byteToHex).join("");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}

function createUuidWithMathRandom(): string {
  const bytes = new Uint8Array(16);

  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Math.floor(Math.random() * 256);
  }

  return formatUuidFromBytes(bytes);
}

export function createUuid(): string {
  const runtimeCrypto = globalThis.crypto;

  if (runtimeCrypto?.randomUUID) {
    return runtimeCrypto.randomUUID();
  }

  if (runtimeCrypto?.getRandomValues) {
    return formatUuidFromBytes(runtimeCrypto.getRandomValues(new Uint8Array(16)));
  }

  return createUuidWithMathRandom();
}
