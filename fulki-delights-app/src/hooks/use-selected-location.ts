import { useEffect, useState } from 'react'
import type { Coords, NearbyStatus } from './use-nearby'
export type SelectedLocation = { coords: Coords; label: string; timestamp: number }
const KEY = 'reservd:selected-location'
export function useSelectedLocation(device: { coords: Coords | null; status: NearbyStatus }) {
  const [selected, setSelected] = useState<SelectedLocation | null>(null)
  useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem(KEY) ?? 'null') as SelectedLocation | null
      if (data && Date.now() - data.timestamp < 600000 && Number.isFinite(data.coords?.latitude) && Number.isFinite(data.coords?.longitude) && Math.abs(data.coords.latitude) <= 90 && Math.abs(data.coords.longitude) <= 180) setSelected(data)
    } catch {}
  }, [])
  const select = (coords: Coords, label: string) => {
    const value = { coords, label, timestamp: Date.now() }
    setSelected(value)
    try { localStorage.setItem(KEY, JSON.stringify(value)) } catch {}
  }
  return { coords: selected?.coords ?? device.coords, status: selected ? 'ready' as const : device.status, label: selected?.label ?? (device.coords ? 'Your current location' : 'Choose your location'), select }
}
