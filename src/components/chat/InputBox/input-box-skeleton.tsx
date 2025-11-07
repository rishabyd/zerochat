import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "motion/react";

export function InputBoxSkeleton() {
  return (
    <motion.div
      transition={{ duration: 0.2 }}
      layout
      className="w-[96vw] origin-center lg:max-w-[50vw] mx-auto shadow-md shadow-background/50 h-fit flex p-2 gap-2 border-2  bg-sidebar"
    >
      {/* Textarea skeleton */}
      <div className="w-full h-full min-h-11 px-2 pl-3 flex items-center">
        <Skeleton className="h-6 w-3/4" />
      </div>

      {/* Button skeleton */}
      <motion.div className="my-auto">
        <Skeleton className="h-11 w-24 rounded-2xl" />
      </motion.div>
    </motion.div>
  );
}
