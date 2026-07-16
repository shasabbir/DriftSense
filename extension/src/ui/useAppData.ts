import { useCallback, useEffect, useState } from 'react'
import { getAllData, subscribeToStorage } from '../shared/storage'
import type { StoredData } from '../shared/types'

export function useAppData() {
  const [data, setData] = useState<StoredData | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const next = await getAllData()
    setData(next)
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
    return subscribeToStorage(() => void refresh())
  }, [refresh])

  return { data, loading, refresh }
}
