<script setup lang="ts">
useSeoMeta({
  title: "Privacy Policy | Skyinnk",
  description:
    "How Skyinnk handles account information, authentication, cookies, and website analytics.",
});
useHead({
  link: [{ rel: "canonical", href: "https://www.skyinnk.in/privacy-policy" }],
});
</script>

<template>
  <LegalPage title="Privacy Policy">
    <p>
      This policy describes data practices for Skyinnk at
      <a href="https://www.skyinnk.in">www.skyinnk.in</a>. Skyinnk currently
      provides a public coming-soon website and account sign-in and
      registration. You can read the public pages without creating an account.
    </p>

    <h2>Authentication and account information</h2>
    <p>
      Skyinnk uses Auth0 to handle sign-in, registration, and sign-out. If you
      choose a third-party sign-in provider, such as Google, that provider and
      Auth0 process your authentication under their own policies. Skyinnk uses
      session cookies to maintain your signed-in session; these serve
      authentication rather than analytics.
    </p>
    <p>
      When a signed-in user visits the home page, Skyinnk synchronizes verified
      session profile information to its account database. This associates your
      account with your Auth0 identifier and supports displaying your name,
      email, and profile picture. It does not collect your provider password.
    </p>
    <p>
      The stored information depends on the claims supplied by Auth0 and your
      sign-in provider. The account record can include:
    </p>
    <ul>
      <li>
        Your Auth0 identifier, name and name parts, nickname, and preferred
        username.
      </li>
      <li>
        Email address and verification status, phone number and verification
        status, profile picture, profile link, and website.
      </li>
      <li>
        Gender, birthdate, time zone, locale, and address fields, if supplied.
      </li>
      <li>
        A database account identifier and account creation, synchronization, and
        provider profile update timestamps.
      </li>
    </ul>
    <p>
      These fields are not all required or necessarily supplied. The application
      does not request additional profile information from the Auth0 Management
      API. Passwords, access tokens, and session secrets are not stored in this
      account record.
    </p>

    <h2>Cookies and your choices</h2>
    <p>
      When website analytics is enabled, Google Tag Manager loads Cookiebot to
      present cookie choices and communicate your consent settings to Google
      tags. Use Cookiebot's own privacy control to review or change your
      choices. Browser settings can also restrict or delete cookies; restricting
      session cookies can prevent sign-in from working.
    </p>

    <h2>Analytics and Advanced Consent Mode v2</h2>
    <p>
      Skyinnk uses Google Analytics 4 through Google Tag Manager to understand
      page visits and improve the website. Analytics can process page addresses,
      referring pages, browser and device information, consent status, and
      interactions recorded by the configured Google tags. When analytics
      storage is permitted, Google Analytics may use cookies to measure visits.
    </p>
    <p>
      The configured consent approach is Advanced Google Consent Mode v2. Google
      tags can load before you consent and can send cookieless measurement
      signals when analytics storage is denied. These signals can include
      consent status, page and referrer information, timing, and browser
      information, and can support basic measurement and statistical modeling.
      Rejecting analytics cookies therefore does not necessarily stop all
      requests to Google. Cookieless measurement is not a guarantee of
      anonymity.
    </p>
    <p>
      Skyinnk's application integration does not add your account profile fields
      or authentication credentials to the analytics data layer. Google Tag
      Manager controls the analytics tags and page-view tracking.
      <a href="https://policies.google.com/privacy">Google's Privacy Policy</a>
      describes Google's processing, and its
      <a
        href="https://developers.google.com/tag-platform/security/concepts/consent-mode"
      >
        Consent Mode documentation</a
      >
      explains consent-dependent measurement.
    </p>

    <h2>Service providers</h2>
    <p>
      Skyinnk uses Auth0 for authentication, Neon PostgreSQL for account
      storage, and Cloudflare for website delivery. When analytics is enabled,
      Google Tag Manager, Google Analytics, and Cookiebot also process
      information to provide tagging, measurement, and consent management. Your
      browser sends network information, including its IP address, when
      connecting to website and provider servers. Provider processing may take
      place in countries other than your own and is subject to the applicable
      provider terms and privacy policies.
    </p>

    <h2>Account records and your rights</h2>
    <p>
      Signing out does not delete your stored account record. The current
      application has no self-service account deletion feature or automatic
      account-record deletion schedule. Auth0, Cookiebot, and Google manage
      their own service records according to their settings and policies.
    </p>
    <p>
      Depending on applicable law, you may have rights to access, correct, or
      request deletion of personal information, or to object to or restrict
      certain processing. Changing a sign-in provider profile may update the
      information received after a later sign-in. Cookiebot's privacy control
      manages cookie choices separately from your account.
    </p>

    <h2>Changes to this policy</h2>
    <p>
      This policy may change as Skyinnk's services and data practices change.
      The current policy is available at this address.
    </p>
  </LegalPage>
</template>
