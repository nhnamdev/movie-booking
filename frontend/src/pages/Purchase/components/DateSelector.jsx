import { useEffect, useState } from "react";
import axios from "axios";
import HashLoader from "react-spinners/HashLoader";
import { useDispatch, useSelector } from "react-redux";
import { resetCart, setShowDate } from "../../../reducers/cartSlice";
import { dateKeyToDate, toDateKey } from "../../../utils/dateUtils";

export const DateSelector = ({ paymentOngoing }) => {
  const [showDatesData, setShowDatesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const { id: theatreId } = useSelector((store) => store.currentLocation);
  const { showtime_date: userDate } = useSelector((store) => store.cart);

  const dispatch = useDispatch();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await axios.post(
          `${import.meta.env.VITE_API_URL}/showtimesDates`,
          {
            theatreId,
          }
        );
        if (!Array.isArray(response.data)) {
          console.error("Expected /showtimesDates to return an array", response.data);
          setShowDatesData([]);
          return;
        }

        setShowDatesData(response.data);
        if (userDate === "") dispatch(resetCart());
      } catch (err) {
        console.error(err);
        setShowDatesData([]);
      } finally {
        setLoading(false);
      }
    };

    theatreId !== "" && fetchData();
  }, [theatreId, dispatch, userDate]);

  const checkedColor = (val) => {
    return {
      backgroundColor: val === userDate ? "#ef5e78" : "",
      color: val === userDate ? "#e6e6e8" : "",
    };
  };

  const hasSelectedDate = showDatesData.some(
    (dateData) => toDateKey(dateData.showtime_date) === userDate
  );
  const visibleDates =
    userDate && !hasSelectedDate
      ? [{ showtime_date: userDate }, ...showDatesData].sort((a, b) =>
          toDateKey(a.showtime_date).localeCompare(toDateKey(b.showtime_date))
        )
      : showDatesData;

  const dateOptions = visibleDates.map((dateData, idx) => {
    const formattedDate = toDateKey(dateData.showtime_date);
    const showtimeDate = dateKeyToDate(formattedDate);
    const day = showtimeDate.toLocaleString("en-us", {
      weekday: "short",
    });

    const month = showtimeDate.toLocaleString("en-us", {
      month: "short",
    });

    const date = showtimeDate.toLocaleString("en-us", {
      day: "numeric",
    });

    return (
      <div
        className="date-input-container"
        key={idx}
        style={checkedColor(formattedDate)}
      >
        <input
          disabled={loading || paymentOngoing}
          type="radio"
          id={idx}
          name="Select Date"
          value={formattedDate}
          onChange={(e) => dispatch(setShowDate(e.target.value))}
          checked={formattedDate === userDate}
        />

        <label className="form-date-detail" htmlFor={idx}>
          <p className="form-day">{day}</p>
          <div className="form-date-month">
            <p className="form-date">{date}</p>
            <p className="form-month">{month}</p>
          </div>
        </label>
      </div>
    );
  });

  return (
    <div>
      <form>
        <div className="form-item-heading">Chọn ngày</div>
        {!loading ? (
          <div className="form-item-options">{dateOptions}</div>
        ) : (
          <HashLoader color="#eb3656" />
        )}
      </form>
    </div>
  );
};
