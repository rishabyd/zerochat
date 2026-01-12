import { motion } from "motion/react";
import { Skeleton } from "@/components/ui/skeleton";

export function InputBoxSkeleton() {
  return (
    <motion.div
      transition={{ duration: 0.2 }}
      layout
      className="mx-auto flex h-fit w-[96vw] origin-center gap-2 rounded-none border-2 bg-sidebar p-2 shadow-background/50 shadow-md lg:max-w-[50vw]"
    >
      <Skeleton className="h-full min-h-11 w-full rounded-none px-2" />
    </motion.div>
  );
}
