import { motion } from 'framer-motion'
import { Suspense } from 'react'

export default function PageTransition({ children }) {
  return (
    <Suspense fallback={<div className="w-full py-12 text-center">Loading…</div>}>
      <motion.div
        initial={{ opacity: 0, scale: 0.99 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.99 }}
        transition={{ duration: 0.28, ease: 'easeInOut' }}
        className="app-container"
      >
        {children}
      </motion.div>
    </Suspense>
  )
}
