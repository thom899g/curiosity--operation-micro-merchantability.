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