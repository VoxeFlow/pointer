import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

type BrandMarkProps = {
  href?: string;
  mode?: "full" | "icon";
  theme?: "dark" | "light";
  className?: string;
  priority?: boolean;
};

export function BrandMark({
  href = "/",
  mode = "full",
  theme = "dark",
  className,
  priority = false,
}: BrandMarkProps) {
  const src = mode === "full" ? "/brand/logo-pointer-full.png" : "/brand/logo-simples.png";
  const width = mode === "full" ? 350 : 48;
  const height = mode === "full" ? 150 : 48;

  const content = (
    <div
      className={cn(
        "inline-flex items-center rounded-[1rem]",
        theme === "light" ? "bg-transparent" : "bg-transparent",
        className,
      )}
    >
      <Image
        src={src}
        alt="Pointer"
        width={width}
        height={height}
        priority={priority}
        className={cn(
          mode === "full" ? "w-[120px] sm:w-[140px] h-auto object-contain" : "size-10 sm:size-[42px] object-contain",
          theme === "light" && mode === "full" ? "brightness-[1.08]" : "",
        )}
      />
    </div>
  );

  if (!href) {
    return content;
  }

  return <Link href={href}>{content}</Link>;
}
