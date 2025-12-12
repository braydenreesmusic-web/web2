import { motion } from 'framer-motion';

export default function Button({ children, className = '', variant = 'solid', size = 'md', ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed';
  const sizes = {
    sm: 'px-3 py-1.5 text-sm rounded-md',
    md: 'px-4 py-2 rounded-lg',
    lg: 'px-5 py-3 text-base rounded-xl',
  };
  const variants = {
    solid: 'expensive-btn',
    outline: 'btn-outline',
    ghost: 'btn-ghost',
  };

  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      type={props.type ?? 'button'}
      {...props}
    >
      {children}
    </motion.button>
  )
}