/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import useAuth from '@/store/auth'
import { useState } from "react";
import useFetch from "@/hooks/useFetch";

function Message(params: Failed) {
	return (
		<div className="bg-red-900 p-3 text-white w-full max-w-sm md:max-w-md rounded-md text-sm md:text-base text-center">{params.message}</div>
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
		<form onSubmit={(e) => submit(e)} className="min-h-screen bg-gray-900 flex flex-col gap-4 justify-center items-center p-4">
			{loginFn.noResult || loginFn.error ? <Message message={loginFn.message} /> : <></>}
			<div className="w-full max-w-sm md:max-w-3xl lg:max-w-4xl xl:w-2/3 md:min-h-[500px] lg:h-[600px] flex flex-col md:flex-row shadow-2xl rounded-xl md:rounded-2xl overflow-hidden">
				<div className="text-white flex flex-col text-center p-8 lg:p-12 justify-center items-center w-full md:w-2/5 lg:w-1/2 bg-gradient-to-tr from-[#ff7664] via-[#ffb07c] to-[#ffe57a]">
					<span className="font-bold text-3xl lg:text-4xl mb-3">Welcome!</span>
					<span className="text-sm lg:text-base text-white/90">Enter your details to access your account</span>
				</div>
				<div className="w-full md:w-3/5 lg:w-1/2 bg-white flex flex-col justify-center p-8 lg:p-12 gap-5 lg:gap-6">
					<span className="font-bold text-2xl lg:text-3xl hidden md:block text-gray-800">Sign in</span>
					<div>
						<label className="block text-gray-600 text-sm font-medium mb-1">Email</label>
						<input
							type="text"
							className="text-black w-full border-0 border-b-2 border-gray-200 focus:border-[#FF7373] focus:ring-0 outline-none py-2 transition-colors bg-transparent"
							onChange={(e) => setEmail(e.target.value)}
						/>
					</div>
					<div>
						<label className="block text-gray-600 text-sm font-medium mb-1">Password</label>
						<input
							type="password"
							className="text-black w-full border-0 border-b-2 border-gray-200 focus:border-[#FF7373] focus:ring-0 outline-none py-2 transition-colors bg-transparent"
							onChange={(e) => setPassword(e.target.value)}
						/>
					</div>
					<button type="submit" className="p-3 lg:p-4 mt-6 rounded-full bg-[#FF7373] hover:bg-[#ff6161] shadow-lg hover:shadow-xl text-white font-semibold transition-all w-full">
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