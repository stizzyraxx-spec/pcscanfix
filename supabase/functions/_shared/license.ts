// Format: PCFX-XXXX-XXXX-XXXX-XXXX
export function generateLicenseKey(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  return `PCFX-${hex.slice(0,4)}-${hex.slice(4,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}`;
}
