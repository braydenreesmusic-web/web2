import { motion } from 'framer-motion'

export default function EmptyState({ icon, title, description, action }) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="card p-6 text-center">
      {icon && <div className="mx-auto w-12 h-12 flex items-center justify-center rounded-md" style={{backgroundColor: 'var(--accent-50)'}}>{icon}</div>}
      {title && <h3 className="text-lg font-semibold mb-2" style={{color: 'var(--text)'}}>{title}</h3>}
      {description && <p className="text-sm mb-4" style={{color: 'var(--muted)'}}>{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </motion.div>
  )
}
