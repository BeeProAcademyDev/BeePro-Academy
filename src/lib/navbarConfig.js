/**
 * Page-aware navigation links for the unified site navbar.
 */
export function getNavbarContext(pathname = "", search = "") {
  if (pathname === "/") return "landing";

  const params = new URLSearchParams(search);
  if (pathname.startsWith("/dashboard")) {
    if (params.get("tab") === "admin") return "admin";
    if (params.get("tab") === "teacher") return "teacher";
    return "dashboard";
  }

  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/teacher-dashboard")) return "teacher";
  if (pathname.startsWith("/teacher")) return "teacher";
  if (pathname.startsWith("/admin-dashboard")) return "admin";
  if (pathname === "/student-dashboard") return "dashboard";
  if (
    [
      "/my-courses",
      "/course-analytics",
      "/notifications",
      "/messages",
      "/calendar",
      "/payments",
      "/reports",
      "/settings",
      "/profile",
      "/student-dashboard",
    ].some((path) => pathname === path || pathname.startsWith(`${path}/`))
  ) {
    return "dashboard";
  }

  const marketingPaths = [
    "/financial-markets",
    "/data-analysis",
    "/it",
    "/blogs",
    "/about",
    "/contact",
  ];
  if (
    marketingPaths.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    )
  ) {
    return "marketing";
  }

  return "app";
}

export function getNavbarLinks(
  context,
  { isAdmin = false, isTeacher = false, t = (key) => key } = {},
) {
  const landingLinks = [
    {
      label: t("navExtra.financialMarkets"),
      href: "/financial-markets",
      type: "route",
    },
    {
      label: t("navExtra.dataAnalysis"),
      href: "/data-analysis",
      type: "route",
    },
    { label: t("navExtra.it"), href: "/it", type: "route" },
    { label: t("nav.blogs"), href: "/blogs", type: "route" },
    { label: t("nav.contact"), href: "#contact", type: "hash" },
  ];

  const appLinks = [
    { label: t("nav.home"), href: "/", type: "route" },
    { label: t("nav.courses"), href: "/courses", type: "route" },
    { label: t("nav.blogs"), href: "/blogs", type: "route" },
    { label: t("nav.categories"), href: "/categories", type: "route" },
    { label: t("nav.about"), href: "/about", type: "route" },
    { label: t("nav.contact"), href: "/contact", type: "route" },
  ];

  const studentLinks = [
    { label: t("nav.dashboard"), href: "/student-dashboard", type: "route" },
    { label: t("navExtra.myCourses"), href: "/my-courses", type: "route" },
    { label: t("nav.courses"), href: "/courses", type: "route" },
    { label: "Certificates", href: "/profile", type: "route" },
    { label: "Assessments", href: "/course-analytics", type: "route" },
    { label: "Meetings", href: "/calendar", type: "route" },
    { label: t("nav.profile"), href: "/profile", type: "route" },
  ];

  const adminLinks = [
    {
      label: t("nav.dashboard"),
      href: "/admin-dashboard",
      type: "route",
    },
    { label: "Users", href: "/admin-dashboard", type: "route" },
    { label: t("nav.courses"), href: "/courses", type: "route" },
    { label: "Blog", href: "/admin/blog", type: "route" },
    { label: "Categories", href: "/settings", type: "route" },
    { label: t("navExtra.payments"), href: "/payments", type: "route" },
    { label: "Reports", href: "/reports", type: "route" },
    { label: "Settings", href: "/settings", type: "route" },
  ];

  const teacherLinks = [
    { label: t("nav.dashboard"), href: "/teacher-dashboard", type: "route" },
    { label: t("navExtra.myCourses"), href: "/my-courses", type: "route" },
    { label: "Lessons", href: "/teacher/create-course", type: "route" },
    { label: "Assessments", href: "/course-analytics", type: "route" },
    { label: "Meetings", href: "/calendar", type: "route" },
    { label: "Students", href: "/my-courses", type: "route" },
    { label: "Blog", href: "/teacher/blog", type: "route" },
    { label: t("nav.profile"), href: "/profile", type: "route" },
  ];

  const marketingLinks = [
    { label: t("navExtra.vision"), href: "/#vision-mission", type: "route" },
    {
      label: t("navExtra.financialMarkets"),
      href: "/financial-markets",
      type: "route",
    },
    {
      label: t("navExtra.dataAnalysis"),
      href: "/data-analysis",
      type: "route",
    },
    { label: t("navExtra.it"), href: "/it", type: "route" },
    { label: t("nav.courses"), href: "/courses", type: "route" },
    { label: t("nav.blogs"), href: "/blogs", type: "route" },
    { label: t("nav.contact"), href: "/#contact", type: "route" },
  ];

  switch (context) {
    case "landing":
      return landingLinks;
    case "dashboard":
      if (isAdmin) return adminLinks;
      if (isTeacher) return teacherLinks;
      return studentLinks;
    case "admin":
      return adminLinks;
    case "teacher":
      return teacherLinks;
    case "marketing":
      return marketingLinks;
    default:
      return appLinks;
  }
}

export function isNavLinkActive(link, { pathname, search, hash }) {
  if (link.type === "hash") {
    return pathname === "/" && hash === link.href;
  }

  const [linkPath, linkQuery = ""] = link.href.split("?");
  if (
    pathname !== linkPath &&
    !(linkPath !== "/" && pathname.startsWith(`${linkPath}/`))
  ) {
    return false;
  }

  if (!linkQuery) {
    return (
      pathname === linkPath ||
      (linkPath !== "/" && pathname.startsWith(`${linkPath}/`))
    );
  }

  const expected = new URLSearchParams(linkQuery);
  const current = new URLSearchParams(search);
  for (const [key, value] of expected.entries()) {
    if (current.get(key) !== value) return false;
  }
  return true;
}
