// Thin lazy wrapper around ../services/api to avoid importing that module
// at module-evaluation time (prevents TDZ/circular import issues). Each
// exported function dynamically imports the real api module when invoked.

const apiPromise = () => import('../services/api')

const wrap = (name) => {
  return async (...args) => {
    const api = await apiPromise()
    if (!(name in api)) throw new Error(`lazyApi: ${name} not found on services/api`)
    return api[name](...args)
  }
}

// List of common functions used across the app. Add more as needed.
const fns = [
  'getEvents','createEvent','deleteEvent','getTasks','createTask','updateTask',
  'getSavingsGoals','createSavingsGoal','addContribution','deleteSavingsGoal',
  'getPins','createPin','updateLocationShare',
  'getCheckIns','getNotes','getMedia','getPresence','getRelationshipData',
  'createCheckIn',
  'updateRelationshipData',
  'getBookmarks','createBookmark','updateBookmark','deleteBookmark','bulkUpdateBookmarkOrder',
  'getProfileById',
  'uploadMedia','toggleMediaFavorite','updateMedia','createNote',
  'sendPartnerRequest','getPartnerRequests','acceptPartnerRequest','rejectPartnerRequest','subscribeToPartnerRequests',
  'getGameEvents','createGameEvent','subscribeToGameEvents',
  'getMusicTracks','getPlaylists','searchItunesMusic','saveMusicTrack','createPlaylist','getPlaylistTracks','addTrackToPlaylist',
  'updatePresence','subscribeToPresence','subscribeToListeningSession','updateListeningSession','triggerNotification'
]

// Export each wrapper as a static named export so bundlers (Rollup/Vite)
// can statically analyze the module. Dynamic destructuring prevented
// Rollup from recognizing exported names during build.
export const getEvents = wrap('getEvents')
export const createEvent = wrap('createEvent')
export const deleteEvent = wrap('deleteEvent')
export const getTasks = wrap('getTasks')
export const createTask = wrap('createTask')
export const updateTask = wrap('updateTask')
export const updateEvent = wrap('updateEvent')

export const getSavingsGoals = wrap('getSavingsGoals')
export const createSavingsGoal = wrap('createSavingsGoal')
export const addContribution = wrap('addContribution')
export const deleteSavingsGoal = wrap('deleteSavingsGoal')

export const getPins = wrap('getPins')
export const createPin = wrap('createPin')
export const updateLocationShare = wrap('updateLocationShare')

export const getCheckIns = wrap('getCheckIns')
export const createCheckIn = wrap('createCheckIn')
export const getNotes = wrap('getNotes')
export const subscribeToNotes = wrap('subscribeToNotes')
export const getMedia = wrap('getMedia')
export const getPresence = wrap('getPresence')
export const getRelationshipData = wrap('getRelationshipData')
export const updateRelationshipData = wrap('updateRelationshipData')

export const getBookmarks = wrap('getBookmarks')
export const createBookmark = wrap('createBookmark')
export const updateBookmark = wrap('updateBookmark')
export const deleteBookmark = wrap('deleteBookmark')
export const bulkUpdateBookmarkOrder = wrap('bulkUpdateBookmarkOrder')

export const getProfileById = wrap('getProfileById')

export const getInsights = wrap('getInsights')
export const markInsightAsRead = wrap('markInsightAsRead')

export const uploadMedia = wrap('uploadMedia')
export const toggleMediaFavorite = wrap('toggleMediaFavorite')
export const updateMedia = wrap('updateMedia')
export const createNote = wrap('createNote')

export const sendPartnerRequest = wrap('sendPartnerRequest')
export const getPartnerRequests = wrap('getPartnerRequests')
export const acceptPartnerRequest = wrap('acceptPartnerRequest')
export const rejectPartnerRequest = wrap('rejectPartnerRequest')
export const subscribeToPartnerRequests = wrap('subscribeToPartnerRequests')

export const getGameEvents = wrap('getGameEvents')
export const createGameEvent = wrap('createGameEvent')
export const subscribeToGameEvents = wrap('subscribeToGameEvents')

export const getMusicTracks = wrap('getMusicTracks')
export const getPlaylists = wrap('getPlaylists')
export const searchItunesMusic = wrap('searchItunesMusic')
export const saveMusicTrack = wrap('saveMusicTrack')
export const createPlaylist = wrap('createPlaylist')
export const getPlaylistTracks = wrap('getPlaylistTracks')
export const addTrackToPlaylist = wrap('addTrackToPlaylist')

export const updatePresence = wrap('updatePresence')
export const subscribeToPresence = wrap('subscribeToPresence')
export const subscribeToListeningSession = wrap('subscribeToListeningSession')
export const updateListeningSession = wrap('updateListeningSession')
export const triggerNotification = wrap('triggerNotification')

const defaultExport = {
  getEvents,createEvent,deleteEvent,updateEvent,getTasks,createTask,updateTask,
  getSavingsGoals,createSavingsGoal,addContribution,deleteSavingsGoal,
  getPins,createPin,updateLocationShare,
  getCheckIns,getNotes,getMedia,getPresence,getRelationshipData,
  subscribeToNotes,
  getInsights,markInsightAsRead,
  getBookmarks,createBookmark,updateBookmark,deleteBookmark,bulkUpdateBookmarkOrder,
  getProfileById,
  uploadMedia,toggleMediaFavorite,updateMedia,createNote,
  sendPartnerRequest,getPartnerRequests,acceptPartnerRequest,rejectPartnerRequest,subscribeToPartnerRequests,
  getGameEvents,createGameEvent,subscribeToGameEvents,
  getMusicTracks,getPlaylists,searchItunesMusic,saveMusicTrack,createPlaylist,getPlaylistTracks,addTrackToPlaylist,
  updatePresence,subscribeToPresence,subscribeToListeningSession,updateListeningSession,triggerNotification
}

export default defaultExport
