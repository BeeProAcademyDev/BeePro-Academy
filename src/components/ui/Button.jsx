import { forwardRef } from 'react'
import { Link } from 'react-router-dom'

const Button = forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  loading = false,
  icon: Icon,
  iconPosition = 'start',
  fullWidth = false,
  as = 'button',
  to,
  href,
  ...props
}, ref) => {
  
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
  
  const variants = {
    primary: 'bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500 active:scale-95',
    secondary: 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200 dark:bg-dark-card dark:text-dark-text dark:hover:bg-dark-border focus:ring-secondary-500',
    outline: 'border-2 border-primary-500 text-primary-500 hover:bg-primary-500 hover:text-white focus:ring-primary-500',
    ghost: 'text-secondary-600 hover:bg-secondary-100 dark:text-dark-text dark:hover:bg-dark-card focus:ring-secondary-500',
    danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500 active:scale-95',
    success: 'bg-green-500 text-white hover:bg-green-600 focus:ring-green-500 active:scale-95',
    link: 'text-primary-500 hover:text-primary-600 underline-offset-4 hover:underline focus:ring-primary-500',
  }

  const sizes = {
    xs: 'px-3 py-1.5 text-xs gap-1.5',
    sm: 'px-4 py-2 text-sm gap-2',
    md: 'px-6 py-3 text-base gap-2',
    lg: 'px-8 py-4 text-lg gap-3',
    xl: 'px-10 py-5 text-xl gap-3',
  }

  const classes = `
    ${baseStyles}
    ${variants[variant]}
    ${sizes[size]}
    ${fullWidth ? 'w-full' : ''}
    ${className}
  `.trim()

  const content = (
    <>
      {loading && (
        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {Icon && iconPosition === 'start' && !loading && <Icon className="w-5 h-5" />}
      {children}
      {Icon && iconPosition === 'end' && !loading && <Icon className="w-5 h-5" />}
    </>
  )

  // Render as Link (internal)
  if (to) {
    return (
      <Link to={to} ref={ref} className={classes} {...props}>
        {content}
      </Link>
    )
  }

  // Render as anchor (external)
  if (href) {
    return (
      <a href={href} ref={ref} className={classes} target="_blank" rel="noopener noreferrer" {...props}>
        {content}
      </a>
    )
  }

  // Render as custom element
  if (as !== 'button') {
    const Component = as
    return (
      <Component ref={ref} className={classes} disabled={disabled || loading} {...props}>
        {content}
      </Component>
    )
  }

  // Default button
  return (
    <button ref={ref} className={classes} disabled={disabled || loading} {...props}>
      {content}
    </button>
  )
})

Button.displayName = 'Button'

export default Button