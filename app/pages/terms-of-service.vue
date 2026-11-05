<script setup lang="ts">
useSeoMeta({
  title: "Terms of Service | Skyinnk",
  description:
    "Terms for using Skyinnk's public website and account sign-in services.",
});
useHead({
  link: [{ rel: "canonical", href: "https://www.skyinnk.in/terms-of-service" }],
});
</script>

<template>
  <LegalPage title="Terms of Service">
    <p>
      These terms apply to your use of Skyinnk at
      <a href="https://www.skyinnk.in">www.skyinnk.in</a>. By using the website,
      you agree to these terms. If you do not agree, please stop using it.
    </p>

    <h2>The current service</h2>
    <p>
      Skyinnk currently provides a public coming-soon website with account
      registration, sign-in, and sign-out through Auth0. Creating an account
      does not guarantee access to future products or features. Any future
      services may have additional terms presented when they become available.
    </p>

    <h2>Your account</h2>
    <p>
      Provide accurate information to your authentication provider and protect
      your account credentials. Use only accounts you are authorized to access.
      Sign out on shared devices. Authentication is provided through Auth0 and,
      where selected, third-party sign-in providers under their applicable
      terms.
    </p>

    <h2>Acceptable use</h2>
    <p>
      Use Skyinnk lawfully. Do not attempt unauthorized access, interfere with
      the website or other users, bypass access controls, distribute malicious
      software, or misuse another person's account or personal information.
    </p>

    <h2>Privacy and third-party services</h2>
    <p>
      The <NuxtLink to="/privacy-policy">Privacy Policy</NuxtLink> explains
      account information, authentication cookies, Cookiebot consent choices,
      and Google Analytics measurement, including possible cookieless signals
      under Advanced Consent Mode v2. Third-party services linked from or used
      by the website have their own terms and privacy policies.
    </p>

    <h2>Website content</h2>
    <p>
      Rights in website content remain with their respective owners. These terms
      do not transfer ownership of Skyinnk branding or third-party materials.
      Any use beyond permission granted by the rights holder or applicable law
      requires the rights holder's authorization.
    </p>

    <h2>Availability and responsibility</h2>
    <p>
      The website may change or become unavailable, including during maintenance
      or service interruptions. No uninterrupted availability or launch date is
      promised. You remain responsible for how you use the website. Nothing in
      these terms excludes rights or remedies that applicable law does not allow
      to be excluded.
    </p>

    <h2>Changes to these terms</h2>
    <p>
      These terms may be updated as the service changes. Review this page when
      using the website; the current terms are available at this address.
    </p>
  </LegalPage>
</template>
