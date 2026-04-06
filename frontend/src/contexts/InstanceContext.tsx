import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { instancesApi, ApisixInstance } from '@/api/resources'
import { apiClient } from '@/api/client'

interface InstanceState {
  instances: ApisixInstance[]
  current: ApisixInstance | null
  setCurrent: (inst: ApisixInstance) => void
  refresh: () => Promise<void>
}

const InstanceContext = createContext<InstanceState>(null!)

export function InstanceProvider({ children }: { children: ReactNode }) {
  const [instances, setInstances] = useState<ApisixInstance[]>([])
  const [current, setCurrentState] = useState<ApisixInstance | null>(null)

  const refresh = async () => {
    const list = await instancesApi.list()
    setInstances(list)
    if (!current || !list.find(i => i.id === current.id)) {
      const def = list.find(i => i.default) || list[0] || null
      setCurrentState(def)
      if (def) {
        apiClient.defaults.headers.common['X-Apisix-Instance-Id'] = String(def.id)
      }
    }
  }

  const setCurrent = (inst: ApisixInstance) => {
    setCurrentState(inst)
    apiClient.defaults.headers.common['X-Apisix-Instance-Id'] = String(inst.id)
  }

  useEffect(() => {
    refresh()
  }, [])

  return (
    <InstanceContext.Provider value={{ instances, current, setCurrent, refresh }}>
      {children}
    </InstanceContext.Provider>
  )
}

export function useInstance() {
  return useContext(InstanceContext)
}
