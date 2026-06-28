"use client";

import Script from "next/script";

const DATA_LAYER_NAME = "dataLayer";

type AnalyticsScriptsProps = {
  gtmId?: string;
  gaId?: string;
};

/**
 * GTM and GA loaded with strategy="lazyOnload" to avoid blocking LCP.
 * Same init + src pattern as @next/third-parties; analytics lib (gtag/dataLayer) works unchanged.
 */
export function AnalyticsScripts({ gtmId, gaId }: AnalyticsScriptsProps) {
  return (
    <>
      {gtmId && (
        <>
          <Script
            id="_next-gtm-init"
            strategy="lazyOnload"
            dangerouslySetInnerHTML={{
              __html: `(function(w,l){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});})(window,'${DATA_LAYER_NAME}');`,
            }}
          />
          <Script
            id="_next-gtm"
            strategy="lazyOnload"
            src={`https://www.googletagmanager.com/gtm.js?id=${gtmId}`}
            data-ntpc="GTM"
          />
        </>
      )}
      {gaId && (
        <>
          <Script
            id="_next-ga-init"
            strategy="lazyOnload"
            dangerouslySetInnerHTML={{
              __html: `window['${DATA_LAYER_NAME}']=window['${DATA_LAYER_NAME}']||[];function gtag(){window['${DATA_LAYER_NAME}'].push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`,
            }}
          />
          <Script
            id="_next-ga"
            strategy="lazyOnload"
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
          />
        </>
      )}
    </>
  );
}
