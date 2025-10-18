"use client";

import { AlertTriangle, CheckCircle, Crown } from "lucide-react";
import { motion } from "motion/react";

interface TokenUsageIndicatorProps {
  currentUsage: number;
  monthlyLimit: number;
  usagePercentage: number;
  plan: "FREE" | "PRO";
  isVisible?: boolean;
}

export default function TokenUsageIndicator({
  currentUsage,
  monthlyLimit,
  usagePercentage,
  plan,
  isVisible = true,
}: TokenUsageIndicatorProps) {
  if (!isVisible) return null;

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getUsageColor = () => {
    if (usagePercentage >= 90) return "text-red-600 dark:text-red-400";
    if (usagePercentage >= 80) return "text-amber-600 dark:text-amber-400";
    if (usagePercentage >= 60) return "text-blue-600 dark:text-blue-400";
    return "text-green-600 dark:text-green-400";
  };

  const getUsageIcon = () => {
    if (usagePercentage >= 90) return <AlertTriangle className="h-4 w-4" />;
    if (usagePercentage >= 80) return <AlertTriangle className="h-4 w-4" />;
    return <CheckCircle className="h-4 w-4" />;
  };

  const getUsageMessage = () => {
    if (usagePercentage >= 90) return "Critical usage";
    if (usagePercentage >= 80) return "High usage";
    if (usagePercentage >= 60) return "Moderate usage";
    return "Good usage";
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="px-3 py-2 bg-background/80 backdrop-blur-sm border rounded-lg shadow-sm"
    >
      <div className="flex items-center gap-3">
        {/* Plan indicator */}
        <div className="flex items-center gap-1">
          {plan === "PRO" ? (
            <Crown className="h-4 w-4 text-yellow-500" />
          ) : (
            <div className="w-4 h-4 rounded-full bg-blue-500" />
          )}
          <span className="text-xs font-medium text-muted-foreground">
            {plan} Plan
          </span>
        </div>

        {/* Usage bar */}
        <div className="flex-1 flex items-center gap-2">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(usagePercentage, 100)}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className={`h-full rounded-full transition-colors ${
                usagePercentage >= 90
                  ? "bg-red-500"
                  : usagePercentage >= 80
                  ? "bg-amber-500"
                  : usagePercentage >= 60
                  ? "bg-blue-500"
                  : "bg-green-500"
              }`}
            />
          </div>
          <span className={`text-xs font-medium ${getUsageColor()}`}>
            {Math.round(usagePercentage)}%
          </span>
        </div>

        {/* Usage details */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            {formatNumber(currentUsage)} / {formatNumber(monthlyLimit)}
          </span>
          <div className={`flex items-center gap-1 ${getUsageColor()}`}>
            {getUsageIcon()}
            <span className="hidden sm:inline">{getUsageMessage()}</span>
          </div>
        </div>
      </div>

      {/* Warning for high usage */}
      {usagePercentage >= 80 && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 text-xs text-muted-foreground"
        >
          {usagePercentage >= 90 ? (
            <span className="text-red-600 dark:text-red-400">
              ⚠️ You&apos;re approaching your monthly limit. Consider upgrading
              to PRO.
            </span>
          ) : (
            <span className="text-amber-600 dark:text-amber-400">
              ℹ️ You&apos;re using {Math.round(usagePercentage)}% of your
              monthly tokens.
            </span>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
