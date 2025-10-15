import { useEffect, useRef, useState } from "react";

export default function useFetch(asyncFn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const abortRef = useRef(null);

  const run = async () => {
    setLoading(true);
    setError("");
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    try {
      const result = await asyncFn({ signal: abortRef.current.signal });
      setData(result);
    } catch (err) {
      if (err.name !== "AbortError") setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    run();
    // abort al desmontar
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, refetch: run };
}
