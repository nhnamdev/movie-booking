import { LocationSelector } from "../../../components/LocationSelector";
import { GenreSelector } from "./GenreSelector";

export const ShowTimesHeader = () => {
  return (
    <section className="showtimes-header container">
      <LocationSelector />

        {/* Dán component GenreSelector vào ShowTimesHeader. Nó là phần chứa 1 list các thể loại phim của rạp*/}
      <GenreSelector />
    </section>
  );
};
