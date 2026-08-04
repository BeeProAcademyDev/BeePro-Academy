import React from "react";
import { Helmet } from "react-helmet-async";
import {
  DEFAULT_TITLE,
  DEFAULT_DESCRIPTION,
  DEFAULT_IMAGE,
  SITE_URL,
  createOrganizationSchema,
  createWebSiteSchema,
} from "../../lib/seo";
import StructuredData from "./StructuredData";

const SEOProvider = ({ children }) => (
  <>
    <Helmet>
      <html lang="ar" />
      <meta charSet="utf-8" />
      <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
      <meta name="format-detection" content="telephone=no" />
      <meta name="theme-color" content="#0F172A" />
      <meta name="robots" content="index,follow" />
      <meta name="google" content="notranslate" />
      <link
        rel="icon"
        href="/assets/platform-logo.png"
        type="image/png"
        sizes="32x32"
      />
      <link
        rel="apple-touch-icon"
        sizes="180x180"
        href="/assets/platform-logo.png"
      />
      <meta name="application-name" content="BeePro Academy" />
      <meta property="og:site_name" content="BeePro Academy" />
      <meta property="og:image" content={DEFAULT_IMAGE} />
      <meta property="og:image:alt" content="BeePro Academy logo" />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={SITE_URL} />
      <meta property="og:title" content={DEFAULT_TITLE} />
      <meta property="og:description" content={DEFAULT_DESCRIPTION} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@beeproacademy" />
      <meta name="twitter:creator" content="@beeproacademy" />
      <meta name="twitter:image" content={DEFAULT_IMAGE} />
      <meta name="description" content={DEFAULT_DESCRIPTION} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
    </Helmet>
    <StructuredData
      jsonLd={[createOrganizationSchema(), createWebSiteSchema()]}
    />
    {children}
  </>
);

export default SEOProvider;
