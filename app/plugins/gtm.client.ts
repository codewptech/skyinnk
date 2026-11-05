export default defineNuxtPlugin(() => {
  const { analyticsEnabled, gtmId } = useRuntimeConfig().public;
  if (
    String(analyticsEnabled) !== "true" ||
    !/^GTM-[A-Z0-9]+$/.test(gtmId) ||
    document.getElementById("skyinnk-gtm")
  ) {
    return;
  }

  // Use the standard GTM startup event. Cookiebot's Consent Initialization tag
  // runs inside the container before its GA4 tags. Do not set consent here.
  const analyticsWindow = window as Window & {
    dataLayer?: Record<string, unknown>[];
  };
  analyticsWindow.dataLayer ??= [];
  analyticsWindow.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });

  const script = document.createElement("script");
  script.id = "skyinnk-gtm";
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${gtmId}`;
  script.dataset.cookieconsent = "ignore";
  document.head.appendChild(script);
});
