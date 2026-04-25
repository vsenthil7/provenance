export function shortenAddress(addr: string): string {
  if (!addr) return '';
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 8)}…${addr.slice(-4)}`;
}

export function uinitToInit(uinit: bigint | number | string): string {
  const v = typeof uinit === 'bigint' ? uinit : BigInt(uinit);
  const whole = v / 1_000_000n;
  const frac = v % 1_000_000n;
  if (frac === 0n) return `${whole}`;
  // strip trailing zeros, max 6 dp
  const fracStr = frac.toString().padStart(6, '0').replace(/0+$/, '');
  return `${whole}.${fracStr}`;
}

export function initToUinit(init: string | number): bigint {
  const s = typeof init === 'number' ? init.toString() : init;
  const [whole, frac = ''] = s.split('.');
  const fracPadded = (frac + '000000').slice(0, 6);
  return BigInt(whole) * 1_000_000n + BigInt(fracPadded || '0');
}

export function formatINIT(uinit: bigint | number | string): string {
  return `${uinitToInit(uinit)} INIT`;
}
