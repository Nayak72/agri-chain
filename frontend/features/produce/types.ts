export interface Produce {
  id: string;
  produce_type: string;
  name: string;
  category: string;
  unit: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProduceInput {
  produce_type: string;
  name: string;
  category: string;
  unit: string;
  description?: string;
}
