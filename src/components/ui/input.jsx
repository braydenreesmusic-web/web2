import { forwardRef } from 'react'

function BaseInput({ as: Component = 'input', className = '', ...props }, ref) {
  const base = 'input'
  const merged = `${base} ${className}`.trim()
  if (Component === 'textarea') {
    return <textarea ref={ref} className={merged} {...props} />
  }
  return <input ref={ref} className={merged} {...props} />
}

const Input = forwardRef(BaseInput)
Input.displayName = 'Input'

export default Input
