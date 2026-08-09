import { useEffect, useState } from "react";
import { CollectionCard } from "../../../components/CollectionCard";
import axios from "axios";
import HashLoader from "react-spinners/HashLoader";

export const HomeCollection = () => {
  const override = {
    display: "block",
    marginLeft: "auto",
    marginRight: "auto",
  };

  const [movieData, setMovieData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/latestMovies`
        );
        setMovieData(response.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const latestMoviesCards = movieData.map((latestMovie) => {
    return <CollectionCard key={latestMovie.id} {...latestMovie} />;
  });

  const latestMovieCardsDouble = movieData.map((latestMovie) => {
    return <CollectionCard key={latestMovie.id + 6} {...latestMovie} />;
  });

  return (
    <section className="section-home-collection" id="nowShowing">
      <div className="home-collection-heading-container">
        <p className="section-eyebrow">Lịch chiếu nổi bật</p>
        <h1 className="heading-secondary heading-collection">Phim đang chiếu</h1>
        <p className="section-heading-copy">
          Cập nhật những phim mới nhất để bạn chọn suất chiếu phù hợp.
        </p>
      </div>

      {loading && <HashLoader cssOverride={override} color="#eb3656" />}
      {!loading && movieData.length === 0 && (
        <p className="home-collection-empty">
          Hiện chưa có phim đang chiếu.
        </p>
      )}
      {!loading && movieData.length > 0 && (
        <div className="home-collection-container">
          <div className="home-collection-inner">{latestMoviesCards}</div>
          <div className="home-collection-inner">{latestMovieCardsDouble}</div>
        </div>
      )}
    </section>
  );
};
