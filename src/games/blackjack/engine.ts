export type HandOutcome = 'exact' | 'win' | 'dbust' | 'bust' | 'tie' | 'lose';

export function payoutFor(outcome: HandOutcome, bet: number): number {
  if (outcome === 'exact') return bet * 2;
  if (outcome === 'win' || outcome === 'dbust') return bet;
  return -bet;
}
