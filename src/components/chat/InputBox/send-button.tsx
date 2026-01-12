import type React from "react";
import { Button } from "@/components/ui/button";

export default function SendButton({
  className,
  children,
  props,
}: {
  className?: string;
  children: React.ReactNode;
  props: React.ButtonHTMLAttributes<HTMLButtonElement>;
}) {
  return (
    <Button variant={"outline"} {...props} className={`  ${className}`}>
      {children}
    </Button>
  );
}
