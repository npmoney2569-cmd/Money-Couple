/**
 * CMN — Core Expense Splits and Settlement Logic
 * Implements pure mathematical functions for dividing expenses and resolving debts.
 */

export interface SplitResult {
  userId: string;
  amount: number;
}

export interface Share {
  userId: string;
  share: number; // Ratio, percentage, or weight
}

export interface Settlement {
  from: string; // Debtor user ID
  to: string;   // Creditor user ID
  amount: number;
}

/**
 * Splits an amount equally among a list of users, handling remainders.
 * 
 * @param amount Total amount to split (can be positive, negative, or zero)
 * @param userIds List of user IDs
 */
export function splitEqually(amount: number, userIds: string[]): SplitResult[] {
  if (userIds.length === 0) return [];
  if (userIds.length === 1) {
    return [{ userId: userIds[0], amount: Math.round(amount * 100) / 100 }];
  }

  const totalPennies = Math.round(amount * 100);
  const basePennies = Math.trunc(totalPennies / userIds.length);
  let remainderPennies = totalPennies - basePennies * userIds.length;

  return userIds.map((userId, idx) => {
    let pennies = basePennies;
    
    // Distribute remainder pennies to the first few users
    if (remainderPennies > 0) {
      pennies += 1;
      remainderPennies -= 1;
    } else if (remainderPennies < 0) {
      pennies -= 1;
      remainderPennies += 1;
    }

    return {
      userId,
      amount: pennies / 100,
    };
  });
}

/**
 * Splits an amount proportionally among users based on weight shares.
 * 
 * @param amount Total amount to split
 * @param shares List of user IDs and their shares
 */
export function splitProportionally(amount: number, shares: Share[]): SplitResult[] {
  if (shares.length === 0) return [];
  if (shares.length === 1) {
    return [{ userId: shares[0].userId, amount: Math.round(amount * 100) / 100 }];
  }

  const totalShares = shares.reduce((sum, s) => sum + s.share, 0);
  if (totalShares <= 0) {
    // If total shares is 0 or negative, default to equal split
    return splitEqually(amount, shares.map(s => s.userId));
  }

  const totalPennies = Math.round(amount * 100);
  let sumPennies = 0;

  // First pass: Round to nearest penny based on proportion
  const results = shares.map((s) => {
    const userPennies = Math.round((amount * 100 * s.share) / totalShares);
    sumPennies += userPennies;
    return {
      userId: s.userId,
      pennies: userPennies,
    };
  });

  // Handle rounding differences
  let diffPennies = totalPennies - sumPennies;
  
  // Distribute difference pennies starting from the first user
  let idx = 0;
  while (diffPennies !== 0 && idx < results.length) {
    if (diffPennies > 0) {
      results[idx].pennies += 1;
      diffPennies -= 1;
    } else {
      results[idx].pennies -= 1;
      diffPennies += 1;
    }
    idx++;
  }

  return results.map(r => ({
    userId: r.userId,
    amount: r.pennies / 100,
  }));
}

/**
 * Calculates the optimal list of settlements (minimum transfers) to clear all debts.
 * 
 * @param balances Map of user IDs to their net balance (positive means they are owed money, negative means they owe money)
 */
export function calculateSettlement(balances: { [userId: string]: number }): Settlement[] {
  const settlements: Settlement[] = [];

  // Separate debtors and creditors, filtering out users with zero/near-zero balance
  const debtors = Object.entries(balances)
    .map(([userId, balance]) => ({ userId, balance: Math.round(balance * 100) / 100 }))
    .filter((item) => item.balance < -0.005)
    .sort((a, b) => a.balance - b.balance); // Ascending order (most negative first)

  const creditors = Object.entries(balances)
    .map(([userId, balance]) => ({ userId, balance: Math.round(balance * 100) / 100 }))
    .filter((item) => item.balance > 0.005)
    .sort((a, b) => b.balance - a.balance); // Descending order (most positive first)

  let debtorIdx = 0;
  let creditorIdx = 0;

  while (debtorIdx < debtors.length && creditorIdx < creditors.length) {
    const debtor = debtors[debtorIdx];
    const creditor = creditors[creditorIdx];

    const oweAmount = -debtor.balance;
    const creditAmount = creditor.balance;

    const transferPennies = Math.round(Math.min(oweAmount, creditAmount) * 100);
    const transferAmount = transferPennies / 100;

    if (transferAmount > 0) {
      settlements.push({
        from: debtor.userId,
        to: creditor.userId,
        amount: transferAmount,
      });

      debtor.balance += transferAmount;
      creditor.balance -= transferAmount;
    }

    // Move pointers if settled
    if (Math.abs(debtor.balance) < 0.005) {
      debtorIdx++;
    }
    if (Math.abs(creditor.balance) < 0.005) {
      creditorIdx++;
    }
  }

  return settlements;
}
