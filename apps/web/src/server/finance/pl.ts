import { Prisma } from "@stackzio/db";

const { Decimal } = Prisma;
export type Money = Prisma.Decimal;

export function zero(): Money {
  return new Decimal(0);
}

export function sum(values: Array<Money | string | number | null | undefined>): Money {
  let total = new Decimal(0);
  for (const v of values) {
    if (v == null) continue;
    total = total.plus(new Decimal(v));
  }
  return total;
}

export function net(revenue: Money, expenses: Money, payouts: Money): Money {
  return revenue.minus(expenses).minus(payouts);
}

/** Render-time only — never use the result back in math. */
export function toFixed2(m: Money | null | undefined): string {
  return (m ?? zero()).toFixed(2);
}
