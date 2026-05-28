import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import HashLoader from "react-spinners/HashLoader";
import { useSelector } from "react-redux";

import { ShowtimesCard } from "./ShowtimesCard";

const tabs = [
  { id: "now", label: "PHIM ĐANG CHIẾU" },
  { id: "upcoming", label: "Phim sắp chiếu" },
  { id: "prices", label: "BẢNG GIÁ VÉ" },
];

const toDateKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toISOString().slice(0, 10);
};

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

    const screenType = row.screen_type || "Standard";
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

const TicketPriceTable = () => (
  <div className="showtimes-price-panel">
    <h2>BẢNG GIÁ VÉ</h2>
    <div className="showtimes-price-grid">
      <div>
        <span>Standard 2D</span>
        <strong>120.000 VNĐ</strong>
      </div>
      <div>
        <span>Standard 3D</span>
        <strong>150.000 VNĐ</strong>
      </div>
      <div>
        <span>Deluxe 2D</span>
        <strong>150.000 VNĐ</strong>
      </div>
      <div>
        <span>Deluxe 3D</span>
        <strong>180.000 VNĐ</strong>
      </div>
    </div>
  </div>
);

export const ShowTimesCollection = () => {
  const override = {
    display: "block",
    margin: "4.8rem auto",
  };

  const [showtimesData, setShowtimesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("now");

  const { name: theatreName } = useSelector((store) => store.currentLocation);

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

    theatreName !== "" && fetchData();
  }, [theatreName]);

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
      : movieShowtimes;

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

        {loading && activeTab !== "prices" ? (
          <HashLoader cssOverride={override} color="#eb3656" />
        ) : activeTab === "prices" ? (
          <TicketPriceTable />
        ) : visibleMovies.length > 0 ? (
          <div className="showtimes-movies-list">
            {visibleMovies.map((showtime) => (
              <ShowtimesCard key={showtime.id} {...showtime} />
            ))}
          </div>
        ) : (
          <p className="showtimes-empty">Chưa có lịch chiếu phù hợp.</p>
        )}
      </div>
    </section>
  );
};
