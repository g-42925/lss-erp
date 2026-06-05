"use client"

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import Link from "next/link";
import useFetch from "@/hooks/useFetch";
import useAbsensiFetch from "@/hooks/useAbsensiFetch";
import useAuth from "@/store/auth";

export default function WorkOrders() {
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const email = useAuth((state) => state.email)
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const modalRef = useRef<HTMLDialogElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [fileName, setFileName] = useState<string>('')
  const [workOrders, setWorkOrders] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [empSearch, setEmpSearch] = useState("")
  const [showEmpDropdown, setShowEmpDropdown] = useState(false)
  const [selectedEmp, setSelectedEmp] = useState<any>(null)
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add')
  const [selectedWoId, setSelectedWoId] = useState<string | null>(null)
  const [selectedWoForPrint, setSelectedWoForPrint] = useState<any>(null)

  const newForm = useForm()

  const getLogsFn = useFetch<any[], any>({
    url: `/api/web/work-orders?id=xxx`,
    method: 'GET'
  })

  const addFn = useFetch<any, any>({
    url: '/api/web/work-orders',
    method: 'POST'
  })

  const editFn = useFetch<any, any>({
    url: '/api/web/work-orders',
    method: 'PUT'
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

      // Fetch employees
      getEmployeesFn.fn(`/emp/${masterAccountId}`, JSON.stringify({}), (data) => {
        const list = Array.isArray(data) ? data : (data?.data || []);
        setEmployees(list);
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated, masterAccountId])

  function openEditModal(wo: any) {
    setModalMode('edit')
    setSelectedWoId(wo._id)
    newForm.setValue("taskName", wo.taskName)
    newForm.setValue("description", wo.description)
    newForm.setValue("startTime", new Date(wo.startTime).toISOString().split('T')[0])
    newForm.setValue("endTime", new Date(wo.endTime).toISOString().split('T')[0])
    newForm.setValue("employeeId", wo.assignedTo)
    newForm.setValue("status", wo.status)
    const emp = employees.find(e => e.pegawai_id === wo.assignedTo || e.pegawaid_id === wo.assignedTo)
    setSelectedEmp(emp)
    setEmpSearch("")
    setFile(null)
    setFileName("")
    modalRef.current?.showModal()
  }

  function openAddModal() {
    setModalMode('add')
    setSelectedWoId(null)
    newForm.reset()
    setSelectedEmp(null)
    setEmpSearch("")
    setFile(null)
    setFileName("")
    modalRef.current?.showModal()
  }

  function printWo(wo: any) {
    setSelectedWoForPrint(wo)
    setTimeout(() => {
      window.print()
    }, 100)
  }

  async function submit(data: any) {
    const formData = new FormData()

    formData.append("taskName", data.taskName)
    formData.append("description", data.description)
    formData.append("startTime", new Date(data.startTime).toISOString())
    formData.append("endTime", new Date(data.endTime).toISOString())

    if (file) formData.append("attachment", file as any)
    if (file) formData.append("attachmentName", fileName)


    formData.append("assignedTo", data.employeeId)
    formData.append("email", email)
    formData.append("masterAccountId", masterAccountId)

    if (modalMode === 'edit' && selectedWoId) {
      formData.append("id", selectedWoId)
      formData.append("status", data.status)
      await editFn.fn('', formData, (result) => {
        alert('Work order updated successfully!')
        modalRef.current?.close()
        getLogsFn.fn(`/api/web/work-orders?id=${masterAccountId}`, JSON.stringify({}), (res) => {
          setWorkOrders(res || [])
        })
      })
    } else {
      await addFn.fn('', formData, (result) => {
        alert('Work order added successfully!')
        modalRef.current?.close()
        getLogsFn.fn(`/api/web/work-orders?id=${masterAccountId}`, JSON.stringify({}), (res) => {
          setWorkOrders(res || [])
        })
      })
    }
  }

  async function setPreview(e: any) {
    const file = e.target.files[0]
    setFile(file)
    setFileName(file.name)
  }

  if (!hasHydrated) return null

  return (
    <>
      <div className="h-full p-6 flex flex-col gap-3 print:hidden">
        <span className="text-2xl text-black">Work Orders <span className="text-sm leading-loose">Manage work orders</span></span>
        <div className="bg-white h-full border-t-4 border-blue-900 flex flex-col p-6 gap-6">
          <div className="flex flex-row ">
            <span className="self-center text-black">All Work Orders</span>
            <div className="flex ml-auto gap-2">
              <Link href="/work-orders/report" className="btn btn-neutral text-white">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0 0 13.5 3v7.5Z" />
                </svg>
                Report
              </Link>
              <button onClick={openAddModal} className="btn">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add New
              </button>
            </div>
          </div>

          {getLogsFn.loading ? (
            <div className="flex-1 flex flex-col justify-center items-center">
              <span className="loading loading-spinner loading-xl"></span>
            </div>
          ) : getLogsFn.noResult || getLogsFn.error ? (
            <div><p className="text-black">{getLogsFn.message}</p></div>
          ) : (
            <div>
              <table className="table text-black w-full">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Task Name</th>
                    <th>Employee Name</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {workOrders.map((wo, index) => {
                    const validDate = wo.addedOn ? new Date(wo.addedOn).toLocaleDateString() : '';
                    const emp = employees.find(e => e.pegawai_id === wo.assignedTo || e.pegawaid_id === wo.assignedTo);
                    const employeeName = emp ? emp.nama_pegawai : wo.assignedTo;
                    return (
                      <tr key={index}>
                        <td>{validDate}</td>
                        <td>{wo.taskName}</td>
                        <td>{employeeName}</td>
                        <td>
                          <span className={`badge ${wo.status === 'Pending' ? 'badge-warning' : 'badge-success'}`}>
                            {wo.status}
                          </span>
                        </td>
                        <td>
                          <div className="flex gap-2">
                            <button onClick={() => openEditModal(wo)} className="btn btn-sm btn-outline">
                              Edit
                            </button>
                            <button onClick={() => printWo(wo)} className="btn btn-sm btn-outline btn-info">
                              Print
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {workOrders.length === 0 && (
                    <tr><td colSpan={5} className="text-center">No work orders found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <dialog id="modal_add_wo" ref={modalRef} className="modal text-black print:hidden">
        <div className="modal-box">
          <div className="flex flex-col gap-3">
            <span className="text-2xl">{modalMode === 'edit' ? 'Edit Work Order' : 'Add Work Order'}</span>
            <form onSubmit={newForm.handleSubmit(submit)} className="h-150 relative">
              <input {...newForm.register("taskName", { required: true })} type="text" placeholder="Task Name" className="mb-3 w-full p-3 rounded-md border-1 border-black" />
              <input {...newForm.register("description", { required: true })} type="text" placeholder="Description" className="mb-3 w-full p-3 rounded-md border-1 border-black" />
              <input {...newForm.register("startTime", { required: true })} type="date" placeholder="Start Time" className="mb-3 w-full p-3 rounded-md border-1 border-black" />
              <input {...newForm.register("endTime", { required: true })} type="date" placeholder="End Time" className="mb-3 w-full p-3 rounded-md border-1 border-black" />
              <input onChange={(e) => setPreview(e)} type="file" placeholder="File" className="mb-3 w-full p-3 rounded-md border-1 border-black" />
              <div className="relative mb-10">
                <input
                  type="text"
                  value={selectedEmp ? selectedEmp.nama_pegawai : empSearch}
                  onChange={(e) => {
                    setEmpSearch(e.target.value)
                    setSelectedEmp(null)
                    newForm.setValue("employeeId", "")
                    setShowEmpDropdown(true)
                  }}
                  onFocus={() => setShowEmpDropdown(true)}
                  placeholder="Search employee..."
                  className="w-full p-3 rounded-md border-1 border-black text-black bg-white"
                />
                {showEmpDropdown && (
                  <div className="absolute z-10 w-full bg-white border-1 border-black rounded-md mt-1 max-h-40 overflow-y-auto shadow-lg">
                    <div className="p-3 bg-gray-100 flex flex-row justify-between sticky top-0 border-b border-gray-300">
                      <span className="font-semibold text-sm">Select Employee</span>
                      <button type="button" onClick={() => setShowEmpDropdown(false)} className="text-gray-500 hover:text-black">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    {employees.filter(e => String(e.nama_pegawai || '').toLowerCase().includes(empSearch.toLowerCase())).map(e => (
                      <div
                        key={e.pegawai_id || e.pegawaid_id}
                        className="p-3 hover:bg-gray-200 cursor-pointer text-black border-b border-gray-100"
                        onClick={() => {
                          setSelectedEmp(e)
                          setEmpSearch("")
                          setShowEmpDropdown(false)
                          newForm.setValue("employeeId", e.pegawai_id || e.pegawaid_id)
                        }}
                      >
                        {e.nama_pegawai}
                      </div>
                    ))}
                    {employees.filter(e => String(e.nama_pegawai || '').toLowerCase().includes(empSearch.toLowerCase())).length === 0 && (
                      <div className="p-3 text-gray-500 text-center text-sm">No employees found.</div>
                    )}
                  </div>
                )}
              </div>
              <input type="hidden" {...newForm.register("employeeId", { required: true })} />

              {modalMode === 'edit' && (
                <select {...newForm.register("status")} className="mb-3 w-full p-3 rounded-md border-1 border-black bg-white text-black">
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Canceled">Canceled</option>
                </select>
              )}

              {(addFn.noResult || addFn.error || editFn.noResult || editFn.error) ? <label className="input-validator text-red-900">something went wrong</label> : <></>}
              <div className="modal-action">
                <div onClick={() => modalRef.current?.close()} role="button" className="btn p-3 rounded-md absolute bottom-0 right-24 text-white bg-gray-400">
                  Cancel
                </div>
              </div>
              <button type="submit" className="p-3 rounded-md absolute bottom-0 right-0 text-white bg-blue-900">
                {modalMode === 'edit' ? 'Update' : 'Add'}
              </button>
            </form>
          </div>
        </div>
      </dialog>

      <div className="hidden print:block text-black p-8 bg-white absolute top-0 left-0 w-full h-full min-h-screen z-50">
        {selectedWoForPrint && (
          <div className="flex flex-col gap-4">
            <div className="text-center font-bold text-3xl mb-6 border-b-2 border-black pb-4 uppercase tracking-widest">Work Order</div>

            <div className="grid grid-cols-2 gap-y-4 text-lg">
              <div><strong className="w-32 inline-block">Task Name</strong> : {selectedWoForPrint.taskName}</div>
              <div><strong className="w-32 inline-block">Status</strong> : <span className="uppercase font-semibold">{selectedWoForPrint.status}</span></div>
              <div><strong className="w-32 inline-block">Start Date</strong> : {new Date(selectedWoForPrint.startTime).toLocaleDateString()}</div>
              <div><strong className="w-32 inline-block">End Date</strong> : {new Date(selectedWoForPrint.endTime).toLocaleDateString()}</div>

              <div className="col-span-2 mt-4">
                <strong>Description :</strong>
                <p className="mt-2 whitespace-pre-wrap border border-gray-300 p-4 rounded min-h-[100px]">{selectedWoForPrint.description}</p>
              </div>

              <div className="mt-4"><strong className="w-32 inline-block">Requested By</strong> : {selectedWoForPrint.requestedBy}</div>
              <div className="mt-4"><strong className="w-32 inline-block">Date Created</strong> : {new Date(selectedWoForPrint.addedOn).toLocaleDateString()}</div>
            </div>

            <div className="mt-20 flex justify-between px-10">
              <div className="text-center w-48">
                <p className="mb-20 font-semibold">Requested By</p>
                <p className="border-t border-black pt-2">( {selectedWoForPrint.requestedBy} )</p>
              </div>
              <div className="text-center w-48">
                <p className="mb-20 font-semibold">Assigned To</p>
                <p className="border-t border-black pt-2">( {employees.find(e => e.pegawai_id === selectedWoForPrint.assignedTo || e.pegawaid_id === selectedWoForPrint.assignedTo)?.nama_pegawai || selectedWoForPrint.assignedTo} )</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
