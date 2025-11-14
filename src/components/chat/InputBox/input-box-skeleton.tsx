import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "motion/react";

export function InputBoxSkeleton() {
  return (
    <motion.div
      transition={{ duration: 0.2 }}
      layout
      className="w-[96vw] origin-center rounded-none lg:max-w-[50vw] mx-auto shadow-md shadow-background/50 h-fit flex p-2 gap-2 border-2  bg-sidebar"
    >
      <Skeleton className="w-full h-full min-h-11 px-2 rounded-none" />
    </motion.div>
  );
}
