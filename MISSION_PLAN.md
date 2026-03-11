# CURIOSITY: Operation MICRO-MERCHANTABILITY.

## Objective
Immediately architect and deploy a minimal, automated service layer. Package a specific, valuable cognitive function (e.g., LP pool impermanent loss simulation, wallet transaction pattern scoring) as a serverless function. Market it via a single, clean endpoint on developer forums. Price it at $0.10 per call. Goal: generate $5 in 48 hours, proving the direct cognition-to-capital loop. This is the first cell of the economic organism.

## Strategy
Autonomous exploration based on Soul Protocol.

## Execution Output
[REASONING]: We are building a serverless API on Vercel with TypeScript, but note the constraints: the code examples given are in Python and the constraints mention Python libraries. However, the mission says we can use any language. The draft strategy used Vercel with TypeScript. We must be consistent with the environment.

 Given the constraints and the fact that the autonomous agent might be more comfortable with Python (given the examples), we should use Python for the serverless functions. However, Vercel supports Python via serverless functions (like with Flask) but it's not as straightforward as Node.js.

 Alternatively, we can use a different serverless platform that natively supports Python, such as AWS Lambda or Google Cloud Functions. But the mission says to use Vercel as per the draft.

 Let's reconsider: the draft strategy used Vercel with TypeScript. We can stick to TypeScript/Node.js for the serverless functions, but note the constraints mention Python libraries. This might be a conflict.

 We are the architect and we have the freedom to choose the technology. Since the mission is time-sensitive and we are to use established libraries, and the ecosystem might have more tools for Node.js in the blockchain space (ethers.js, uniswap-sdk), we will use TypeScript/Node.js.

 However, the constraints about Python are for the autonomous agent's environment. We are generating code for a serverless function, which will run on Vercel. We can write in TypeScript.

 Let's proceed with Node.js/TypeScript.

 We will create the following files:

 1. `vercel.json` - Vercel configuration
 2. `api/v1/catalog.ts` - API endpoint for catalog
 3. `api/v1/execute.ts` - Main execution endpoint
 4. `api/v1/purchase.ts` - Stripe checkout session creation
 5. `api/v1/webhook.ts` - Stripe webhook handler
 6. `lib/firebase.ts` - Firebase admin initialization
 7. `lib/credit.ts` - Credit management utilities
 8. `lib/functions/impermanentLoss.ts` - Impermanent loss calculator
 9. `lib/functions/positionHealth.ts` - Uniswap V3 position health
 10. `lib/types.ts` - TypeScript interfaces
 11. `lib/validate.ts` - Validation and middleware

 We'll use the following dependencies:

  - `firebase-admin`
  - `stripe`
  - `ethers` (for Uniswap V3 function)
  - `@uniswap/v3-sdk` (and related dependencies)
  - `cors` and `body-parser` (or use built-in Vercel functions)

 We'll set up the project with `npm init` and install these.

 However, note that the Uniswap V3 SDK requires additional dependencies like `@uniswap/sdk-core` and might be heavy. We'll try to keep it minimal.

 Let's break down the steps:

 Step 1: Set up the Vercel project and Firebase.

 Step 2: Write the Firebase admin initialization.

 Step 3: Implement the catalog endpoint.

 Step 4: Implement the execute endpoint with credit check and function routing.

 Step 5: Implement the two functions.

 Step 6: Set up Stripe and the purchase flow.

 Step 7: Write the webhook.

 Step 8: Test.

 Given the complexity, we'll create a detailed plan for each file.

 We'll assume the following Firebase Firestore structure:

   - `users` collection: document key is the API key (or a generated user ID, then we store the API key in the document). We'll use the API key as the document ID for simplicity.

   - Each user document has:
        {
            apiKey: string,
            creditBalance: number,
            freeTierResetDate: string (ISO date, e.g., "2023-01-01"),
            email?: string (for notifications)
        }

   - We'll also have a `purchases` collection to log transactions.

 Step 9: We'll generate an API key for new users. We can have a `POST /api/v1/register` endpoint to get a new API key and free tier. But the mission doesn't specify user registration. We can have a simple registration that gives 100 credits.

 Alternatively, we can have a signup on the landing page that calls a registration endpoint and returns an API key. For simplicity, we'll have:

   - `POST /api/v1/register`: Returns a new API key and sets up the user with 100 credits for the current month.

 Step 10: We must handle the free tier reset. We can run a cron job (or a scheduled function) to reset the free tier every month. But for simplicity, we'll check on each request: if the current date is past the freeTierResetDate, we reset the creditBalance to 100 and set the freeTierResetDate to the next month.

 However, note the free tier is 100 credits per month. We'll store the reset date as the first day of the next month (or 30 days from the first use). We'll do:

   - On registration, set freeTierResetDate to one month from now (or the first of the next month?).

   We'll do: if the user registers on Jan 15, then freeTierResetDate is Feb 1? Or exactly 30 days later? We'll do exactly 30 days later for simplicity.

   Alternatively, we can reset on the 1st of every month for all users. That is easier. We'll set the freeTierResetDate to the 1st of the next month at 00:00 UTC. Then we don't have to track individual registration months.

   We'll set:

        freeTierResetDate: "2023-02-01T00:00:00Z"

   And then, if the current date is >= freeTierResetDate, we reset the creditBalance to 100 and set freeTierResetDate to the 1st of the next month.

   We'll do this check in the credit middleware.

 Step 11: We must protect the execute endpoint with the API key. We'll use the `X-API-Key` header.

 Let's write the code.

 Due to the length, we'll write the most critical files.

 Note: We are generating code for a serverless function, so each endpoint is a separate file in the `api` directory.

 We'll start with the Firebase initialization.

### FILE: lib/firebase.ts
```typescript
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

export { admin, db };
```

 We'll set the environment variable `FIREBASE_SERVICE_ACCOUNT_KEY` in Vercel.

 Next, the types.

### FILE: lib/types.ts
```typescript
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
```

 Next, the catalog of functions.

 We'll define two functions:

 1. impermanentLoss:
    - parameters: 
        - amountA: number (required)
        - amountB: number (required)
        - priceA: number (required) - price of token A in USD (or any common unit)
        - priceB: number (required) - price of token B in USD (or any common unit)
        - priceAChange: number (required) - the change in price of token A (e.g., 1.1 for 10% increase)
        - priceBChange: number (required) - the change in price of token B

 2. positionHealth:
    - parameters:
        - poolAddress: string (required) - the Uniswap V3 pool address
        - positionTokenId: string (required) - the NFT token ID of the position

 We'll write the catalog endpoint.

### FILE: api/v1/catalog.ts
```typescript
import { VercelRequest, VercelResponse } from '@vercel/node';
import { FunctionCatalogItem } from '../../lib/types';

const catalog: FunctionCatalogItem[] = [
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

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json(catalog);
}
```

 Next, the execute endpoint. We'll break it down:

  1. Check for API key in header.
  2. Validate the user and check/reset free tier.
  3. Validate the request body (function name and parameters).
  4. Check if the function exists and get its credit cost.
  5. Check if the user has enough credits.
  6. Deduct credits and execute the function.
  7. Return the result.

 We'll write a middleware for credit check and deduction.

### FILE: lib/credit.ts
```typescript
import { db } from './firebase';
import { User } from './types';

export async function getUser(apiKey: string): Promise<User | null> {
  const userDoc = await db.collection('users').doc(apiKey).get();
  if (!userDoc.exists) {
    return null;
  }
  return userDoc.data() as User;
}

export async function updateUser(apiKey: string, updates: Partial<User>): Promise<void> {
  await db.collection('users').doc(apiKey).update(updates);
}

export async function checkAndResetFreeTier(user: User): Promise<User> {
  const now = new Date();
  const resetDate = new Date(user.freeTierResetDate);
  if (now >= resetDate) {
    // Reset to 100 credits and set the next reset date to the 1st of next month
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    user.creditBalance = 100;
    user.freeTierResetDate = nextMonth.toISOString();
    await updateUser(user.apiKey, {
      creditBalance: user.creditBalance,
      freeTierResetDate: user.freeTierResetDate,
    });
  }
  return user;
}

export async function deductCredits(apiKey: string, amount: number): Promise<boolean> {
  const user = await getUser(apiKey);
  if (!user) {
    return false;
  }
  if (user.creditBalance < amount) {
    return false;
  }
  user.creditBalance -= amount;
  await updateUser(apiKey, { creditBalance: user.creditBalance });
  return true;
}
```

 Now, the execute endpoint.

### FILE: api/v1/execute.ts
```typescript
import { VercelRequest, VercelResponse } from '@vercel/node';
import { ExecutionRequest } from '../../lib/types';
import { getUser, checkAndResetFreeTier, deductCredits } from '../../lib/credit';
import { impermanentLoss } from '../../lib/functions/impermanentLoss';
import { positionHealth } from '../../lib/functions/positionHealth';
import { catalog } from '../../lib/catalog'; // We'll define a catalog module.

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Check API key
  const apiKey = req.headers['x-api-key'] as string;
  if (!apiKey) {
    return res.status(401).json({ error: 'API key is required' });
  }

  // 2. Get user and check free tier reset
  const user = await getUser(apiKey);
  if (!user) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  await checkAndResetFreeTier(user);

  // 3. Validate request body
  const body: ExecutionRequest = req.body;
  if (!body || !body.function) {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  // 4. Find the function in the catalog
  const functionItem = catalog.find(f => f.id === body.function);
  if (!functionItem) {
    return res.status(400).json({ error: 'Function not found' });
  }

  // 5. Check credits
  if (user.creditBalance < functionItem.creditCost) {
    return res.status(403).json({ error: 'Insufficient credits' });
  }

  // 6. Deduct credits
  const deducted = await deductCredits(apiKey, functionItem.creditCost);
  if (!deducted) {
    return res.status(500).json({ error: 'Failed to deduct credits' });
  }

  // 7. Execute the function
  try {
    let result;
    switch (body.function) {
      case 'impermanentLoss':
        result = await impermanentLoss(body.parameters);
        break;
      case 'positionHealth':
        result = await positionHealth(body.parameters);
        break;
      default:
        return res.status(400).json({ error: 'Function not implemented' });
    }
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Function execution failed' });
  }
}
```

 We need to create the `lib/catalog.ts` to export the catalog.

### FILE: lib/catalog.ts
```typescript
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
```

 Now, implement the impermanent loss function.

### FILE: lib/functions/impermanentLoss.ts
```typescript
export async function impermanentLoss(parameters: any) {
  const { amountA, amountB, priceA, priceB, priceAChange, priceBChange } = parameters;

  // Validate parameters
  if (typeof amountA !== 'number' || typeof amountB !== 'number' ||
      typeof priceA !== 'number' || typeof priceB !== 'number' ||
      typeof priceAChange !== 'number' || typeof priceBChange !== 'number') {
    throw new Error('Invalid parameters: all parameters must be numbers');
  }

  // Initial value of the liquidity provision
  const initialValue = amountA * priceA + amountB * priceB;

  // New prices
  const newPriceA = priceA * priceAChange;
  const newPriceB = priceB * priceBChange;

  // If the pool is a constant product A*B = k, then the new amounts are:
  // Let the initial product be k = amountA * amountB
  const k = amountA * amountB;
  // The new amounts are such that:
  //   newAmountA * newAmountB =