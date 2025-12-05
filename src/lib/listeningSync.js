// Small helper utilities for leader/follower listening sync

// If follower's audio playback drifts away from leader, apply small corrections.
// This is intentionally simple: if drift > seekThreshold, do a hard seek.
// If drift is small but persistent, apply slight playbackRate nudges.

export const DEFAULT_CONFIG = {
  seekThreshold: 1.5, // seconds before we perform a hard seek
  nudgeThreshold: 0.2, // seconds to start nudging playbackRate
  nudgeRate: 1.02, // small playback rate to speed up
  slowRate: 0.98, // small playback rate to slow down
}

export function syncToLeader(audioEl, leaderSession, config = {}) {
  if (!audioEl || !leaderSession) return
  const cfg = { ...DEFAULT_CONFIG, ...config }

  const leaderPos = Number(leaderSession.playback_position || 0)
  const leaderPlaying = !!leaderSession.is_playing

  const localPos = audioEl.currentTime || 0
  const drift = localPos - leaderPos

  // If leader is not playing, pause follower
  if (!leaderPlaying) {
    if (!audioEl.paused) audioEl.pause()
    return
  }

  // If leader is playing, ensure follower is playing
  if (audioEl.paused) {
    // Try to play; caller must handle autoplay policies
    const p = audioEl.play()
    if (p && p.catch) p.catch(() => {})
  }

  // Hard seek when drift is large
  if (Math.abs(drift) > cfg.seekThreshold) {
    audioEl.currentTime = leaderPos
    audioEl.playbackRate = 1
    return
  }

  // Small nudge adjustments when drift is noticeable but not huge
  if (drift > cfg.nudgeThreshold) {
    // local ahead of leader -> slightly slow down
    audioEl.playbackRate = cfg.slowRate
  } else if (drift < -cfg.nudgeThreshold) {
    // local behind leader -> speed up a bit
    audioEl.playbackRate = cfg.nudgeRate
  } else {
    // close enough -> normal rate
    audioEl.playbackRate = 1
  }
}

export function stopSync(audioEl) {
  if (!audioEl) return
  audioEl.playbackRate = 1
}
