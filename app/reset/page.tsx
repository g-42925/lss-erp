"use client"

import Image from "next/image"
import useAuth from "@/store/auth"
import { redirect,useRouter } from "next/navigation";
import { useState } from "react";
import useFetch from "@/hooks/useFetch";

function Message(message:Failed){
	return (
		<div className="bg-red-900 p-3 rounded-md text-white w-full max-w-sm">
      {message.message}
		</div>
	)
}

export default function Master(){

  const [secretId,setSecretId] = useState('')
  const [email,setEmail] = useState('')
  const [password,setPassword] = useState('')
  const [passwordHide,setPasswordHide] = useState(false)

  const resetFn = useFetch<any,any>({
  	url:"/api/web/reset",
    method:"POST",
  })


  const router = useRouter()

  async function submit(e:any){
   e.preventDefault()

		const body = JSON.stringify({
			secretId,
			email,
			password
		})

		resetFn.fn(body,(result) => {
			router.push(
				'/login'
			)
		})
  }
  return (
    <div className="bg-gray-900 h-screen flex flex-col gap-3 justify-center items-center">
			{resetFn.noResult || resetFn.error ? <Message message={resetFn.message}/> : <></>}
      <div className="w-full max-w-sm bg-white rounded-md shadow-lg p-8">
        
        <h1 className="text-2xl font-semibold text-center mb-8">
          Reset an Account
        </h1>

        <form onSubmit={(e) => submit(e)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1">Secret ID</label>
            <input
              type="text"
              placeholder="Masukkan Secret ID"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              onChange={(e) => setSecretId(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              onChange={(e) => setEmail(e.target.value)}              
              placeholder="Masukkan Email"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="relative">
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type={passwordHide ? 'text':'password'}
              placeholder="Masukkan Password"
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            {
					    passwordHide
					    ?
              <svg onClick={() => setPasswordHide(!passwordHide)} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6 absolute right-3 top-9">
  					  	<path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
				      </svg>
					    :
              <svg onClick={() => setPasswordHide(!passwordHide)} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6 absolute  right-3 top-9">
  						  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
  						  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
				      </svg>
			    	}
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium transition"
          >
            Masuk
          </button>
        </form>
      </div>
    </div>
  )
}

type Failed = {
	message:string
}