import { Navbar } from "../../components/Navbar";
import { ShowTimesHeader } from "./components/ShowTimesHeader";
import { ShowTimesCollection } from "./components/ShowTimesCollection";
import { AISearchBox } from "./components/AISearchBox";
import { Footer } from "../../components/Footer";

const ShowtimesPage = () => {
  return (
    <>
      <Navbar />
      <ShowTimesHeader />
      <AISearchBox />
      <ShowTimesCollection />
      <Footer />
    </>
  );
};

export default ShowtimesPage;
