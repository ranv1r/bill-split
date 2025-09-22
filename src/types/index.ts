export interface TaxRate {
  id: number;
  name: string;
  rate: number;
}

export interface BillItem {
  name: string;
  price: number;
  quantity: number;
  applicableTaxes: { [taxId: number]: boolean };
  assignedPeople: string[];
}

export interface TipConfiguration {
  isPercentage: boolean;
  value: number; // Either percentage (0-100) or fixed amount ($)
}

export interface BillSplitterState {
  people: string[];
  items: BillItem[];
  taxRates: TaxRate[];
  nextTaxId: number;
  tipConfig: TipConfiguration;
  currentImageUrl: string | null;
  currentFileType: string | null;
}