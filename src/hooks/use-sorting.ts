import { useState } from 'react'

export function useSorting<T>(data: T[], defaultKey: keyof T) {
  const [sortKey, setSortKey] = useState<keyof T>(defaultKey)
  const [direction, setDirection] = useState<'asc' | 'desc'>('asc')

  const sortedData = [...data].sort((a, b) => {
    const aValue = a[sortKey]
    const bValue = b[sortKey]
    if (aValue === bValue) return 0
    if (direction === 'asc') return aValue > bValue ? 1 : -1
    return aValue < bValue ? 1 : -1
  })

  const toggleSort = (key: keyof T) => {
    if (sortKey === key) setDirection(direction === 'asc' ? 'desc' : 'asc')
    else {
      setSortKey(key)
      setDirection('asc')
    }
  }

  return { sortedData, sortKey, direction, toggleSort }
}