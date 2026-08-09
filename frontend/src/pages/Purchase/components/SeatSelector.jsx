import { useEffect, useState } from "react";
import axios from "axios";
import HashLoader from "react-spinners/HashLoader";
import { useDispatch, useSelector } from "react-redux";
import { setSeat } from "../../../reducers/cartSlice";

export const SeatSelector = ({ seatsData, setSeatsData, paymentOngoing }) => {
  const override = {
    display: "block",
    margin: "1.6rem auto",
  };

  const [loading, setLoading] = useState(false);

  const {
    movie_id: userMovieId,
    hall_id: userHallId,
    showtime_id: userShowtimeId,
    seat_id_list: userSeatList,
  } = useSelector((store) => store.cart);

  const dispatch = useDispatch();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await axios.post(
          `${import.meta.env.VITE_API_URL}/seats`,
          {
            userShowtimeId,
            userHallId,
            userMovieId,
          }
        );
        setSeatsData(response.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userHallId, userShowtimeId, userMovieId, setSeatsData]);

  const seatRows = Object.values(
    seatsData.reduce((rows, seat) => {
      const rowIndex = Number(seat.row_index || 1);
      rows[rowIndex] = rows[rowIndex] || { rowIndex, seats: [] };
      rows[rowIndex].seats.push(seat);
      return rows;
    }, {})
  ).sort((a, b) => a.rowIndex - b.rowIndex);
  const maxColumn = Math.max(1, ...seatsData.map((seat) => Number(seat.column_index || 1)));

  return (
    <div>
      <div className="form-item-heading">Chọn một ghế ngồi</div>
      {loading && <HashLoader cssOverride={override} color="#eb3656" />}
      {!loading && (
        <>
          <div className="seat-guide-container">
            <div className="seat-available-demo"></div>
            <p className="seat-status-details">Trống</p>
            <div className="seat-booked-demo"></div>
            <p className="seat-status-details">Đã đặt</p>
            <div className="seat-selected-demo"></div>
            <p className="seat-status-details">Đang chọn</p>
            <div className="seat-vip-demo"></div>
            <p className="seat-status-details">VIP</p>
          </div>
          <div className="theatre-screen">
            <div className="screen-1"></div>
            <div className="screen-2"></div>
          </div>
          <div className="theatre-screen-heading">Màn hình</div>
          <div className="seat-container">
            {seatRows.map((row) => (
              <div
                className="row seat-layout-row"
                key={row.rowIndex}
                style={{ gridTemplateColumns: `repeat(${maxColumn}, 4.4rem)` }}
              >
                {row.seats.map((seat) => {
                  const seatStatus = Number(seat.booked_status) === 0 ? "booked" : "available";
                  const selected = userSeatList.includes(seat.seat_id);
                  return (
                    <button
                      type="button"
                      className={`seat ${seatStatus} ${seat.seat_type === "VIP" ? "vip" : ""} ${selected ? "selected" : ""}`}
                      disabled={loading || paymentOngoing || seatStatus === "booked"}
                      onClick={() => dispatch(setSeat(seat.seat_id))}
                      key={seat.seat_id}
                      style={{ gridColumn: Number(seat.column_index || 1) }}
                      title={`${seat.seat_name} · ${seat.seat_type === "VIP" ? "VIP" : "Thường"} · ${Number(seat.final_price || 0).toLocaleString("vi-VN")}₫`}
                    >
                      {seat.seat_name}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
