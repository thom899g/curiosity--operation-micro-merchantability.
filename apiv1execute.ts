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