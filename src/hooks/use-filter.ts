import { useMemo } from 'react'

interface FilterConfig<T> {
  key: keyof T
  value: string
}

export function useFilter<T>(data: T[], filter: FilterConfig<T>) {
  const filteredData = useMemo(() => {
    if (!filter.value.trim()) return data
    return data.filter(item =>
      String(item[filter.key]).toLowerCase().includes(filter.value.toLowerCase())
    )
  }, [data, filter])

  return filteredData
}