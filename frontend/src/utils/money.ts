// Arredonda pra 2 casas decimais evitando erros clássicos de ponto flutuante
// (ex.: 3 * 3.335 = 10.004999999999999 em JS, que .toFixed(2) arredondaria
// erradamente pra "10.00" em vez de "10.01").
export function roundMoney(value: number): number {
  return Math.round(value * 100 + 1e-9) / 100;
}

export function formatMoney(value: number): string {
  return roundMoney(value).toFixed(2);
}

// Soma quantidade*preço arredondando cada linha antes de somar, pra que o
// total nunca fique inconsistente com a soma dos subtotais mostrados.
export function sumLineAmounts(items: { quantity: number | string; unitPrice: number | string }[]): number {
  return roundMoney(items.reduce((sum, i) => sum + roundMoney(Number(i.quantity || 0) * Number(i.unitPrice || 0)), 0));
}
