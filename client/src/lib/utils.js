import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatHeaderDates(language = "en") {
  const now = new Date();
  const isUrdu = language === "ur";

  const islamic = new Intl.DateTimeFormat(
    isUrdu ? "ur-PK-u-ca-islamic" : "en-u-ca-islamic-nu-latn",
    { day: "numeric", month: "long", year: "numeric" },
  ).format(now);

  const gregorian = new Intl.DateTimeFormat(isUrdu ? "ur-PK" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(now);

  return { islamic, gregorian };
}
