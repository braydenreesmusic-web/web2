// Professional SVG icons for the app
export const Icons = {
  // Calendar & Schedule Icons
  Calendar: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="16" y1="2" x2="16" y2="6"></line>
      <line x1="8" y1="2" x2="8" y2="6"></line>
      <line x1="3" y1="10" x2="21" y2="10"></line>
    </svg>
  ),
  
  CheckCircle: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  ),
  
  Target: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <circle cx="12" cy="12" r="1"></circle>
      <circle cx="12" cy="12" r="5"></circle>
      <circle cx="12" cy="12" r="9"></circle>
    </svg>
  ),
  
  // Bookmark & Save Icons
  Bookmark: (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
    </svg>
  ),
  
  Image: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
      <circle cx="8.5" cy="8.5" r="1.5"></circle>
      <polyline points="21 15 16 10 5 21"></polyline>
    </svg>
  ),
  
  Copy: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
    </svg>
  ),
  
  Trash: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      <line x1="10" y1="11" x2="10" y2="17"></line>
      <line x1="14" y1="11" x2="14" y2="17"></line>
    </svg>
  ),
  
  Eye: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>
  ),
  
  // Category Icons (with styled backgrounds)
  CategoryBookmark: (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
    </svg>
  ),
  
  CategoryRestaurant: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4"></path>
      <line x1="9" y1="2" x2="9" y2="6"></line>
      <line x1="15" y1="2" x2="15" y2="6"></line>
    </svg>
  ),
  
  CategoryMovie: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect>
      <polyline points="17 2 12 7 7 2"></polyline>
    </svg>
  ),
  
  CategoryGift: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <polyline points="20 12 20 2 4 2 4 12"></polyline>
      <rect x="2" y="12" width="20" height="8" rx="1" ry="1"></rect>
      <line x1="6" y1="12" x2="6" y2="20"></line>
      <line x1="18" y1="12" x2="18" y2="20"></line>
      <path d="M12 2v10"></path>
    </svg>
  ),
  
  CategoryPlace: (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
      <circle cx="12" cy="10" r="3" fill="white"></circle>
    </svg>
  ),
  
  // Owner Icons
  OwnerHers: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <circle cx="12" cy="8" r="4"></circle>
      <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"></path>
      <path d="M12 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"></path>
    </svg>
  ),
  
  OwnerYours: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <circle cx="12" cy="8" r="4"></circle>
      <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"></path>
    </svg>
  ),
  
  OwnerTogether: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>
  ),
  
  // Action Icons
  Add: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  ),
  
  Link: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
    </svg>
  ),

  X: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  ),
  
  Drag: (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <circle cx="9" cy="5" r="1.5"></circle>
      <circle cx="15" cy="5" r="1.5"></circle>
      <circle cx="9" cy="12" r="1.5"></circle>
      <circle cx="15" cy="12" r="1.5"></circle>
      <circle cx="9" cy="19" r="1.5"></circle>
      <circle cx="15" cy="19" r="1.5"></circle>
    </svg>
  ),
  
  // Status Icons
  Star: (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <polygon points="12 2 15.09 10.26 24 10.26 17.55 15.7 19.64 23.74 12 18.54 4.36 23.74 6.45 15.7 0 10.26 8.91 10.26"></polygon>
    </svg>
  ),
  
  CheckBadge: (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M6.5 2h11a2 2 0 0 1 2 2v15a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"></path>
      <polyline points="10 13 12.5 15.5 16.5 10" fill="white" stroke="white" strokeWidth="2"></polyline>
    </svg>
  ),
}

// Styled Icon Wrapper Component
export function IconButton({ icon: Icon, label, onClick, variant = "default", size = "md", className = "" }) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
    xl: "w-8 h-8"
  }
  
  const variantClasses = {
    default: "text-gray-600 hover:text-gray-900",
    primary: "text-purple-600 hover:text-purple-700",
    success: "text-green-600 hover:text-green-700",
    danger: "text-red-600 hover:text-red-700",
    light: "text-gray-400 hover:text-gray-600"
  }
  
  return (
    <button 
      onClick={onClick}
      title={label}
      className={`inline-flex items-center justify-center transition-colors ${className}`}
    >
      <Icon className={`${sizeClasses[size]} ${variantClasses[variant]}`} />
    </button>
  )
}

// Category Badge Component with Icon
export function CategoryBadge({ category }) {
  const iconMap = {
    "Restaurants": Icons.CategoryRestaurant,
    "Movies/Shows": Icons.CategoryMovie,
    "Date Ideas": Icons.CategoryGift,
    "Gift Ideas": Icons.CategoryGift,
    "Places to Visit": Icons.CategoryPlace,
    "Other": Icons.CategoryBookmark,
    "Anniversary": Icons.Star,
    "Together": Icons.OwnerTogether,
    "Work": Icons.Link,
  }
  
  const Icon = iconMap[category] || Icons.CategoryBookmark
  
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
      <Icon className="w-3.5 h-3.5" />
      {category}
    </span>
  )
}

// Owner Badge Component with Icon
export function OwnerBadge({ owner }) {
  const iconMap = {
    "hers": Icons.OwnerHers,
    "yours": Icons.OwnerYours,
    "together": Icons.OwnerTogether,
  }
  
  const colorMap = {
    "hers": "bg-red-100 text-red-700",
    "yours": "bg-blue-100 text-blue-700",
    "together": "bg-purple-100 text-purple-700",
  }
  
  const Icon = iconMap[owner] || Icons.OwnerTogether
  const colors = colorMap[owner] || "bg-gray-100 text-gray-700"
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${colors}`}>
      <Icon className="w-3.5 h-3.5" />
      {owner.charAt(0).toUpperCase() + owner.slice(1)}
    </span>
  )
}
