import Script from "next/script";

/**
 * GA4 loader. Renders only if NEXT_PUBLIC_GA_MEASUREMENT_ID is set.
 * Include in root layout:
 *
 *   <GA4 />
 *
 * Set the env var once per app — all subdomains share the same GA property
 * recommended (use the same measurement ID so cross-domain tracking works).
 */
export function GA4() {
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  if (!id) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${id}', {
            cookie_domain: '.skilldrunk.com',
            cookie_flags: 'SameSite=None;Secure'
          });
        `}
      </Script>
    </>
  );
}
