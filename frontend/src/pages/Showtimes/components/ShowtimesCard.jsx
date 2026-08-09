import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  FiChevronDown,
  FiClock,
  FiGlobe,
  FiMonitor,
  FiTag,
  FiUserCheck,
} from "react-icons/fi";
import { showLoginModal } from "../../../reducers/authSlice";
import { resolveMediaUrl } from "../../../utils/mediaUrl";
import {
  resetCart,
  setMovie,
  setShowDate,
  setShowDetail,
} from "../../../reducers/cartSlice";
import { formatDateKey, toDateKey } from "../../../utils/dateUtils";

const formatDate = (value) =>
  formatDateKey(value, "vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

export const ShowtimesCard = ({
  id,
  movie_name,
  image_path,
  genres,
  duration,
  language,
  audio_type,
  age_rating,
  dates,
}) => {
  const navigate = useNavigate();
  const { isAuthenticated, signedPerson } = useSelector(
    (store) => store.authentication
  );
  const dispatch = useDispatch();

  const handleSelectShowtime = (date, time) => {
    const showtimeDate = toDateKey(date);

    dispatch(resetCart());

    if (isAuthenticated && signedPerson.person_type === "Customer") {
      dispatch(setShowDate(showtimeDate));
      dispatch(setMovie(id));
      dispatch(setShowDetail(`${time.showtimeId},${time.hallId},${time.price}`));
      navigate("/purchase");
    } else {
      dispatch(showLoginModal());
    }
  };

  return (
    <article className="showtimes-card">
      <div className="showtimes-poster-wrap">
        <button
          type="button"
          className="showtimes-poster-link"
          onClick={() => navigate(`/movieDetails/${id}`)}
        >
          <img className="showtimes-img" src={resolveMediaUrl(image_path)} alt={movie_name} />
        </button>
        <div className="showtimes-age-mobile">
          <FiUserCheck />
          <span>{age_rating}</span>
        </div>
      </div>

      <div className="showtimes-content">
        <h3 className="showtimes-title">
          <button type="button" onClick={() => navigate(`/movieDetails/${id}`)}>
            {movie_name}
          </button>
        </h3>

        <ul className="showtimes-metadata">
          <li>
            <FiTag />
            <span>{genres.join(", ")}</span>
          </li>
          <li>
            <FiClock />
            <span>{duration}</span>
          </li>
          <li>
            <FiGlobe />
            <span>{language}</span>
          </li>
          <li>
            <FiMonitor />
            <span>{audio_type}</span>
          </li>
          <li className="showtimes-age-desktop">
            <FiUserCheck />
            <span>{age_rating}</span>
          </li>
        </ul>

        <div className="showtimes-rp">
          {dates.map((dateBlock) => (
            <div className="showtimes-rp-block" key={dateBlock.date}>
              <div className="showtimes-rp-day">
                <span>{formatDate(dateBlock.date)}</span>
                <FiChevronDown />
              </div>

              <div className="showtimes-rp-body">
                {dateBlock.screens.map((screen) => (
                  <div
                    className="showtimes-rp-item"
                    key={`${dateBlock.date}-${screen.screenType}`}
                  >
                    <p className="showtimes-rp-title">{screen.screenType}</p>
                    <div className="showtimes-time-list">
                      {screen.times.map((time) => (
                        <button
                          type="button"
                          className="showtimes-time-item"
                          key={`${time.showtimeId}-${time.hallId}`}
                          onClick={() => handleSelectShowtime(dateBlock.date, time)}
                          title={`${time.hallName} - ${time.showType}`}
                        >
                          {time.startTime}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button
          className="showtimes-see-more"
          type="button"
          onClick={() => navigate(`/movieDetails/${id}`)}
        >
          Xem thêm lịch chiếu
        </button>
      </div>
    </article>
  );
};
