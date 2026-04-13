import { useState, useEffect } from "react";
export function useDebounce<T>(value: T, delay: number): T {
  const [dv, setDv] = useState<T>(value);
  useEffect(() => { const h = setTimeout(() => setDv(value), delay); return () => clearTimeout(h); }, [value, delay]);
  return dv;
}
