export default function Button({ children, className = '', ...props }) {
  return (
    <button
      className={`bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-full px-4 py-2 shadow-lg hover:shadow-xl transition-all ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}