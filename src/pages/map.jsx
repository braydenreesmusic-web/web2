import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useAuth } from '../contexts/AuthContext'
import { getPins, createPin, updateLocationShare } from '../services/api'

export default function MapPage() {
  const { user } = useAuth()
  const [pins, setPins] = useState([])
  const [center, setCenter] = useState([37.7749, -122.4194])
  const [pinTitle, setPinTitle] = useState('Memory Spot')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!user) return
    ;(async () => {
      try {
        const data = await getPins(user.id)
        setPins(data || [])
        // try to center on first pin if exists
        if (data && data.length) setCenter([data[0].lat, data[0].lng])
        else if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition((pos) => {
            setCenter([pos.coords.latitude, pos.coords.longitude])
          })
        }
      } catch (e) {
        console.error(e)
      }
    })()
  }, [user])

  const shareLocation = async () => {
    if (!navigator.geolocation) return
    setBusy(true)
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const { latitude, longitude } = pos.coords
        await updateLocationShare(user.id, latitude, longitude, true)
        setCenter([latitude, longitude])
      } catch (e) { console.error(e) } finally { setBusy(false) }
    }, () => setBusy(false))
  }

  const addPinHere = async () => {
    if (!navigator.geolocation) return
    setBusy(true)
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const { latitude, longitude } = pos.coords
        const saved = await createPin({
          user_id: user.id,
          title: pinTitle || 'Memory Spot',
          lat: latitude,
          lng: longitude,
          date: new Date().toISOString()
        })
        setPins(prev => [saved, ...prev])
        setCenter([latitude, longitude])
      } catch (e) { console.error(e) } finally { setBusy(false) }
    }, () => setBusy(false))
  }
  return (
    <section className="space-y-4">
      <div className="glass-card p-4 space-y-3">
        <div>Share your location and add memory pins.</div>
        <div className="grid md:grid-cols-3 gap-2">
          <input value={pinTitle} onChange={e=>setPinTitle(e.target.value)} placeholder="Pin title" className="px-3 py-2 rounded-xl border"/>
          <button onClick={addPinHere} disabled={busy} className="px-3 py-2 rounded-xl bg-gradient-to-r from-slate-700 to-slate-500 text-white disabled:opacity-60">Add Pin Here</button>
          <button onClick={shareLocation} disabled={busy} className="px-3 py-2 rounded-xl bg-gray-100 disabled:opacity-60">Share Location</button>
        </div>
      </div>
      <div className="rounded-2xl overflow-hidden shadow">
        <MapContainer center={center} zoom={12} style={{height:'400px', width:'100%'}}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {pins.map(p=> (
            <Marker key={p.id} position={[p.lat, p.lng]}>
              <Popup>{p.title} • {p.date}</Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </section>
  )
}