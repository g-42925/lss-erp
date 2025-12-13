"use client"

import Image from "next/image"
import useAuth from "@/store/auth"
import { redirect } from "next/navigation";
import { useState } from "react";
import { useRouter } from "next/navigation";
import useFetch from "@/hooks/useFetch";

function Message(params:Failed){
	return (
		<div className="w-full max-w-sm bg-red-900 p-3 text-white w-1/2 rounded-md">{params.message}</div>
	)
}

export default function Master(){

	const [secretId,setSecretId] = useState('')
	const [email,setEmail] = useState('')
	const [password,setPassword] = useState('')
  const [error,setError] = useState('')
  const [isInvalid,setIsInvalid] = useState(false)
 
  const router = useRouter();

  const masterFn = useFetch<any,any>({
    url:"/api/web/master",
    method:"POST",
  })
 
  async function submit(e:any){
    e.preventDefault()
 
    const body = JSON.stringify({
      secretId,
      email,
      password
    })
 
    await masterFn.fn(body,(result) => {
      router.push('/login')
    })
  }
  return (
    <div className="bg-gray-900 h-screen flex flex-col justify-center items-center gap-3">
      {masterFn.noResult || masterFn.error ? <Message message={masterFn.message} /> : <></>}
      <div className="w-full max-w-sm bg-white rounded-md shadow-lg p-8">
        <h1 className="text-2xl font-semibold text-center mb-8">
          Make an Account
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
              placeholder="Masukkan Email"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              onChange={(e) => setEmail(e.target.value)}           
           />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              placeholder="Masukkan Password"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              onChange={(e) => setPassword(e.target.value)}
            />
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