import { useCallback, useState } from "react";

export default function useFetch<R,B>(config:Conf<B>){
  const [result, setResult] = useState<R | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [noResult, setNoResult] = useState(false);
  const [message, setMessage] = useState("");

  const fetchFn = async (body:B,callback:(r:R) => void) => {
    setLoading(true);
    setError(false);
    setNoResult(false);
    setMessage("");

    if(config.method == "POST"){
			const contentType = "application/json"
			const headers = {"Content-Type":contentType}
			const b = body ? body : undefined

			try{
			  const request = await fetch(config.url, {
     	 	  method: config.method,
      	  headers,
      	  body:b as string
    	  })
				const response = await request.json(
					// waiting for response chunk
				)

				if(response.noResult){
					setNoResult(true)
					setMessage(response.message)
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
        setMessage(e.message)
				setError(true)
			}
		  finally{
				setLoading(false)
			}
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
}