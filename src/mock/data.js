export const mock = {
  user: { id: 'u1', name: 'Alex', email: 'alex@example.com' },
  relationshipData: {
    startDate: '2024-06-01',
    partnerA: 'Alex',
    partnerB: 'Sam',
    savingsGoal: 5000,
    savingsCurrent: 2250,
  },
  checkIns: [
    { id: 1, user: 'Alex', date: '2025-12-02', emotion: 'happy', energy: 7, loveLanguage: 'words' },
    { id: 2, user: 'Sam', date: '2025-12-02', emotion: 'tired', energy: 4, loveLanguage: 'quality' },
  ],
  events: [
    { id: 1, title: 'Date Night', date: '2025-12-05', time: '19:00', location: 'Olive Garden', category: 'Together', recurring: false },
    { id: 2, title: 'Anniversary', date: '2026-01-10', time: '18:00', location: 'Downtown', category: 'Anniversary', recurring: true },
  ],
  sharedTasks: [
    { id: 1, title: 'Buy flowers', list: 'To-Do', completed: false, addedBy: 'Alex' },
    { id: 2, title: 'Milk, eggs', list: 'Groceries', completed: false, addedBy: 'Sam' },
  ],
  dateIdeas: [
    { id: 1, idea: 'Sunset picnic', used: false },
    { id: 2, idea: 'Board game cafe', used: false },
  ],
  notes: [
    { id: 1, author: 'Alex', content: 'Loved our walk today', date: '2025-12-01' },
    { id: 2, author: 'Sam', content: 'Thanks for the coffee ☕', date: '2025-12-02' },
  ],
  photos: [
    { id: 1, url: 'https://placekitten.com/400/300', caption: 'Cute moment', location: 'Park', date: '2025-11-30', favorite: true },
    { id: 2, url: 'https://placekitten.com/401/300', caption: 'Dinner', location: 'Olive Garden', date: '2025-10-10', favorite: false },
  ],
  videos: [
    { id: 1, url: 'https://samplelib.com/lib/preview/mp4/sample-5s.mp4', caption: 'Clip', date: '2025-09-12' },
  ],
  music: [
    { id: 1, title: 'Song A', artist: 'Artist', album: 'Album A', url: 'https://open.spotify.com', mood: 'happy' },
  ],
  playlists: [
    { id: 1, name: 'Us 💞', description: 'Our songs', songs: [1] },
  ],
  listeningSessions: [
    { id: 1, user: 'Alex', musicId: 1, start: '2025-12-02T20:00:00Z', end: null, active: true },
  ],
  pins: [
    { id: 1, lat: 37.7749, lng: -122.4194, title: 'First Date', description: 'Best night', date: '2024-02-14', photo: 1 },
  ],
  locationShares: [
    { id: 1, user: 'Alex', lat: 37.78, lng: -122.42, active: true, updated: '2025-12-02T21:00:00Z' },
  ],
  bookmarks: [
    { id: 1, title: 'Olive Garden', category: 'Restaurants', url: 'https://olivegarden.com', notes: 'Great breadsticks', visited: true },
  ],
  relationshipInsights: [
    { id: 1, type: 'communication', title: 'Celebrate small wins', content: 'Acknowledge daily efforts to boost morale.', read: false },
  ],
}