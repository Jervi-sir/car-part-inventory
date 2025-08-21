import { useEffect, useRef, useState } from "react";
import api from "@/lib/api";


type UseApiQueryOpts<T> = {
url: string; // full URL built with route('...') + params
deps?: any[]; // rerun on change
transform?: (data: any) => T; // optional shape mapping
};


export function useApiQuery<T = any>({ url, deps = [], transform }: UseApiQueryOpts<T>) {
const mounted = useRef(false);
const [data, setData] = useState<T | null>(null);
const [loading, setLoading] = useState<boolean>(false);
const [error, setError] = useState<any>(null);


useEffect(() => {
mounted.current = true;
const abort = new AbortController();


(async () => {
try {
setLoading(true);
setError(null);
const res = await api.get(url, { signal: abort.signal });
if (!mounted.current) return;
setData(transform ? transform(res.data) : res.data);
} catch (e: any) {
if (e?.name === "CanceledError" || e?.message?.includes("canceled")) return;
setError(e);
} finally {
if (mounted.current) setLoading(false);
}
})();


return () => {
mounted.current = false;
abort.abort();
};
// eslint-disable-next-line react-hooks/exhaustive-deps
}, deps);


return { data, loading, error } as const;
}