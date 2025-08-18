export type User = {
  id: number;
  name: string;
  full_name?: string | null;
  email: string;
  birthdate?: string | null;
};

export type Address = {
  id: number;
  label?: string | null;
  recipient_name?: string | null;
  phone?: string | null;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  state?: string | null;
  postal_code?: string | null;
  country: string;
  is_default: boolean;
};
