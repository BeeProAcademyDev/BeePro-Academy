export const SITE_URL = "https://bepro-academy.com";
export const DEFAULT_TITLE = "BeePro Academy | منصة التعلم المتكاملة";
export const DEFAULT_DESCRIPTION =
  "BeePro Academy منصة تعليمية رائدة في البرمجة، تصميم الجرافيك، تكنولوجيا المعلومات، وتحليل الأسواق المالية.";
export const DEFAULT_KEYWORDS =
  "تعليم, برمجة, تكنولوجيا المعلومات, دورات تدريبية, كورس, اونلاين, تحليل اسواق, تعليم الكتروني";
export const DEFAULT_IMAGE = `${SITE_URL}/assets/platform-logo.png`;

export const buildCanonicalUrl = (pathname) =>
  `${SITE_URL}${pathname}`.replace(/(?<!:)\/\//g, "/");

export const buildAlternateUrls = (pathname) => ({
  ar: `${SITE_URL}${pathname}?lang=ar`,
  en: `${SITE_URL}${pathname}?lang=en`,
  "x-default": `${SITE_URL}${pathname}`,
});

export const createOrganizationSchema = () => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "BeePro Academy",
  url: SITE_URL,
  logo: DEFAULT_IMAGE,
  sameAs: [
    "https://www.facebook.com/beeproacademy",
    "https://twitter.com/beeproacademy",
    "https://www.linkedin.com/company/beepro-academy",
  ],
  contactPoint: [
    {
      "@type": "ContactPoint",
      telephone: "+966501234567",
      contactType: "customer support",
      availableLanguage: ["Arabic", "English"],
    },
  ],
});

export const createWebSiteSchema = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  url: SITE_URL,
  name: "BeePro Academy",
  description: DEFAULT_DESCRIPTION,
  publisher: {
    "@type": "Organization",
    name: "BeePro Academy",
    logo: {
      "@type": "ImageObject",
      url: DEFAULT_IMAGE,
    },
  },
});

export const createBreadcrumbSchema = (items = []) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: item.url,
  })),
});

export const createCourseSchema = ({
  id,
  name,
  description,
  provider = { name: "BeePro Academy", url: SITE_URL },
  url,
  image = DEFAULT_IMAGE,
  author = { "@type": "Person", name: "BeePro Academy" },
  hasCourseInstance = {},
}) => ({
  "@context": "https://schema.org",
  "@type": "Course",
  name,
  description,
  url,
  provider,
  image,
  author,
  hasCourseInstance,
});

export const createBlogPostingSchema = ({
  title,
  description,
  url,
  image = DEFAULT_IMAGE,
  datePublished,
  dateModified,
  author = { "@type": "Person", name: "BeePro Academy" },
  publisher = {
    "@type": "Organization",
    name: "BeePro Academy",
    logo: { "@type": "ImageObject", url: DEFAULT_IMAGE },
  },
}) => ({
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: title,
  description,
  url,
  image,
  datePublished,
  dateModified,
  author,
  publisher,
});

export const createFAQSchema = (faqs = []) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
});
