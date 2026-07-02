"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */

import useAuth from '@/store/auth'
import { useRouter } from 'next/navigation';
import { useState, useEffect } from "react";
import useFetch from "@/hooks/useFetch";

export default function SelectLocation() {
    const isSuperAdmin = useAuth(s => s.isSuperAdmin)
    const hasHydrated = useAuth(s => s._hasHydrated)
    const masterAccountId = useAuth(s => s.masterAccountId)
    const setLocationId = useAuth(s => s.setLocationId)
    const router = useRouter()

    const [locationId, setLocalLocationId] = useState("");

    const getLocationFn = useFetch<any[], any>({
        url: `/api/web/location?id=xxx`,
        method: "GET"
    })

    useEffect(() => {
        if (hasHydrated && !isSuperAdmin) {
            router.replace('/dashboard')
        }
    }, [hasHydrated, isSuperAdmin, router])

    useEffect(() => {
        if (hasHydrated && isSuperAdmin && masterAccountId) {
            const url = `/api/web/location?id=${masterAccountId}`
            getLocationFn.fn(url, JSON.stringify({}), (res) => {})
        }
    }, [hasHydrated, isSuperAdmin, masterAccountId])

    async function submit(e: any) {
        e.preventDefault()
        if (locationId) {
            setLocationId(locationId)
            window.location.href = '/dashboard'
        }
    }

    if (!hasHydrated || !isSuperAdmin) return null;

    return (
        <div className="h-screen bg-gray-900 flex flex-col gap-3 justify-center items-center">
            <form onSubmit={submit} className="w-1/3 flex flex-col gap-6 bg-white p-6 rounded-md shadow-lg">
                <span className="font-bold text-2xl text-center text-black">Select Location</span>
                <span className="text-gray-600 text-center text-sm">Please select a location to continue to your dashboard.</span>
                
                {getLocationFn.loading ? (
                    <div className="flex justify-center items-center h-20">
                        <span className="loading loading-spinner text-blue-900"></span>
                    </div>
                ) : (getLocationFn.error || getLocationFn.noResult) ? (
                    <div className="bg-red-900 p-3 text-white rounded-md text-center">{getLocationFn.message}</div>
                ) : (
                    <div>
                        <label className="block text-gray-600 text-sm mb-2">Location</label>
                        <select 
                            className="select w-full border-gray-300 border-2 text-black bg-white focus:outline-none focus:border-red-400"
                            value={locationId}
                            onChange={(e) => setLocalLocationId(e.target.value)}
                            required
                        >
                            <option value="" disabled>Select a location</option>
                            {getLocationFn.result?.map((loc) => (
                                <option key={loc._id} value={loc._id}>{loc.name}</option>
                            ))}
                        </select>
                    </div>
                )}
                
                <button type="submit" disabled={!locationId} className={`p-3 rounded-full font-semibold text-white ${locationId ? 'bg-[#FF7373] hover:bg-[#ff6161]' : 'bg-gray-400 cursor-not-allowed'}`}>
                    Continue
                </button>
            </form>
        </div>
    );
}
