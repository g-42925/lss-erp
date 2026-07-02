/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import useAuth from '@/store/auth'
import { useState } from "react";
import useFetch from "@/hooks/useFetch";

function Message(params: Failed) {
	return (
		<div className="bg-red-900 p-3 text-white w-1/2 rounded-md">{params.message}</div>
	)
}

export default function Login() {
	const login = useAuth((state) => state.login)
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");

	// const auth = useAuth((state) => state)
	// const hasHydrated = useAuth((s) => s._hasHydrated)

	// if(!hasHydrated) return null
	// if(auth.loggedIn) redirect('/dashboard')

	const loginFn = useFetch<any, any>({
		url: "/api/web/login",
		method: "POST",
	})

	async function submit(e: any) {
		e.preventDefault()

		const body = JSON.stringify({
			email, password
		})

		await loginFn.fn('', body, (result) => {
			login(
				{
					email: result.email,
					loggedIn: true,
					name: result.name,
					masterAccountId: result.masterAccountId,
					pages: result.pages,
					roleId: result.roleId,
					isSuperAdmin: result.isSuperAdmin,
					locationId: result.locationId,
					userId: result._id,
					companyId: result.company._id,
					id: result._id,
					roleDetail: result.roleDetail || null
				}
			)

			if (result.isSuperAdmin) {
				window.location.href = '/select-location'
			} else {
				window.location.href = '/dashboard'
			}
		})
	}



	return (
		<form onSubmit={(e) => submit(e)} className="h-screen bg-gray-900 flex flex-col gap-3 justify-center items-center">
			{loginFn.noResult || loginFn.error ? <Message message={loginFn.message} /> : <></>}
			<div className="w-1/2 h-2/3 flex flex-row">
				<div className="text-white flex flex-col text-center p-6 rounded-l-md justify-center items-center flex-1 bg-gradient-to-tr from-[#ff7664] via-[#ffb07c] to-[#ffe57a]">
					<span className="font-bold text-3xl">Welcome back!</span>
					<span>Enter your details to access your account</span>
				</div>
				<div className="flex-1 bg-white rounded-tr-md rounded-br-md flex flex-col justify-center p-6 gap-6">
					<span className="font-bold text-2xl">Sign in</span>
					<div className="mb-6">
						<label className="block text-gray-600 text-sm mb-1">Email</label>
						<input
							type="text"
							className="text-black w-full border-0 border-b border-gray-300 focus:border-red-400 focus:ring-0 outline-none py-2"
							onChange={(e) => setEmail(e.target.value)}
						/>
					</div>
					<div className="mb-6">
						<label className="block text-gray-600 text-sm mb-1">Password</label>
						<input
							type="password"
							className="text-black w-full border-0 border-b border-gray-300 focus:border-red-400 focus:ring-0 outline-none py-2"
							onChange={(e) => setPassword(e.target.value)}
						/>
					</div>
					<button type="submit" className="p-3 rounded-full bg-[#FF7373] hover:bg-[#ff6161] text-white font-semibold">
						Login
					</button>
				</div>
			</div>
		</form>
	);
}


type Failed = {
	message: string
}