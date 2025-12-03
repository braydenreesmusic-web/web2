# 📖 API Usage Examples

This guide shows you how to replace mock data with real backend calls using the API service.

## Authentication

```jsx
import { useAuth } from '../contexts/AuthContext'

function MyComponent() {
  const { user, signIn, signOut, signUp, resetPassword } = useAuth()
  
  // User info
  console.log(user.id, user.email, user.user_metadata.name)
  
  // Sign in
  const handleLogin = async () => {
    const { error } = await signIn(email, password)
    if (error) console.error(error)
  }
  
  // Sign up
  const handleRegister = async () => {
    const { error } = await signUp(email, password, { name: 'John' })
    if (error) console.error(error)
  }
}
```

## Fetching Data

### Get Check-ins

```jsx
import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getCheckIns } from '../services/api'

function CheckInsComponent() {
  const { user } = useAuth()
  const [checkIns, setCheckIns] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadCheckIns() {
      try {
        const data = await getCheckIns(user.id)
        setCheckIns(data)
      } catch (error) {
        console.error('Error loading check-ins:', error)
      } finally {
        setLoading(false)
      }
    }
    
    if (user) loadCheckIns()
  }, [user])

  if (loading) return <div>Loading...</div>
  
  return (
    <div>
      {checkIns.map(checkIn => (
        <div key={checkIn.id}>
          {checkIn.emotion} - Energy: {checkIn.energy}
        </div>
      ))}
    </div>
  )
}
```

### Get Events

```jsx
import { getEvents } from '../services/api'

const events = await getEvents(user.id)
// Returns: [{ id, title, date, time, location, category, recurring }, ...]
```

### Get Media

```jsx
import { getMedia } from '../services/api'

// Get all media
const allMedia = await getMedia(user.id)

// Get only photos
const photos = await getMedia(user.id, 'photo')

// Get only videos
const videos = await getMedia(user.id, 'video')
```

## Creating Data

### Create Check-in

```jsx
import { createCheckIn } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

function DailyCheckIn() {
  const { user } = useAuth()
  
  const handleSubmit = async (formData) => {
    const checkIn = await createCheckIn({
      user_id: user.id,
      date: new Date().toISOString().slice(0, 10),
      emotion: formData.emotion,
      energy: formData.energy,
      love_language: formData.loveLanguage
    })
    
    console.log('Created check-in:', checkIn)
  }
}
```

### Create Event

```jsx
import { createEvent } from '../services/api'

const event = await createEvent({
  user_id: user.id,
  title: 'Date Night',
  date: '2025-12-10',
  time: '19:00',
  location: 'Restaurant',
  category: 'Together',
  recurring: false
})
```

### Upload Media

```jsx
import { uploadMedia } from '../services/api'

function PhotoUpload() {
  const { user } = useAuth()
  
  const handleFileUpload = async (event) => {
    const file = event.target.files[0]
    
    const media = await uploadMedia(file, {
      user_id: user.id,
      type: 'photo',
      caption: 'Beautiful moment',
      location: 'Park',
      date: new Date().toISOString().slice(0, 10),
      favorite: false
    })
    
    console.log('Uploaded:', media.url)
  }
  
  return <input type="file" onChange={handleFileUpload} accept="image/*" />
}
```

### Create Note

```jsx
import { createNote } from '../services/api'

const note = await createNote({
  user_id: user.id,
  author: user.user_metadata.name,
  content: 'Had an amazing day together!',
  date: new Date().toISOString().slice(0, 10)
})
```

## Updating Data

### Update Event

```jsx
import { updateEvent } from '../services/api'

const updated = await updateEvent(eventId, {
  title: 'Updated Title',
  location: 'New Location'
})
```

### Toggle Photo Favorite

```jsx
import { toggleMediaFavorite } from '../services/api'

const handleToggleFavorite = async (photoId, currentStatus) => {
  await toggleMediaFavorite(photoId, !currentStatus)
}
```

### Update Task

```jsx
import { updateTask } from '../services/api'

const handleToggleComplete = async (taskId) => {
  await updateTask(taskId, { completed: true })
}
```

### Update Bookmark

```jsx
import { updateBookmark } from '../services/api'

const markAsVisited = async (bookmarkId) => {
  await updateBookmark(bookmarkId, { visited: true })
}
```

## Real-time Subscriptions

### Subscribe to Check-ins

```jsx
import { useEffect } from 'react'
import { subscribeToCheckIns } from '../services/api'

function LiveCheckIns() {
  const { user } = useAuth()
  const [checkIns, setCheckIns] = useState([])
  
  useEffect(() => {
    // Subscribe to real-time updates
    const subscription = subscribeToCheckIns(user.id, (payload) => {
      console.log('Real-time update:', payload)
      
      if (payload.eventType === 'INSERT') {
        setCheckIns(prev => [payload.new, ...prev])
      }
    })
    
    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe()
    }
  }, [user])
  
  return <div>{/* Render check-ins */}</div>
}
```

### Subscribe to Notes

```jsx
import { subscribeToNotes } from '../services/api'

useEffect(() => {
  const subscription = subscribeToNotes(user.id, (payload) => {
    if (payload.eventType === 'INSERT') {
      setNotes(prev => [payload.new, ...prev])
    }
  })
  
  return () => subscription.unsubscribe()
}, [user])
```

## Location Features

### Create Map Pin

```jsx
import { createPin } from '../services/api'

const handleAddPin = async (lat, lng) => {
  const pin = await createPin({
    user_id: user.id,
    lat,
    lng,
    title: 'First Date',
    description: 'Where we first met',
    date: '2024-02-14',
    photo: null
  })
}
```

### Update Location Share

```jsx
import { updateLocationShare } from '../services/api'

const shareLocation = async () => {
  navigator.geolocation.getCurrentPosition(async (position) => {
    await updateLocationShare(
      user.id,
      position.coords.latitude,
      position.coords.longitude,
      true
    )
  })
}
```

## Bookmarks

### Create Bookmark

```jsx
import { createBookmark } from '../services/api'

const savePlace = async () => {
  await createBookmark({
    user_id: user.id,
    title: 'Amazing Restaurant',
    category: 'Restaurants',
    url: 'https://example.com',
    notes: 'Great pasta!',
    visited: false
  })
}
```

## Insights

### Get and Mark as Read

```jsx
import { getInsights, markInsightAsRead } from '../services/api'

const insights = await getInsights(user.id)

const handleReadInsight = async (insightId) => {
  await markInsightAsRead(insightId)
}
```

## Error Handling Best Practices

```jsx
import { getEvents } from '../services/api'

async function loadData() {
  try {
    const events = await getEvents(user.id)
    setEvents(events)
  } catch (error) {
    console.error('Failed to load events:', error)
    // Show user-friendly error message
    setError('Could not load events. Please try again.')
  } finally {
    setLoading(false)
  }
}
```

## Complete Example: Events Page

```jsx
import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getEvents, createEvent, deleteEvent } from '../services/api'

export default function EventsPage() {
  const { user } = useAuth()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  // Load events on mount
  useEffect(() => {
    async function load() {
      try {
        const data = await getEvents(user.id)
        setEvents(data)
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user])

  // Add event
  const handleAddEvent = async (eventData) => {
    const newEvent = await createEvent({
      ...eventData,
      user_id: user.id
    })
    setEvents([...events, newEvent])
  }

  // Delete event
  const handleDeleteEvent = async (eventId) => {
    await deleteEvent(eventId)
    setEvents(events.filter(e => e.id !== eventId))
  }

  if (loading) return <div>Loading...</div>

  return (
    <div>
      {events.map(event => (
        <div key={event.id}>
          <h3>{event.title}</h3>
          <p>{event.date} at {event.time}</p>
          <button onClick={() => handleDeleteEvent(event.id)}>Delete</button>
        </div>
      ))}
    </div>
  )
}
```

## Tips

1. **Always check if user is authenticated** before making API calls
2. **Use try-catch blocks** for error handling
3. **Show loading states** while fetching data
4. **Clean up subscriptions** in useEffect return function
5. **Optimistic UI updates** - update local state immediately, then sync with backend
6. **Debounce rapid updates** to avoid overwhelming the database

## Common Patterns

### Loading State Pattern
```jsx
const [data, setData] = useState([])
const [loading, setLoading] = useState(true)
const [error, setError] = useState(null)
```

### Fetch-on-Mount Pattern
```jsx
useEffect(() => {
  async function fetchData() {
    try {
      const result = await apiFunction(user.id)
      setData(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  fetchData()
}, [user])
```

### Optimistic Update Pattern
```jsx
const handleUpdate = async (id, updates) => {
  // Update UI immediately
  setData(data.map(item => 
    item.id === id ? { ...item, ...updates } : item
  ))
  
  // Sync with backend
  try {
    await updateItem(id, updates)
  } catch (error) {
    // Revert on error
    setData(originalData)
    alert('Update failed')
  }
}
```

Happy coding! 🚀
