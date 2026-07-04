import Nav from '@/components/Nav';
import Hero from '@/components/Hero';
import LiveShowcase from '@/components/LiveShowcase';
import Capabilities from '@/components/Capabilities';
import FeatureMatrix from '@/components/FeatureMatrix';
import Pricing from '@/components/Pricing';
import Footer from '@/components/Footer';

export default function HomePage() {
  return (
    <>
      <Nav />
      <Hero />
      <LiveShowcase />
      <Capabilities />
      <FeatureMatrix />
      <Pricing />
      <Footer />
    </>
  );
}
