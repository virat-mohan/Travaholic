import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// FastAPI validation errors return `detail` as an array of {msg, loc, ...}
// objects rather than a string - guard against passing that straight to a
// toast, which crashes React ("Objects are not valid as a React child").
export function getErrorMessage(error, fallback) {
  const detail = error?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => d.msg || JSON.stringify(d)).join("; ");
  }
  return fallback;
}
