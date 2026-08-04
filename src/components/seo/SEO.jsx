import { Helmet } from "react-helmet-async";
import PropTypes from "prop-types";
import {
  DEFAULT_TITLE,
  DEFAULT_DESCRIPTION,
  DEFAULT_KEYWORDS,
  DEFAULT_IMAGE,
  buildCanonicalUrl,
  buildAlternateUrls,
} from "../../lib/seo";

const SEO = ({
  title,
  description,
  pathname,
  image,
  article = false,
  extraMeta = [],
  noIndex = false,
  lang = "ar",
  keywords = DEFAULT_KEYWORDS,
}) => {
  const pageTitle = title ? `${title} | BeePro Academy` : DEFAULT_TITLE;
  const pageDescription = description || DEFAULT_DESCRIPTION;
  const canonical = buildCanonicalUrl(pathname || "/");
  const alternate = buildAlternateUrls(pathname || "/");
  const pageImage = image || DEFAULT_IMAGE;

  return (
    <Helmet>
      <html lang={lang} />
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      <meta name="keywords" content={keywords} />
      <meta
        name="robots"
        content={noIndex ? "noindex,follow" : "index,follow"}
      />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="theme-color" content="#0F172A" />
      <link rel="canonical" href={canonical} />
      <link rel="alternate" hrefLang="ar" href={alternate.ar} />
      <link rel="alternate" hrefLang="en" href={alternate.en} />
      <link
        rel="alternate"
        hrefLang="x-default"
        href={alternate["x-default"]}
      />

      <meta property="og:type" content={article ? "article" : "website"} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:image" content={pageImage} />
      <meta property="og:url" content={canonical} />
      <meta property="og:site_name" content="BeePro Academy" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
      <meta name="twitter:image" content={pageImage} />
      <meta name="twitter:site" content="@beeproacademy" />
      <meta name="twitter:creator" content="@beeproacademy" />

      {extraMeta.map(({ name, property, content }, index) => (
        <meta
          key={`${name || property}-${index}`}
          {...(name ? { name } : { property })}
          content={content}
        />
      ))}
    </Helmet>
  );
};

SEO.propTypes = {
  title: PropTypes.string,
  description: PropTypes.string,
  pathname: PropTypes.string,
  image: PropTypes.string,
  article: PropTypes.bool,
  extraMeta: PropTypes.array,
  noIndex: PropTypes.bool,
  lang: PropTypes.string,
  keywords: PropTypes.string,
};

SEO.defaultProps = {
  title: "",
  description: "",
  pathname: "/",
  image: DEFAULT_IMAGE,
  article: false,
  extraMeta: [],
  noIndex: false,
  lang: "ar",
  keywords: DEFAULT_KEYWORDS,
};

export default SEO;
