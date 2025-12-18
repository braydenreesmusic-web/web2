import { useState, useEffect } from 'react'
import Dialog from '../ui/dialog'
import Input from '../ui/input'
import Button from '../ui/button'
import Textarea from '../ui/textarea'
import { useToast } from '../../contexts/ToastContext'
import { updateEvent, deleteEvent } from '../../lib/lazyApi'

export default function EventDetail({ open, event, onClose, onUpdated, onDeleted }) {
  const { showToast } = useToast()
  const [title, setTitle] = useState(event?.title || '')
  const [date, setDate] = useState(event ? new Date(event.date).toISOString().slice(0,16) : '')
  const [category, setCategory] = useState(event?.category || 'Other')
  const [note, setNote] = useState(event?.note || '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setTitle(event?.title || '')
    setDate(event ? new Date(event.date).toISOString().slice(0,16) : '')
    setCategory(event?.category || 'Other')
    setNote(event?.note || '')
  }, [event])

  const handleSave = async () => {
    if (!event) return
    setSaving(true)
    try {
      const updates = {
        title: title || event.title,
        date: date ? new Date(date).toISOString() : event.date,
        category,
        note
      }
      const updated = await updateEvent(event.id, updates)
      showToast && showToast('Event updated', { type: 'success' })
      onUpdated && onUpdated(updated)
      onClose && onClose()
    } catch (e) {
      console.error('updateEvent failed', e)
      showToast && showToast('Failed to update event', { type: 'error' })
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!event) return
    const ok = confirm('Delete this event?')
    if (!ok) return
    try {
      await deleteEvent(event.id)
      showToast && showToast('Event deleted', { type: 'success' })
      onDeleted && onDeleted(event.id)
      onClose && onClose()
    } catch (e) {
      console.error('deleteEvent failed', e)
      showToast && showToast('Failed to delete event', { type: 'error' })
    }
  }

  return (
    <Dialog open={Boolean(open)} onClose={onClose} title={event ? 'Event details' : 'Event'}>
      {event ? (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500">Title</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-500">Date & time</label>
            <input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} className="input" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Category</label>
            <Input value={category} onChange={e => setCategory(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-500">Note</label>
            <Textarea value={note} onChange={e => setNote(e.target.value)} />
          </div>
          <div className="flex items-center justify-end gap-2">
            <button className="btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn-ghost bg-red-50 text-red-700" onClick={handleDelete}>Delete</button>
            <button className="btn" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      ) : (
        <div>No event selected.</div>
      )}
    </Dialog>
  )
}
