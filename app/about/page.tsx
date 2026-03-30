import PublicPageLayout from '@/components/public-page-layout';

export default function AboutPage() {
  return (
    <PublicPageLayout
      title="About Us"
      description="Trading Journal helps traders build discipline through structured journaling, analytics, and review workflows."
    >
      <p>
        We built Trading Journal to make performance review simple and consistent for active traders.
      </p>
      <p>
        Our focus is practical: quick trade capture, clean analytics, and long-term behavior improvement.
      </p>
      <p>
        This product is designed for educational and self-evaluation use and does not provide investment advice.
      </p>
    </PublicPageLayout>
  );
}
