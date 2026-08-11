import { useState, useEffect } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import { FaStar } from "react-icons/fa";

export const TopMovies = () => {
  const { signedPerson } = useSelector((store) => store.authentication);
  const email = signedPerson?.email;
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!email) return;

    const fetchMovies = async () => {
      try {
        const res = await axios.post(
          `${import.meta.env.VITE_API_URL}/adminTopMovies`,
          { email }
        );
        setMovies(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMovies();
  }, [email]);

  if (loading) {
    return (
      <section className="admin-table-section">
        <div className="admin-section-heading">
          <p className="admin-section-kicker">Bán chạy</p>
          <h3 className="form-admin-heading">Top phim bán chạy</h3>
        </div>
        <div className="admin-chart-loading">Đang tải...</div>
      </section>
    );
  }

  return (
    <section className="admin-table-section">
      <div className="admin-section-heading">
        <p className="admin-section-kicker">Bán chạy</p>
        <h3 className="form-admin-heading">Top phim bán chạy</h3>
      </div>

      {movies.length === 0 ? (
        <p className="admin-empty-state">Chưa có dữ liệu phim.</p>
      ) : (
        <div className="admin-top-movies-table">
          <div className="admin-top-movies-header">
            <span>#</span>
            <span>Tên phim</span>
            <span>Đánh giá</span>
            <span>Vé đã bán</span>
          </div>
          {movies.map((movie, idx) => (
            <div key={movie.id} className="admin-top-movies-row">
              <span className="admin-top-movies-rank">
                <span className="admin-order-mobile-label">#</span>
                {idx + 1}
              </span>
              <span className="admin-top-movies-name">
                <span className="admin-order-mobile-label">Tên phim</span>
                {movie.name}
              </span>
              <span className="admin-top-movies-rating">
                <span className="admin-order-mobile-label">Đánh giá</span>
                <FaStar aria-hidden="true" />
                {movie.rating || "—"}
              </span>
              <span className="admin-top-movies-tickets">
                <span className="admin-order-mobile-label">Vé đã bán</span>
                {movie.tickets_sold} vé
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
