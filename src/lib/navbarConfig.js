/**
 * Page-aware navigation links for the unified site navbar.
 */
export function getNavbarContext(pathname = '', search = '') {
  if (pathname === '/') return 'landing'

  const params = new URLSearchParams(search)
  if (pathname.startsWith('/dashboard')) {
    if (params.get('tab') === 'admin') return 'admin'
    if (params.get('tab') === 'teacher') return 'teacher'
    return 'dashboard'
  }

  if (pathname.startsWith('/admin')) return 'admin'
  if (pathname.startsWith('/teacher')) return 'teacher'

  const marketingPaths = [
    '/financial-markets',
    '/data-analysis',
    '/it',
    '/programming',
    '/blogs',
    '/about',
    '/contact',
  ]
  if (marketingPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return 'marketing'
  }

  return 'app'
}

export function getNavbarLinks(context, { language = 'en', isAdmin = false, isTeacher = false, t = (key) => key } = {}) {
  const landingLinks = [
    { label: 'Financial Markets', href: '/financial-markets', type: 'route' },
    { label: 'Data Analysis', href: '/data-analysis', type: 'route' },
    { label: 'IT', href: '/it', type: 'route' },
    { label: language === 'ar' ? 'Blogs' : 'Blogs', href: '/blogs', type: 'route' },
    { label: 'Contact', href: '#contact', type: 'hash' },
  ]

  const appLinks = [
    { label: t('nav.home'), href: '/', type: 'route' },
    { label: t('nav.courses'), href: '/courses', type: 'route' },
    { label: language === 'ar' ? 'المدونة' : 'Blogs', href: '/blogs', type: 'route' },
    { label: t('nav.categories'), href: '/categories', type: 'route' },
    { label: t('nav.about'), href: '/about', type: 'route' },
    { label: t('nav.contact'), href: '/contact', type: 'route' },
  ]

  const dashboardLinks = [
    { label: t('nav.dashboard'), href: '/dashboard', type: 'route' },
    { label: t('nav.courses'), href: '/courses', type: 'route' },
    { label: language === 'ar' ? 'المدونة' : 'Blogs', href: '/blogs', type: 'route' },
    ...(isTeacher
      ? [{ label: language === 'ar' ? 'إدارة الكورسات' : 'Manage Courses', href: '/dashboard?tab=teacher', type: 'route' }]
      : []),
    ...(isAdmin
      ? [{ label: language === 'ar' ? 'لوحة الإدارة' : 'Admin Panel', href: '/dashboard?tab=admin', type: 'route' }]
      : []),
  ]

  const adminLinks = [
    { label: language === 'ar' ? 'لوحة الإدارة' : 'Admin Panel', href: '/dashboard?tab=admin', type: 'route' },
    { label: language === 'ar' ? 'إدارة المدونة' : 'Manage Blogs', href: '/admin/blogs', type: 'route' },
    { label: language === 'ar' ? 'المستخدمون' : 'Users', href: '/dashboard?tab=admin&sub=users', type: 'route' },
    { label: language === 'ar' ? 'المدفوعات' : 'Payments', href: '/dashboard?tab=admin&sub=payments', type: 'route' },
    { label: t('nav.courses'), href: '/courses', type: 'route' },
  ]

  const teacherLinks = [
    { label: language === 'ar' ? 'كورساتي' : 'My Courses', href: '/teacher/courses', type: 'route' },
    { label: language === 'ar' ? 'إنشاء كورس' : 'Create Course', href: '/teacher/create-course', type: 'route' },
    { label: language === 'ar' ? 'جلسة مباشرة' : 'Live Session', href: '/teacher/live-session', type: 'route' },
    { label: t('nav.dashboard'), href: '/dashboard', type: 'route' },
  ]

  const marketingLinks = [
    { label: 'Vision', href: '/#vision-mission', type: 'route' },
    { label: 'Financial Markets', href: '/financial-markets', type: 'route' },
    { label: 'Data Analysis', href: '/data-analysis', type: 'route' },
    { label: 'IT', href: '/it', type: 'route' },
    { label: t('nav.courses'), href: '/courses', type: 'route' },
    { label: language === 'ar' ? 'المدونة' : 'Blogs', href: '/blogs', type: 'route' },
    { label: 'Contact', href: '/#contact', type: 'route' },
  ]

  switch (context) {
    case 'landing':
      return landingLinks
    case 'dashboard':
      return dashboardLinks
    case 'admin':
      return adminLinks
    case 'teacher':
      return teacherLinks
    case 'marketing':
      return marketingLinks
    default:
      return appLinks
  }
}

export function isNavLinkActive(link, { pathname, search, hash }) {
  if (link.type === 'hash') {
    return pathname === '/' && hash === link.href
  }

  const [linkPath, linkQuery = ''] = link.href.split('?')
  if (pathname !== linkPath && !(linkPath !== '/' && pathname.startsWith(`${linkPath}/`))) {
    return false
  }

  if (!linkQuery) {
    return pathname === linkPath || (linkPath !== '/' && pathname.startsWith(`${linkPath}/`))
  }

  const expected = new URLSearchParams(linkQuery)
  const current = new URLSearchParams(search)
  for (const [key, value] of expected.entries()) {
    if (current.get(key) !== value) return false
  }
  return true
}
