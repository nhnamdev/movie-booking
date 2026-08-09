import { Navbar } from "../../components/Navbar";
import { Footer } from "../../components/Footer";
import { HeroSection } from "./components/HeroSection";
import { HomeCollection } from "./components/HomeCollection";
import { UpcomingMovies } from "./components/UpcomingMovies";
import { Features } from "./components/Features";
import { SocialLinks } from "./components/SocialLinks";
import { TopEdge } from "../../components/TopEdge";

const HomePage = () => {
  return (
    <>
      <TopEdge />
      <Navbar />
      <HeroSection />
      <HomeCollection />
      <UpcomingMovies />
      <Features />
      <SocialLinks />
      <Footer />
    </>
  );
};

export default HomePage;
