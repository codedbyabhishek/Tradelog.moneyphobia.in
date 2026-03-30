/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      { source: '/about-us', destination: '/about', permanent: true },
      { source: '/contact-us', destination: '/contact', permanent: true },
      { source: '/privacy-policy', destination: '/privacy', permanent: true },
      { source: '/terms-and-conditions', destination: '/terms', permanent: true },
      { source: '/cookie-policy', destination: '/cookies', permanent: true },
      { source: '/account-settings', destination: '/account', permanent: true },
      { source: '/delete-account-data-request', destination: '/delete-account', permanent: true },
      { source: '/support-help-center', destination: '/support', permanent: true },
    ]
  },
}

export default nextConfig
