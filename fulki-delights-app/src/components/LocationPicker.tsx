import { useRef, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { ChevronDown, LocateFixed, Loader2, MapPin, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog'
import { searchLocations } from '@/lib/location.functions'
import type { Coords } from '@/hooks/use-nearby'

type Place = { id: string; name: string; address: string; coords: Coords }
export function LocationPicker({ label, coords, onSelect }: { label: string; coords: Coords | null; onSelect: (coords: Coords, label: string) => void }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [places, setPlaces] = useState<Place[]>([])
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)
  const [busy, setBusy] = useState<'device' | 'search' | null>(null)
  const search = useServerFn(searchLocations)
  const generation = useRef(0)
  const lastSearch = useRef(0)
  const changeOpen = (next: boolean) => { generation.current++; setOpen(next); setBusy(null); setError('') }
  const useDevice = () => {
    if (!navigator.geolocation) { setError('Device location is not available. Search for your area instead.'); return }
    const version = ++generation.current
    setBusy('device'); setError('')
    navigator.geolocation.getCurrentPosition(pos => {
      if (version !== generation.current) return
      onSelect({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }, 'Your current location')
      changeOpen(false)
    }, e => {
      if (version !== generation.current) return
      setBusy(null)
      setError(e.code === e.PERMISSION_DENIED ? 'Location access was denied. Allow it in your browser settings or search for your area.' : 'Could not get your location. Try again or search for your area.')
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 })
  }
  const find = async () => {
    if (busy || query.trim().length < 3 || Date.now() - lastSearch.current < 1000) return
    lastSearch.current = Date.now()
    const version = ++generation.current
    setBusy('search'); setError(''); setPlaces([]); setSearched(false)
    try {
      const result = await search({ data: { query: query.trim(), bias: coords } })
      if (version !== generation.current) return
      setPlaces(result.places); setError(result.error ?? ''); setSearched(true)
    } catch { if (version === generation.current) setError('Could not search right now. Try again or use device location.') }
    finally { if (version === generation.current) setBusy(null) }
  }
  return <Dialog open={open} onOpenChange={changeOpen}>
    <DialogTrigger asChild><Button variant="ghost" className="mb-4 h-auto max-w-full justify-start gap-2 rounded-full px-0 py-2 text-left" aria-label={`Change location: ${label}`}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-primary"><LocateFixed className="h-5 w-5" /></span>
      <span className="min-w-0"><span className="block text-[10px] font-semibold text-muted-foreground">CURRENT LOCATION</span><span className="block max-w-64 truncate text-xs font-bold">{label}</span></span><ChevronDown className="h-4 w-4 shrink-0 text-primary" />
    </Button></DialogTrigger>
    <DialogContent className="max-h-[85svh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-lg bg-card shadow-food">
      <DialogHeader><DialogTitle className="font-display text-2xl">Choose your location</DialogTitle><DialogDescription>Find kitchens near your device or a selected area.</DialogDescription></DialogHeader>
      <Button variant="secondary" onClick={useDevice} disabled={busy !== null} className="h-12 justify-start rounded-md bg-accent text-accent-foreground">{busy === 'device' ? <Loader2 className="animate-spin" /> : <LocateFixed />}Use device location</Button>
      <form onSubmit={e => { e.preventDefault(); void find() }} className="flex gap-2">
        <Input aria-label="Search area or address" placeholder="Area, landmark or address" value={query} maxLength={160} onChange={e => { generation.current++; setBusy(null); setQuery(e.target.value); setPlaces([]); setError(''); setSearched(false) }} className="h-12 min-w-0 rounded-md bg-background" />
        <Button type="submit" size="icon" disabled={busy !== null || query.trim().length < 3} aria-label="Find location" className="h-12 w-12 shrink-0 rounded-md">{busy === 'search' ? <Loader2 className="animate-spin" /> : <Search />}</Button>
      </form>
      <div className="min-h-16" aria-live="polite">
        {error && <p role="alert" className="text-sm leading-relaxed text-destructive">{error}</p>}
        {!error && searched && places.length === 0 && <p className="text-sm text-muted-foreground">No locations found. Try a nearby landmark or city.</p>}
        {places.length > 0 && <ul className="divide-y divide-line">{places.map(place => <li key={place.id}><Button variant="ghost" onClick={() => { onSelect(place.coords, place.name); changeOpen(false) }} className="h-auto w-full justify-start gap-3 whitespace-normal px-1 py-4 text-left"><MapPin className="h-5 w-5 shrink-0 text-primary" /><span className="min-w-0"><span className="block text-sm font-bold">{place.name}</span><span className="mt-1 block text-xs font-normal text-muted-foreground">{place.address}</span></span></Button></li>)}</ul>}
      </div>
      <p className="text-right text-xs text-muted-foreground">Powered by Google Maps</p>
    </DialogContent>
  </Dialog>
}
