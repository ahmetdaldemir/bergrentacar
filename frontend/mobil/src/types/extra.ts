export interface Extra {
  id: string;
  name: string;
  price: number;
  currencyCode: string;
  isMandatory: boolean;
  salesType: 'daily' | 'per_rental';
  description: string | null;
  imageUrl: string | null;
}

