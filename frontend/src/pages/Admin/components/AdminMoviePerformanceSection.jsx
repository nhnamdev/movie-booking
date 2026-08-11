import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FaChartLine, FaChair, FaFilm, FaMoneyBillWave, FaPercentage, FaSyncAlt, FaTicketAlt } from "react-icons/fa";
import { useSelector } from "react-redux";
import { resolveMediaUrl } from "../../../utils/mediaUrl";

const periods = [
  { value: "7", label: "7 ngày" },
  { value: "30", label: "30 ngày" },
  { value: "90", label: "90 ngày" },
  { value: "all", label: "Toàn bộ" },
];

const toLocalDateKey = (date) => {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

const getDateRange = (period) => {
  if (period === "all") return { dateFrom: null, dateTo: null };
  const dateTo = new Date();
  const dateFrom = new Date(dateTo);
  dateFrom.setDate(dateFrom.getDate() - Number(period) + 1);
  return { dateFrom: toLocalDateKey(dateFrom), dateTo: toLocalDateKey(dateTo) };
};

const formatNumber = (value) => Number(value || 0).toLocaleString("vi-VN");
const formatMoney = (value) => `${formatNumber(value)}₫`;
const formatRate = (value) => (value == null ? "Chưa có dữ liệu" : `${Number(value).toFixed(1)}%`);

const lifecycleLabels = {
  showing: "Đang chiếu",
  upcoming: "Sắp chiếu",
  ended: "Đã kết thúc",
};

export const AdminMoviePerformanceSection = () => {
  const { signedPerson } = useSelector((store) => store.authentication);
  const [period, setPeriod] = useState("30");
  const [data, setData] = useState({ summary: null, movies: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const range = useMemo(() => getDateRange(period), [period]);

  const fetchPerformance = useCallback(async () => {
    if (!signedPerson?.email) return;
    try {
      setLoading(true);
      setError("");
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/adminMoviePerformance`,
        {
          email: signedPerson.email,
          ...range,
        }
      );
      setData(response.data);
    } catch (err) {
      setError(err?.response?.data?.message || "Không thể tải hiệu suất phim");
    } finally {
      setLoading(false);
    }
  }, [range, signedPerson?.email]);

  useEffect(() => {
    fetchPerformance();
  }, [fetchPerformance]);

  const summaryCards = [
    { icon: FaFilm, label: "Phim có lịch", value: formatNumber(data.summary?.total_movies) },
    { icon: FaChartLine, label: "Tổng suất chiếu", value: formatNumber(data.summary?.total_showtimes) },
    { icon: FaTicketAlt, label: "Vé đã bán", value: formatNumber(data.summary?.tickets_sold) },
    { icon: FaChair, label: "Lấp đầy ghế", value: formatRate(data.summary?.occupancy_rate ?? 0) },
    { icon: FaPercentage, label: "Checkout thành công", value: formatRate(data.summary?.purchase_rate) },
    { icon: FaMoneyBillWave, label: "Doanh thu vé", value: formatMoney(data.summary?.ticket_revenue) },
  ];

  return (
    <section className="admin-performance-section">
      <div className="admin-performance-header">
        <div className="admin-section-heading">
          <p className="admin-section-kicker">Vận hành lịch chiếu</p>
          <h2 className="form-admin-heading">Hiệu suất chiếu phim</h2>
          <p className="admin-performance-intro">So sánh sức bán theo từng phim để cân nhắc tăng, giảm hoặc dừng suất chiếu.</p>
        </div>
        <button type="button" className="btn-admin admin-performance-refresh" onClick={fetchPerformance} disabled={loading}>
          <FaSyncAlt /> Tải lại
        </button>
      </div>

      <div className="admin-performance-filter" aria-label="Khoảng thời gian thống kê">
        {periods.map((item) => (
          <button
            type="button"
            key={item.value}
            className={period === item.value ? "is-active" : ""}
            onClick={() => setPeriod(item.value)}
            aria-pressed={period === item.value}
          >
            {item.label}
          </button>
        ))}
        <span>{range.dateFrom ? `${range.dateFrom} đến ${range.dateTo}` : "Tất cả dữ liệu"}</span>
      </div>

      {error ? (
        <div className="admin-performance-error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={fetchPerformance}>Thử lại</button>
        </div>
      ) : null}

      {loading ? (
        <div className="admin-performance-skeleton" aria-label="Đang tải hiệu suất phim">
          {Array.from({ length: 6 }, (_, index) => <span key={index} />)}
        </div>
      ) : (
        <>
          <div className="admin-performance-summary">
            {summaryCards.map((card) => {
              const Icon = card.icon;
              return (
                <article key={card.label}>
                  <Icon aria-hidden="true" />
                  <strong>{card.value}</strong>
                  <span>{card.label}</span>
                </article>
              );
            })}
          </div>

          <p className="admin-performance-note">
            Tỷ lệ mua vé được tính bằng số checkout vé đã thanh toán thành công chia cho tổng checkout vé đã tạo. Dữ liệu cũ không có checkout sẽ hiển thị chưa có dữ liệu.
          </p>

          {data.movies.length === 0 ? (
            <p className="admin-empty-state">Chưa có phim trong khoảng thời gian đã chọn.</p>
          ) : (
            <div className="admin-performance-table">
              <div className="admin-performance-row is-header">
                <span>Phim</span><span>Suất chiếu</span><span>Vé / ghế</span><span>Lấp đầy</span><span>Suất kín</span><span>Mua vé</span><span>Doanh thu</span>
              </div>
              {data.movies.map((movie) => (
                <article className="admin-performance-row" key={movie.id}>
                  <div className="admin-performance-movie">
                    <img src={resolveMediaUrl(movie.image_path)} alt="" />
                    <div>
                      <strong>{movie.name}</strong>
                      <span className={`admin-performance-status is-${movie.screening_status}`}>{lifecycleLabels[movie.screening_status]}</span>
                    </div>
                  </div>
                  <div><span className="admin-performance-mobile-label">Suất chiếu</span><strong>{formatNumber(movie.total_showtimes)}</strong><small>{movie.completed_showtimes} đã kết thúc · {movie.cancelled_showtimes} ngừng bán</small></div>
                  <div><span className="admin-performance-mobile-label">Vé / ghế</span><strong>{formatNumber(movie.tickets_sold)} / {formatNumber(movie.seat_capacity)}</strong><small>Tổng vé bán và sức chứa</small></div>
                  <div className="admin-performance-rate"><span className="admin-performance-mobile-label">Lấp đầy</span><strong>{formatRate(movie.occupancy_rate)}</strong><span className="admin-performance-bar"><i style={{ width: `${Math.min(100, movie.occupancy_rate)}%` }} /></span></div>
                  <div><span className="admin-performance-mobile-label">Suất kín</span><strong>{formatRate(movie.full_showtime_rate)}</strong><small>{movie.full_showtimes} / {movie.completed_showtimes} suất đã kết thúc</small></div>
                  <div><span className="admin-performance-mobile-label">Mua vé</span><strong>{formatRate(movie.purchase_rate)}</strong><small>{movie.paid_order_count} / {movie.checkout_count} checkout</small></div>
                  <div><span className="admin-performance-mobile-label">Doanh thu</span><strong>{formatMoney(movie.ticket_revenue)}</strong></div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
};
