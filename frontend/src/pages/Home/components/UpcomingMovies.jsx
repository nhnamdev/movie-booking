import axios from "axios";
import { useEffect, useState } from "react";
import { CollectionCard } from "../../../components/CollectionCard";

const UpcomingSkeleton = () => (
  <div className="upcoming-movies-grid" aria-label="Đang tải phim sắp chiếu">
    {[1, 2, 3, 4].map((item) => (
      <div className="upcoming-movie-skeleton" key={item} aria-hidden="true">
        <span />
        <i />
        <i />
      </div>
    ))}
  </div>
);

export const UpcomingMovies = () => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const fetchUpcomingMovies = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/upcomingMovies`);
        if (active) setMovies(Array.isArray(response.data) ? response.data : []);
      } catch {
        if (active) setError("Không thể tải danh sách phim sắp chiếu.");
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchUpcomingMovies();
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="section-upcoming-movies" id="comingSoon">
      <div className="container">
        <div className="upcoming-movies-heading">
          <h2 className="heading-secondary">Phim sắp chiếu</h2>
          <p className="section-heading-copy">
            Xem lịch phát hành và đặt vé sớm ngay khi rạp mở suất chiếu.
          </p>
        </div>

        {loading && <UpcomingSkeleton />}
        {!loading && error && <p className="home-collection-empty">{error}</p>}
        {!loading && !error && movies.length === 0 && (
          <p className="home-collection-empty">Hiện chưa có phim sắp chiếu.</p>
        )}
        {!loading && !error && movies.length > 0 && (
          <div className="upcoming-movies-grid">
            {movies.map((movie) => <CollectionCard key={movie.id} {...movie} />)}
          </div>
        )}
      </div>
    </section>
  );
};
