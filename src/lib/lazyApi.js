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
  'getBookmarks','createBookmark','updateBookmark','deleteBookmark','bulkUpdateBookmarkOrder',
  'getProfileById',
  'uploadMedia','toggleMediaFavorite','updateMedia','createNote',
  'sendPartnerRequest','getPartnerRequests','acceptPartnerRequest','rejectPartnerRequest','subscribeToPartnerRequests',
  'getGameEvents','createGameEvent','subscribeToGameEvents',
  'getMusicTracks','getPlaylists','searchItunesMusic','saveMusicTrack','createPlaylist','getPlaylistTracks','addTrackToPlaylist',
  'updatePresence','subscribeToPresence','subscribeToListeningSession','updateListeningSession','triggerNotification'
]

const exportsObj = {}
for (const n of fns) exportsObj[n] = wrap(n)

export default exportsObj
export const {
  getEvents,createEvent,deleteEvent,getTasks,createTask,updateTask,
  getSavingsGoals,createSavingsGoal,addContribution,deleteSavingsGoal,
  getPins,createPin,updateLocationShare,
  getCheckIns,getNotes,getMedia,getPresence,getRelationshipData,
  getBookmarks,createBookmark,updateBookmark,deleteBookmark,bulkUpdateBookmarkOrder,
  getProfileById,
  uploadMedia,toggleMediaFavorite,updateMedia,createNote,
  sendPartnerRequest,getPartnerRequests,acceptPartnerRequest,rejectPartnerRequest,subscribeToPartnerRequests,
  getGameEvents,createGameEvent,subscribeToGameEvents,
  getMusicTracks,getPlaylists,searchItunesMusic,saveMusicTrack,createPlaylist,getPlaylistTracks,addTrackToPlaylist,
  updatePresence,subscribeToPresence,subscribeToListeningSession,updateListeningSession,triggerNotification
} = exportsObj
