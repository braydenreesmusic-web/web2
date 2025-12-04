import { motion } from 'framer-motion';

export default function Button({ children, className = '', ...props }) {
  return (
    <motion.button
      whileHover={{ y: -3, boxShadow: '0 16px 32px rgba(0,0,0,0.16)' }}
      whileTap={{ scale: 0.97 }}
      className={`expensive-btn ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}