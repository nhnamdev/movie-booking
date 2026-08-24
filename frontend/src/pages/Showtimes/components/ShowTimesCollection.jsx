import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import HashLoader from "react-spinners/esm/HashLoader.js";
import { useSelector } from "react-redux";

import { ShowtimesCard } from "./ShowtimesCard";
import { CollectionCard } from "../../../components/CollectionCard";
import { toDateKey } from "../../../utils/dateUtils";

const tabs = [
  { id: "now", label: "PHIM ĐANG CHIẾU" },
  { id: "upcoming", label: "Phim sắp chiếu" },
  { id: "prices", label: "BẢNG GIÁ VÉ" },
];

const buildMovieSchedule = (rows) => {
  const moviesById = new Map();

  rows.forEach((row) => {
    if (!moviesById.has(row.id)) {
      moviesById.set(row.id, {
        id: row.id,
        movie_name: row.movie_name,
        image_path: row.image_path,
        language: row.language,
        duration: row.duration,
        release_date: row.release_date,
        audio_type: row.audio_type || "Phụ Đề",
        age_rating:
          row.age_rating || "P: Phim dành cho khán giả mọi lứa tuổi",
        genres: new Set(),
        dates: new Map(),
      });
    }

    const movie = moviesById.get(row.id);
    if (row.genre) movie.genres.add(row.genre);

    const dateKey = toDateKey(row.showtime_date);
    if (!movie.dates.has(dateKey)) movie.dates.set(dateKey, new Map());

    const screenType = row.screen_type || "Tiêu chuẩn";
    const screenMap = movie.dates.get(dateKey);
    if (!screenMap.has(screenType)) screenMap.set(screenType, new Map());

    const timeKey = `${row.showtime_id}-${row.hall_id}`;
    screenMap.get(screenType).set(timeKey, {
      showtimeId: row.showtime_id,
      hallId: row.hall_id,
      hallName: row.hall_name,
      price: row.price_per_seat,
      showType: row.show_type,
      startTime: row.movie_start_time,
    });
  });

  return Array.from(moviesById.values()).map((movie) => ({
    ...movie,
    genres: Array.from(movie.genres),
    dates: Array.from(movie.dates.entries()).map(([date, screenMap]) => ({
      date,
      screens: Array.from(screenMap.entries()).map(([screenType, timeMap]) => ({
        screenType,
        times: Array.from(timeMap.values()).sort((a, b) =>
          a.startTime.localeCompare(b.startTime)
        ),
      })),
    })),
  }));
};

const TicketPriceTable = () => {
  const [priceConfigs, setPriceConfigs] = useState([]);
  const [loadingPrices, setLoadingPrices] = useState(true);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        setLoadingPrices(true);
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/ticketPriceConfigs`
        );
        setPriceConfigs(res.data || []);
      } catch (err) {
        console.error("Không thể tải bảng giá vé từ DB:", err);
      } finally {
        setLoadingPrices(false);
      }
    };
    fetchPrices();
  }, []);

  const formatPrice = (price) => {
    return Number(price || 0).toLocaleString("vi-VN") + " VNĐ";
  };

  return (
    <div className="showtimes-price-panel">
      <h2>BẢNG GIÁ VÉ NIÊM YẾT CGV</h2>
      <p className="showtimes-price-note">
        * Giá vé áp dụng theo loại phòng chiếu, định dạng 2D/3D, loại ghế và thời điểm trong tuần.
      </p>

      {loadingPrices ? (
        <div style={{ textAlign: "center", padding: "3.2rem", color: "#94a3b8", fontSize: "1.4rem" }}>
          Đang tải bảng giá vé...
        </div>
      ) : priceConfigs.length > 0 ? (
        <div className="showtimes-price-matrix-wrap">
          {["Tiêu chuẩn", "Cao cấp"].map((room) => {
            const roomConfigs = priceConfigs.filter((c) => c.room_type === room);
            if (roomConfigs.length === 0) return null;

            return (
              <div key={room} className="showtimes-price-room-group">
                <h3 className="showtimes-price-room-title">Phòng Chiếu {room}</h3>
                <div className="showtimes-price-grid">
                  {roomConfigs.map((cfg) => (
                    <div key={cfg.id} className="showtimes-price-item">
                      <span className="price-item-type">
                        {cfg.show_type} • {cfg.seat_type === "VIP" ? "Ghế VIP" : "Ghế Thường"}
                      </span>
                      <span className="price-item-day">
                        {cfg.day_type === "WEEKDAY" ? "Thứ 2 - Thứ 5" : "Cuối tuần (T6 - CN)"}
                      </span>
                      <strong className="price-item-value">{formatPrice(cfg.price)}</strong>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="showtimes-price-grid">
          <div>
            <span>Tiêu chuẩn 2D (Ngày thường)</span>
            <strong>120.000 VNĐ</strong>
          </div>
          <div>
            <span>Tiêu chuẩn 3D (Ngày thường)</span>
            <strong>150.000 VNĐ</strong>
          </div>
          <div>
            <span>Cao cấp 2D (Ngày thường)</span>
            <strong>150.000 VNĐ</strong>
          </div>
          <div>
            <span>Cao cấp 3D (Ngày thường)</span>
            <strong>180.000 VNĐ</strong>
          </div>
        </div>
      )}
    </div>
  );
};

export const ShowTimesCollection = () => {
  const override = {
    display: "block",
    margin: "4.8rem auto",
  };

  const [showtimesData, setShowtimesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("now");

  const [noTheatreMovies, setNoTheatreMovies] = useState([]);
  const [noTheatreLoading, setNoTheatreLoading] = useState(false);

  const { name: theatreName } = useSelector((store) => store.currentLocation);

  // Fetch showtimes khi đã chọn rạp
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await axios.post(
          `${import.meta.env.VITE_API_URL}/showtimes`,
          {
            theatreName,
            userGenre: "All",
          }
        );

        setShowtimesData(response.data);
      } catch (err) {
        console.log(err);
      } finally {
        setLoading(false);
      }
    };

    if (theatreName !== "") {
      fetchData();
    }
  }, [theatreName]);

  // Fetch movies khi chưa chọn rạp
  useEffect(() => {
    if (theatreName !== "") return;
    if (activeTab === "prices") return;

    const fetchNoTheatreData = async () => {
      setNoTheatreLoading(true);
      try {
        const url = activeTab === "upcoming"
          ? `${import.meta.env.VITE_API_URL}/upcomingMovies`
          : `${import.meta.env.VITE_API_URL}/latestMovies`;
        const response = await axios.get(url);
        setNoTheatreMovies(response.data || []);
      } catch (err) {
        console.error(err);
        setNoTheatreMovies([]);
      } finally {
        setNoTheatreLoading(false);
      }
    };

    fetchNoTheatreData();
  }, [theatreName, activeTab]);

  const movieShowtimes = useMemo(
    () => buildMovieSchedule(showtimesData),
    [showtimesData]
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const visibleMovies =
    activeTab === "upcoming"
      ? movieShowtimes.filter((movie) => {
          const releaseDate = new Date(movie.release_date);
          return !Number.isNaN(releaseDate.getTime()) && releaseDate > today;
        })
      : movieShowtimes.filter((movie) => {
          const releaseDate = new Date(movie.release_date);
          return !Number.isNaN(releaseDate.getTime()) && releaseDate <= today;
        });

  // Render khi không chọn rạp (Hiển thị card banner trượt giống trang chủ)
  const renderNoTheatreContent = () => {
    if (noTheatreLoading) {
      return <HashLoader cssOverride={override} color="#eb3656" />;
    }

    if (noTheatreMovies.length === 0) {
      return (
        <p className="showtimes-empty">
          Hiện tại chưa có phim phù hợp.
        </p>
      );
    }

    const latestMoviesCards = noTheatreMovies.map((movie) => (
      <CollectionCard key={movie.id} {...movie} />
    ));
    const latestMovieCardsDouble = noTheatreMovies.map((movie) => (
      <CollectionCard key={movie.id + 100} {...movie} />
    ));

    return (
      <div className="home-collection-container">
        <div className="home-collection-inner">{latestMoviesCards}</div>
        <div className="home-collection-inner">{latestMovieCardsDouble}</div>
      </div>
    );
  };

  return (
    <section className="section-showtimes">
      <div className="showtimes-collection container">
        <div className="showtimes-tabs">
          {tabs.map((tab) => (
            <button
              type="button"
              key={tab.id}
              className={`showtimes-tab-btn ${
                activeTab === tab.id ? "active" : ""
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab !== "prices" && (
          <div className="re-head">
            <h2 className="heading --t-center">
              {activeTab === "upcoming" ? "PHIM SẮP CHIẾU" : "PHIM ĐANG CHIẾU"}
            </h2>
          </div>
        )}

        {activeTab === "prices" ? (
          <TicketPriceTable />
        ) : theatreName === "" ? (
          renderNoTheatreContent()
        ) : loading ? (
          <HashLoader cssOverride={override} color="#eb3656" />
        ) : visibleMovies.length > 0 ? (
          <div className="showtimes-movies-list">
            {visibleMovies.map((showtime) => (
              <ShowtimesCard key={showtime.id} {...showtime} />
            ))}
          </div>
        ) : (
          <p className="showtimes-empty">
            Không có lịch chiếu phù hợp tại rạp này.
          </p>
        )}
      </div>
    </section>
  );
};
