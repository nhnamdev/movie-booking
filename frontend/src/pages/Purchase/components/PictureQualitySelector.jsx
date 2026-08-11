import { useEffect, useState } from "react";
import axios from "axios";
import HashLoader from "react-spinners/esm/HashLoader.js";
import { useDispatch, useSelector } from "react-redux";
import { setShowDetail } from "../../../reducers/cartSlice";

export const PictureQualitySelector = ({
  hallData,
  setHallData,
  paymentOngoing,
}) => {
  const override = {
    display: "block",
    margin: "1.6rem auto",
  };

  const { id: theatreId } = useSelector((store) => store.currentLocation);
  const {
    showtime_date: userDate,
    movie_id: userMovieId,
    hall_id: userHallId,
    showtime_id: userShowtimeId,
    seat_price: userSeatPrice,
  } = useSelector((store) => store.cart);

  const dispatch = useDispatch();

  const [loading, setLoading] = useState(false);
  const newHallData = [];
  let userAns = `${userShowtimeId},${userHallId},${userSeatPrice}`;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await axios.post(
          `${import.meta.env.VITE_API_URL}/halls`,
          {
            theatreId,
            userDate,
            userMovieId,
          }
        );
        setHallData(response.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userMovieId, theatreId, userDate, setHallData]);

  hallData.forEach((hall) => {
    const isPresent = newHallData.some(
      (hallData) =>
        hallData.show_type === hall.show_type &&
        hall.hall_id === hallData.hall_id
    );

    if (isPresent) {
      const curMovie = newHallData.find(
        (hallData) =>
          hallData.show_type === hall.show_type &&
          hall.hall_id === hallData.hall_id
      );

      curMovie.movie_start_time.push(hall.movie_start_time);
      curMovie.showtime_id.push(hall.showtime_id);
    } else {
      newHallData.push({
        hall_id: hall.hall_id,
        hall_name: hall.hall_name,
        movie_start_time: [hall.movie_start_time],
        showtime_id: [hall.showtime_id],
        price_per_seat: hall.price_per_seat,
        show_type: hall.show_type,
      });
    }
  });

  const showtimeOptions = newHallData.map((show) => {
    const options = show.movie_start_time.map((option, idx) => {
      const valStr = `${show.showtime_id[idx]},${show.hall_id},${show.price_per_seat}`;
      const inputId = `purchase-showtime-${show.showtime_id[idx]}-${show.hall_id}`;
      const isSelected = userAns === valStr;
      return (
        <div
          className={`time-input-container ${isSelected ? "is-selected" : ""} ${
            paymentOngoing ? "is-disabled" : ""
          }`}
          key={inputId}
        >
          <input
            disabled={loading || paymentOngoing}
            type="radio"
            id={inputId}
            name="Select picture quality"
            value={valStr}
            onChange={(e) => dispatch(setShowDetail(e.target.value))}
            checked={isSelected}
          />

          <label className="form-time-detail" htmlFor={inputId}>
            {String(option).slice(0, 5)}
          </label>
        </div>
      );
    });

    return (
      <div
        className="form-options-hall"
        key={`${show.hall_name} (${show.show_type})`}
      >
        <div className="form-picture-quality">
          <div className="form-hall-heading">
            <strong>{show.hall_name}</strong>
            <span>{show.show_type}</span>
          </div>
          <div className="form-showtimes">{options}</div>
        </div>
        <p className="form-show-price">Từ <strong>{Number(show.price_per_seat).toLocaleString("vi-VN")}₫</strong></p>
      </div>
    );
  });

  return (
    <div>
      <form>
        <div className="form-item-heading">Chọn giờ chiếu</div>
        {loading && <HashLoader cssOverride={override} color="#eb3656" />}
        {!loading && (
          <div className="form-hall-container">{showtimeOptions}</div>
        )}
      </form>
    </div>
  );
};
