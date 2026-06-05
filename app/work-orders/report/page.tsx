"use client"

import { useEffect, useState } from "react";
import useFetch from "@/hooks/useFetch";
import useAbsensiFetch from "@/hooks/useAbsensiFetch";
import useAuth from "@/store/auth";

export default function WorkOrderReport() {
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const masterAccountId = useAuth((state) => state.masterAccountId)
  
  const [workOrders, setWorkOrders] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  
  const [filterStartDate, setFilterStartDate] = useState("")
  const [filterEndDate, setFilterEndDate] = useState("")
  const [filterStatus, setFilterStatus] = useState("All")
  const [filterEmp, setFilterEmp] = useState("All")
  
  const getLogsFn = useFetch<any[], any>({
    url: `/api/web/work-orders?id=xxx`,
    method: 'GET'
  })

  const getEmployeesFn = useAbsensiFetch<any, any>({
    url: `/emp/xxx`,
    method: 'GET'
  })

  useEffect(() => {
    if (hasHydrated && masterAccountId) {
      getLogsFn.fn(`/api/web/work-orders?id=${masterAccountId}`, JSON.stringify({}), (result) => {
        setWorkOrders(result || [])
      })
      getEmployeesFn.fn(`/emp/${masterAccountId}`, JSON.stringify({}), (data) => {
        const list = Array.isArray(data) ? data : (data?.data || []);
        setEmployees(list);
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated, masterAccountId])

  if (!hasHydrated) return null

  const filteredWorkOrders = workOrders.filter(wo => {
    let match = true;
    if (filterStatus !== "All" && wo.status !== filterStatus) match = false;
    if (filterEmp !== "All" && wo.assignedTo !== filterEmp) match = false;
    
    if (filterStartDate) {
      const woStart = new Date(wo.startTime).getTime();
      const fStart = new Date(filterStartDate).getTime();
      if (woStart < fStart) match = false;
    }
    if (filterEndDate) {
      // Add 1 day to include the entire end date
      const woStart = new Date(wo.startTime).getTime();
      const fEnd = new Date(filterEndDate).getTime() + 86400000;
      if (woStart > fEnd) match = false;
    }
    return match;
  });

  const totalWO = filteredWorkOrders.length;
  const totalCompleted = filteredWorkOrders.filter(w => w.status === 'Completed').length;
  const totalPending = filteredWorkOrders.filter(w => w.status === 'Pending').length;

  return (
    <>
      <div className="h-full p-6 flex flex-col gap-3 print:hidden">
        <span className="text-2xl text-black">Work Order Report <span className="text-sm leading-loose">Aggregated view and summaries</span></span>
        <div className="bg-white h-full border-t-4 border-blue-900 flex flex-col p-6 gap-6">
          <div className="flex flex-row justify-between flex-wrap gap-4 items-end">
            <div className="flex gap-4 flex-wrap">
              <div className="flex flex-col">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Start Date</label>
                <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className="p-2 border border-gray-300 rounded text-black bg-white" />
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">End Date</label>
                <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className="p-2 border border-gray-300 rounded text-black bg-white" />
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Status</label>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="p-2 border border-gray-300 rounded text-black bg-white h-10 min-w-[150px]">
                  <option value="All">All</option>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Canceled">Canceled</option>
                </select>
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Employee</label>
                <select value={filterEmp} onChange={e => setFilterEmp(e.target.value)} className="p-2 border border-gray-300 rounded text-black bg-white h-10 min-w-[200px]">
                  <option value="All">All Employees</option>
                  {employees.map(e => (
                    <option key={e.pegawai_id || e.pegawaid_id} value={e.pegawai_id || e.pegawaid_id}>{e.nama_pegawai}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <button onClick={() => setTimeout(() => window.print(), 100)} className="btn btn-info text-white">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6 mr-2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0v-2.941c0-1.13.927-2.05 2.056-2.05h6.388c1.13 0 2.056.92 2.056 2.05v2.941Z" />
              </svg>
              Print Report
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4 my-4">
            <div className="p-4 bg-gray-100 rounded border border-gray-200">
              <div className="text-gray-500 uppercase text-xs font-bold">Total Work Orders</div>
              <div className="text-3xl font-bold text-black">{totalWO}</div>
            </div>
            <div className="p-4 bg-green-50 rounded border border-green-200">
              <div className="text-green-700 uppercase text-xs font-bold">Completed</div>
              <div className="text-3xl font-bold text-green-900">{totalCompleted}</div>
            </div>
            <div className="p-4 bg-yellow-50 rounded border border-yellow-200">
              <div className="text-yellow-700 uppercase text-xs font-bold">Pending</div>
              <div className="text-3xl font-bold text-yellow-900">{totalPending}</div>
            </div>
          </div>

          {getLogsFn.loading ? (
            <div className="flex-1 flex flex-col justify-center items-center">
              <span className="loading loading-spinner loading-xl"></span>
            </div>
          ) : getLogsFn.noResult || getLogsFn.error ? (
            <div><p className="text-black">{getLogsFn.message}</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table text-black w-full">
                <thead>
                  <tr>
                    <th>Date Raised</th>
                    <th>Task Name</th>
                    <th>Employee Name</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWorkOrders.map((wo, index) => {
                    const validDate = wo.addedOn ? new Date(wo.addedOn).toLocaleDateString() : '';
                    const emp = employees.find(e => e.pegawai_id === wo.assignedTo || e.pegawaid_id === wo.assignedTo);
                    const employeeName = emp ? emp.nama_pegawai : wo.assignedTo;
                    return (
                      <tr key={index}>
                        <td>{validDate}</td>
                        <td className="font-semibold">{wo.taskName}</td>
                        <td>{employeeName}</td>
                        <td>{new Date(wo.startTime).toLocaleDateString()}</td>
                        <td>{new Date(wo.endTime).toLocaleDateString()}</td>
                        <td>
                          <span className={`badge ${wo.status === 'Pending' ? 'badge-warning' : wo.status === 'Completed' ? 'badge-success' : 'badge-neutral'}`}>
                            {wo.status}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                  {filteredWorkOrders.length === 0 && (
                    <tr><td colSpan={6} className="text-center italic py-10 text-gray-500">No work orders match the current filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* PRINT VIEW */}
      <div className="hidden print:block text-black p-8 bg-white absolute top-0 left-0 w-full min-h-screen z-50">
        <div className="text-center font-bold text-3xl mb-2 pb-2 uppercase tracking-widest">Work Order Aggregated Report</div>
        <div className="text-center text-sm mb-6 border-b-2 border-black pb-4 text-gray-600">
          Generated on {new Date().toLocaleString()}<br/>
          Filters applied - Status: {filterStatus} | Employee: {filterEmp === 'All' ? 'All' : employees.find(e => e.pegawai_id === filterEmp || e.pegawaid_id === filterEmp)?.nama_pegawai} | Date Range: {filterStartDate || 'Any'} to {filterEndDate || 'Any'}
        </div>
        
        <div className="grid grid-cols-4 border-b border-black font-bold pb-2 mb-2 text-left">
          <div className="pl-2">Task Name</div>
          <div>Employee</div>
          <div>Dates</div>
          <div>Status</div>
        </div>
        
        {filteredWorkOrders.map((wo, index) => {
          const emp = employees.find(e => e.pegawai_id === wo.assignedTo || e.pegawaid_id === wo.assignedTo);
          const employeeName = emp ? emp.nama_pegawai : wo.assignedTo;
          return (
            <div key={index} className="grid grid-cols-4 py-2 border-b border-gray-200">
              <div className="pr-2 pl-2 font-medium">{wo.taskName}</div>
              <div className="pr-2">{employeeName}</div>
              <div className="text-sm pr-2">{new Date(wo.startTime).toLocaleDateString()} - {new Date(wo.endTime).toLocaleDateString()}</div>
              <div>{wo.status}</div>
            </div>
          )
        })}

        <div className="flex justify-start gap-12 mt-8 pt-4">
          <div><strong className="text-gray-700">Total Found:</strong> {totalWO}</div>
          <div className="text-green-800"><strong>Completed:</strong> {totalCompleted}</div>
          <div className="text-yellow-600"><strong>Pending:</strong> {totalPending}</div>
        </div>
      </div>
    </>
  )
}
