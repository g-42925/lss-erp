import { useCallback, useState } from "react";

const ABSENSI_BASE_URL = "https://absensi.lerynsoftware.com/api/erp";

export default function useAbsensiFetch<R, B>(config: Conf<B>) {
	const [result, setResult] = useState<R | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(false);
	const [message, setMessage] = useState("");

	const fetchFn = async (path: string, body: B, callback: (r: R) => void) => {
		let finalUrl = config.url;
		if (path != '') {
			finalUrl = path;
		}

		if (!finalUrl.startsWith("http")) {
			finalUrl = `${ABSENSI_BASE_URL}${finalUrl}`;
		}

		let request = null

		setLoading(true);
		setError(false);
		setMessage("");

		const isFormData = body instanceof FormData;
		const headers = isFormData ? undefined : { "Content-Type": "application/json" }
		const b = body ? body : undefined

		try {
			if (config.method == "POST" || config.method == "PUT") {
				request = await fetch(finalUrl, {
					method: config.method,
					body: b as string,
					headers
				})
			}

			if (config.method === "GET" || config.method === "DELETE") {
				request = await fetch(finalUrl, {
					next: { revalidate: 0 },
					method: config.method,
					headers,
				})
			}

			const _request = request as Response

			if (!_request.ok) throw new Error(`HTTP error status ${_request.status}`);

			const response = await _request.json()
			
			setResult(response)
			callback(response)
		}
		catch (e: any) {
			setTimeout(() => {
				setMessage(e.message)
				setError(true)
			}, 3000)

			config.onError?.(e.message)
		}
		finally {
			setTimeout(() => {
				setLoading(false);
			}, 3000)
		}
	}

	const fn = useCallback(
		fetchFn,
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[config.url, config.method]
	)

	const reset = (v: any) => {
		setResult(v)
	}

	return {
		result,
		loading,
		error,
		message,
		reset,
		fn,
	}
}

type Conf<T> = {
	url: string,
	method: string,
	onError?: (m: string) => void
}
