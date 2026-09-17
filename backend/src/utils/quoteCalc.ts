const round2 = (value: number) => Math.round(value * 100) / 100;

interface QuoteCalcInput {
  quantity: number;
  unitPrice: number;
  discountPct?: number;
  gstPct?: number;
}

export interface QuoteCalcItem {
  quantity: number;
  unitPrice: number;
  discountPct: number;
  gstPct: number;
  baseAmount: number;
  discountAmount: number;
  gstAmount: number;
  lineTotal: number;
}

export interface QuoteCalcResult {
  items: QuoteCalcItem[];
  subtotal: number;
  totalDiscount: number;
  totalGst: number;
  grandTotal: number;
}

export function calculateQuoteTotals(
  inputs: QuoteCalcInput[]
): QuoteCalcResult {
  const items = inputs.map((input) => {
    const quantity = Number(input.quantity);
    const unitPrice = round2(Number(input.unitPrice));
    const discountPct = Number(input.discountPct || 0);
    const gstPct = Number(input.gstPct || 0);

    const baseAmount = round2(quantity * unitPrice);
    const discountAmount = round2((baseAmount * discountPct) / 100);
    const taxableAmount = baseAmount - discountAmount;
    const gstAmount = round2((taxableAmount * gstPct) / 100);
    const lineTotal = round2(taxableAmount + gstAmount);

    return {
      quantity,
      unitPrice,
      discountPct,
      gstPct,
      baseAmount,
      discountAmount,
      gstAmount,
      lineTotal,
    };
  });

  const subtotal = round2(items.reduce((sum, i) => sum + i.baseAmount, 0));
  const totalDiscount = round2(
    items.reduce((sum, i) => sum + i.discountAmount, 0)
  );
  const totalGst = round2(items.reduce((sum, i) => sum + i.gstAmount, 0));
  const grandTotal = round2(items.reduce((sum, i) => sum + i.lineTotal, 0));

  return { items, subtotal, totalDiscount, totalGst, grandTotal };
}

export function generateNumber(prefix: string): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${year}${month}${day}-${random}`;
}