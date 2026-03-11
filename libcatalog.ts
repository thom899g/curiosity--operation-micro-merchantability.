import { FunctionCatalogItem } from './types';

export const catalog: FunctionCatalogItem[] = [
  {
    id: 'impermanentLoss',
    name: 'Impermanent Loss Calculator',
    description: 'Calculate the impermanent loss for a given liquidity provision scenario.',
    creditCost: 1,
    parameters: [
      { name: 'amountA', type: 'number', description: 'Amount of token A provided', required: true },
      { name: 'amountB', type: 'number', description: 'Amount of token B provided', required: true },
      { name: 'priceA', type: 'number', description: 'Initial price of token A (in USD)', required: true },
      { name: 'priceB', type: 'number', description: 'Initial price of token B (in USD)', required: true },
      { name: 'priceAChange', type: 'number', description: 'Multiplicative factor for price A change (e.g., 1.1 for 10% increase)', required: true },
      { name: 'priceBChange', type: 'number', description: 'Multiplicative factor for price B change', required: true },
    ],
  },
  {
    id: 'positionHealth',
    name: 'Uniswap V3 Position Health & Rebalancing Signal',
    description: 'Get the current health of a Uniswap V3 liquidity position and rebalancing suggestions.',
    creditCost: 5,
    parameters: [
      { name: 'poolAddress', type: 'string', description: 'The address of the Uniswap V3 pool', required: true },
      { name: 'positionTokenId', type: 'string', description: 'The token ID of the position NFT', required: true },
    ],
  },
];