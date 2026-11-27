/**
 * Assessment 05 & General Ledger Requirement:
 * High-precision decimal arithmetic helpers to prevent IEEE 754 floating point rounding drift.
 */

export function round(value: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function add(a: number, b: number): number {
  return round(round(a) + round(b));
}

export function subtract(a: number, b: number): number {
  return round(round(a) - round(b));
}

export function multiply(a: number, b: number): number {
  return round(round(a) * round(b));
}

export function isZero(val: number, tolerance = 0.0001): boolean {
  return Math.abs(val) < tolerance;
}

export function isEqual(a: number, b: number, tolerance = 0.0001): boolean {
  return Math.abs(round(a) - round(b)) < tolerance;
}
