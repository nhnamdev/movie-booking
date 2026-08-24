import { useEffect, useState } from "react";
import { LocationSelector } from "../../../components/LocationSelector";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import HashLoader from "react-spinners/esm/HashLoader.js";
import { useDispatch, useSelector } from "react-redux";
import { showLoginModal } from "../../../reducers/authSlice";
import { resetCart, setMovie, setShowDate, setShowDetail } from "../../../reducers/cartSlice";
import { resolveMediaUrl } from "../../../utils/mediaUrl";
import { FiPlayCircle, FiX } from "react-icons/fi";
import { getYouTubeEmbedUrl } from "../../../utils/trailerUrl";

export const MovieInfoSection = ({ onMovieLoaded, ratingOverride, totalReviewsOverride }) => {
  const [movieData, setMovieData] = useState({});
  const [showtimesData, setShowtimesData] = useState([]);
  const navigate = useNavigate();
  const [loading1, setLoading1] = useState(false);
  const [loading2, setLoading2] = useState(true);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const { id } = useParams();
  const movieDetailsId = Number(id);

  useEffect(() => {
    if (ratingOverride !== undefined && ratingOverride !== null) {
      setMovieData((prev) => ({
        ...prev,
        rating: Number(ratingOverride) > 0 ? Number(ratingOverride).toFixed(1) : "Chưa có",
        total_reviews: totalReviewsOverride !== undefined ? totalReviewsOverride : prev.total_reviews,
      }));
    }
  }, [ratingOverride, totalReviewsOverride]);

  const userLocation = useSelector((store) => store.currentLocation);
  const { isAuthenticated, signedPerson } = useSelector(
    (store) => store.authentication
  );
  const dispatch = useDispatch();
  const trailerEmbedUrl = getYouTubeEmbedUrl(movieData.trailer_url);

  useEffect(() => {
    if (!trailerOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setTrailerOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = "";
    };
  }, [trailerOpen]);

  const override = {
    display: "block",
    margin: "9.6rem auto",
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading1(true);
      try {
        const movieDetailResponse = await axios.post(
          `${import.meta.env.VITE_API_URL}/movieDetail`,
          {
            movieDetailsId,
          }
        );

        if (!movieDetailResponse?.data || !Array.isArray(movieDetailResponse.data) || movieDetailResponse.data.length === 0 || !movieDetailResponse.data[0]) {
          setMovieData(null);
          return;
        }

        const rawMovie = movieDetailResponse.data[0];
        const formattedRelDate = rawMovie.release_date
          ? new Date(rawMovie.release_date).toLocaleDateString("vi-VN")
          : "Chưa cập nhật";
        const rawDuration = rawMovie.duration;
        const durationNumber = Number(rawDuration);
        const duration = Number.isFinite(durationNumber) && durationNumber > 0
          ? `${durationNumber} phút`
          : "Chưa cập nhật";
        const ratingNumber = Number(rawMovie.rating);
        const totalReviews = Number(rawMovie.total_reviews || 0);
        const formattedMovieData = {
          ...rawMovie,
          name: rawMovie.name || "Phim",
          duration,
          release_date: formattedRelDate,
          total_reviews: totalReviews,
          rating: Number.isFinite(ratingNumber) && ratingNumber > 0
            ? ratingNumber.toFixed(1)
            : "Chưa có",
        };

        setMovieData(formattedMovieData);
        if (onMovieLoaded) {
          onMovieLoaded(formattedMovieData);
        }
      } catch (err) {
        console.error(err);
        setMovieData(null);
      } finally {
        setLoading1(false);
      }
    };

    fetchData();
  }, [movieDetailsId]);

  useEffect(() => {
    const fetchData = async () => {
      if (!userLocation.id || !movieDetailsId) return;

      try {
        setLoading2(true);
        const response = await axios.post(
          `${import.meta.env.VITE_API_URL}/movieWiseShowtime`,
          {
            movieDetailsId,
            theatreId: userLocation?.id,
          }
        );
        setShowtimesData(response.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading2(false);
      }
    };

    fetchData();
  }, [userLocation.id, movieDetailsId]);

  const showtimesObj3d = {};
  const showtimesObj2d = {};

  showtimesData.length > 0 &&
    showtimesData.forEach((show) => {
      const curDate = show.showtime_date;

      if (show.show_type === "3D") {
        if (curDate in showtimesObj3d) {
          showtimesObj3d[curDate].push(show);
        } else {
          showtimesObj3d[curDate] = [show];
        }
      }
    });

  showtimesData.length > 0 &&
    showtimesData.forEach((show) => {
      const curDate = show.showtime_date;

      if (show.show_type === "2D") {
        if (curDate in showtimesObj2d) {
          showtimesObj2d[curDate].push(show);
        } else {
          showtimesObj2d[curDate] = [show];
        }
      }
    });

  const showHtml3d = Object.keys(showtimesObj3d).map((showDate) => {
    const times = showtimesObj3d[showDate];

    const timesHtml = times.map((singleTime) => {
      return (
        <li key={`3d ${singleTime.showtime_id}`}>
          <button
            className="showtimes-startime-btn"
            onClick={() => {
              dispatch(resetCart());
              if (isAuthenticated && signedPerson.person_type === "Customer") {
                dispatch(setShowDate(showDate));
                dispatch(setMovie(movieDetailsId));
                dispatch(setShowDetail(`${singleTime.showtime_id},${singleTime.hall_id},${singleTime.price_per_seat}`));
                navigate("/purchase");
              } else dispatch(showLoginModal());
            }}
          >
            {singleTime.movie_start_time}
          </button>
        </li>
      );
    });
    const formattedDate = new Date(showDate).toLocaleDateString("vi-VN");

    return (
      <div className="showtimes-schedule" key={`3d ${showDate}`}>
        <h3 className="showtimes-date">{formattedDate}</h3>

        <ul className="showtimes-startime-btn-list">{timesHtml}</ul>
      </div>
    );
  });

  const showHtml2d = Object.keys(showtimesObj2d).map((showDate) => {
    const times = showtimesObj2d[showDate];

    const timesHtml = times.map((singleTime) => {
      return (
        <li key={`2d ${singleTime.showtime_id}`}>
          <button
            className="showtimes-startime-btn"
            onClick={() => {
              dispatch(resetCart());
              if (isAuthenticated && signedPerson.person_type === "Customer") {
                dispatch(setShowDate(showDate));
                dispatch(setMovie(movieDetailsId));
                dispatch(setShowDetail(`${singleTime.showtime_id},${singleTime.hall_id},${singleTime.price_per_seat}`));
                navigate("/purchase");
              } else dispatch(showLoginModal());
            }}
          >
            {singleTime.movie_start_time}
          </button>
        </li>
      );
    });
    const formattedDate = new Date(showDate).toLocaleDateString("vi-VN");

    return (
      <div className="showtimes-schedule" key={`2d ${showDate}`}>
        <h3 className="showtimes-date">{formattedDate}</h3>

        <ul className="showtimes-startime-btn-list">{timesHtml}</ul>
      </div>
    );
  });

  return (
    <div className="section-movie-info container">
      {loading1 ? (
        <HashLoader cssOverride={override} size={60} color="#eb3656" />
      ) : !movieData ? (
        <div style={{ textAlign: "center", padding: "6rem 2rem", color: "#94a3b8" }}>
          <h2 style={{ color: "#f8fafc", fontSize: "2.4rem", marginBottom: "1rem" }}>Không tìm thấy thông tin phim</h2>
          <p style={{ fontSize: "1.5rem" }}>Phim này có thể chưa được cập nhật hoặc đã ngừng chiếu.</p>
        </div>
      ) : (
        <>
          <div className="movie-info-grid-container">
            <div className="movie-info-img-container">
              <img
                className="movie-info-img"
                src={resolveMediaUrl(movieData && movieData.image_path)}
                alt="Movie Photo"
              />
            </div>

            <div className="movie-info-attr-container">
              <h2 className="movie-info-name">{movieData && movieData.name}</h2>

              <div className="movie-info-small-container ">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="movie-info-icon"
                  viewBox="0 0 512 512"
                >
                  <path
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="32"
                    d="M192 448h128M384 208v32c0 70.4-57.6 128-128 128h0c-70.4 0-128-57.6-128-128v-32M256 368v80"
                  />
                  <path
                    d="M256 64a63.68 63.68 0 00-64 64v111c0 35.2 29 65 64 65s64-29 64-65V128c0-36-28-64-64-64z"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="32"
                  />
                </svg>
                <p>{movieData && movieData.language}</p>
              </div>

              <div className="movie-info-small-container movie-info-rating-container">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="movie-info-icon"
                  viewBox="0 0 512 512"
                >
                  <path d="M394 480a16 16 0 01-9.39-3L256 383.76 127.39 477a16 16 0 01-24.55-18.08L153 310.35 23 221.2a16 16 0 019-29.2h160.38l48.4-148.95a16 16 0 0130.44 0l48.4 149H480a16 16 0 019.05 29.2L359 310.35l50.13 148.53A16 16 0 01394 480z" />
                </svg>
                <p>
                  <strong>{movieData.rating}/10</strong>
                  {movieData.total_reviews > 0 && (
                    <span className="movie-info-review-count"> ({movieData.total_reviews} đánh giá)</span>
                  )}
                </p>
              </div>

              <div className="movie-info-small-container ">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="movie-info-icon"
                  viewBox="0 0 512 512"
                >
                  <rect
                    fill="none"
                    stroke="currentColor"
                    strokeLinejoin="round"
                    strokeWidth="32"
                    x="48"
                    y="80"
                    width="416"
                    height="384"
                    rx="48"
                  />
                  <circle cx="296" cy="232" r="24" />
                  <circle cx="376" cy="232" r="24" />
                  <circle cx="296" cy="312" r="24" />
                  <circle cx="376" cy="312" r="24" />
                  <circle cx="136" cy="312" r="24" />
                  <circle cx="216" cy="312" r="24" />
                  <circle cx="136" cy="392" r="24" />
                  <circle cx="216" cy="392" r="24" />
                  <circle cx="296" cy="392" r="24" />
                  <path
                    fill="none"
                    stroke="currentColor"
                    strokeLinejoin="round"
                    strokeWidth="32"
                    strokeLinecap="round"
                    d="M128 48v32M384 48v32"
                  />
                  <path
                    fill="none"
                    stroke="currentColor"
                    strokeLinejoin="round"
                    strokeWidth="32"
                    d="M464 160H48"
                  />
                </svg>
                <p>{movieData.release_date}</p>
              </div>

              <div className="movie-info-small-container ">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="movie-info-icon"
                  viewBox="0 0 512 512"
                >
                  <path
                    d="M256 64C150 64 64 150 64 256s86 192 192 192 192-86 192-192S362 64 256 64z"
                    fill="none"
                    stroke="currentColor"
                    strokeMiterlimit="10"
                    strokeWidth="32"
                  />
                  <path
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="32"
                    d="M256 128v144h96"
                  />
                </svg>
                <p>{movieData.duration}</p>
              </div>

              <div className="movie-info-genre-container">
                <p className="movie-info-title">Thể loại: </p>
                <p>{movieData && movieData.genres}</p>
              </div>

              <div className="movie-info-director-container">
                <p className="movie-info-title">Đạo diễn: </p>
                <p>{movieData && movieData.directors}</p>
              </div>

              <div className="movie-info-cast-container">
                <p className="movie-info-title">Diễn viên hàng đầu: </p>
                <p>{movieData && movieData.top_cast}</p>
              </div>

              {trailerEmbedUrl && (
                <button
                  className="movie-trailer-button"
                  type="button"
                  onClick={() => setTrailerOpen(true)}
                >
                  <FiPlayCircle />
                  Xem trailer
                </button>
              )}
            </div>
          </div>

          <div className="movie-info-description-container">
            <h3 className="movie-info-description-heading">Tóm tắt</h3>
            <p className="movie-info-description">
              {movieData && movieData.synopsis}
            </p>
          </div>
        </>
      )}

      <div className="movie-info-location-container">
        <LocationSelector />
      </div>

      {userLocation.id && (
        <>
          <h3 className="movie-info-screen-heading">Lịch chiếu phim</h3>

          {loading2 ? (
            <HashLoader cssOverride={override} size={60} color="#eb3656" />
          ) : (
            <div className="movie-info-screen-container">
              {showHtml3d.length > 0 && (
                <div className="movie-info-screen-container-3d">
                  <h2 className="showtimes-screen">3D</h2>
                  {showHtml3d}
                </div>
              )}

              {showHtml2d.length > 0 && (
                <div className="movie-info-screen-container-2d">
                  <h2 className="showtimes-screen">2D</h2>
                  {showHtml2d}
                </div>
              )}

              {showHtml3d.length === 0 && showHtml2d.length === 0 && (
                <p className="no-showtimes-msg">Không có suất chiếu cho phim này tại rạp đã chọn.</p>
              )}
            </div>
          )}
        </>
      )}

      {trailerOpen && trailerEmbedUrl && (
        <div
          className="movie-trailer-modal"
          role="dialog"
          aria-modal="true"
          aria-label={`Trailer phim ${movieData.name || ""}`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setTrailerOpen(false);
          }}
        >
          <div className="movie-trailer-dialog">
            <div className="movie-trailer-header">
              <div>
                <span>TRAILER CHÍNH THỨC</span>
                <h3>{movieData.name}</h3>
              </div>
              <button type="button" onClick={() => setTrailerOpen(false)} aria-label="Đóng trailer">
                <FiX />
              </button>
            </div>
            <div className="movie-trailer-frame">
              <iframe
                src={trailerEmbedUrl}
                title={`Trailer phim ${movieData.name || ""}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
