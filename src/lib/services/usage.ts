export type UserUsageAnalytics =
  | {
      mode: 'CREDITS';
      plan: 'FREE';
      usagePercentage: number;
      currentUsage: number; // credits used
      remainingCredits: number;
      totalCredits: number;
      lastResetAt: Date;
    }
  | {
      mode: 'QUERIES';
      plan: 'PRO';
      usagePercentage: number; // monthly percentage
      currentUsage: number; // monthly queries used
      monthlyLimit: number;
      dailyUsed: number;
      dailyLimit: number;
      lastResetAt: Date;
    };
