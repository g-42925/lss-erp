import { useCallback, useState } from "react";

export default function useFetch<R,B>(config:Conf<B>){
  const [result, setResult] = useState<R | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [noResult, setNoResult] = useState(false);
  const [message, setMessage] = useState("");

  const fetchFn = async (url:string,body:B,callback:(r:R) => void) => {
		const contentType = "application/json"

		if(url != '') config.url = url
		
		let request = null

    setLoading(true);
    setError(false);
    setNoResult(false);
    setMessage("");

		const isFormData = body instanceof FormData;

		const headers = isFormData ? undefined : { "Content-Type": "application/json" }

		const b = body ? body : undefined

		try{
      if(config.method == "POST" || config.method == "PUT"){
				request = await fetch(config.url, {
					method: config.method,
					body: b as string,
					headers
				})
			}

			if(config.method === "GET" || config.method === "DELETE"){
				request = await fetch(config.url, {
					next: { revalidate: 0 },
					method: config.method,
					headers,
				})
			}
			
			const _request = request as Response
			
			if (!_request.ok) throw new Error(`HTTP error status ${_request.status}`);
			
			const response = await _request.json()

			if(response.noResult){
				setNoResult(true)
				setMessage(response.message)
				config.onError?.(response.message)
			}
			else{
				setResult(
					response.result
				)
        
				callback(
					response.result
				)
			}
		}
		catch(e:any){
      setTimeout(() => {
				setMessage(e.message)
				setError(true)
			},3000)

      config.onError?.(e.message)
		}
		finally{
			setTimeout(() => {
				setLoading(false);
			},3000)
		}
  }

	const fn = useCallback(
		fetchFn, 
		[config.url]
  )

	

	return {
	  result,
    loading,
    error,
    noResult,
    message,
    fn,
	}
}

type Conf<T> = {
  url:string,
	method:string,
	onError?:(m:string) => void
}