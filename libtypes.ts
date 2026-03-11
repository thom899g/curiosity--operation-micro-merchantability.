export interface User {
  apiKey: string;
  creditBalance: number;
  freeTierResetDate: string; // ISO string
  email?: string;
}

export interface FunctionCatalogItem {
  id: string;
  name: string;
  description: string;
  creditCost: number;
  parameters: Parameter[];
}

export interface Parameter {
  name: string;
  type: string;
  description: string;
  required: boolean;
}

export interface ExecutionRequest {
  function: string;
  parameters: Record<string, any>;
}

export interface PurchaseRequest {
  creditPack: string; // '100', '250', '1000'
}