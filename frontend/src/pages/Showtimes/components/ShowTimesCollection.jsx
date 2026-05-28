import axios from "axios";
import { useEffect, useState } from "react";
import HashLoader from "react-spinners/HashLoader";
import { useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";

import { ShowtimesCard } from "./ShowtimesCard";

export const ShowTimesCollection = () => {
  const override = {
    display: "block",
    margin: "4.8rem auto",
  };

  const [showtimesData, setShowtimesData] = useState([]);
  const [loading, setLoading] = useState(true);

  const { name: theatreName } = useSelector((store) => store.currentLocation);
  const [searchParams] = useSearchParams();

  // Lấy giá trị genre từ URL search params (nếu có); nếu không có thì mặc định là "All"
  const userGenre = searchParams.get("genre") || "All";

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Gửi HTTP GET request đến endpoint `/showtimes` và lưu phản hồi vào biến `response`
        const response = await axios.post(
          `${import.meta.env.VITE_API_URL}/showtimes`,
          {
            theatreName,
            userGenre,
          }
        );

        setShowtimesData(response.data);
      } catch (err) {
        console.log(err);
      } finally {
        setLoading(false);
      }
    };

    theatreName !== "" && userGenre && fetchData();
  }, [theatreName, userGenre]);

  const movieShowtimes = [];

  for (let i = 0; i < showtimesData.length; i++) {
    const curMovieDate = showtimesData[i].showtime_date;
    const curMovieName = showtimesData[i].movie_name;
    const curMovieImagePath = showtimesData[i].image_path;
    const curMovieStartTime = showtimesData[i].movie_start_time;
    const curMovieType = showtimesData[i].show_type;
    const curMovieGenre = showtimesData[i].genre;
    const curMovieId = showtimesData[i].id;

    let isPresent = movieShowtimes.some(
      (movie) => movie.movie_name === curMovieName
    );

    if (isPresent) {
      let currentMovie = movieShowtimes.find(
        (movie) => movie.movie_name === curMovieName
      );

      if (!currentMovie.genre.includes(curMovieGenre)) {
        currentMovie.genre.push(curMovieGenre);
      }

      if (curMovieType in currentMovie) {
        if (curMovieDate in currentMovie[curMovieType]) {
          if (
            !currentMovie[curMovieType][curMovieDate].includes(
              curMovieStartTime
            )
          ) {
            currentMovie[curMovieType][curMovieDate].push(curMovieStartTime);
          }
        } else {
          currentMovie[curMovieType][curMovieDate] = [curMovieStartTime];
        }
      } else {
        currentMovie[curMovieType] = {
          [curMovieDate]: [curMovieStartTime],
        };
      }
    } else {
      movieShowtimes.push({
        id: curMovieId,
        movie_name: curMovieName,
        image_path: curMovieImagePath,
        genre: [curMovieGenre],
        [curMovieType]: {
          [curMovieDate]: [curMovieStartTime],
        },
      });
    }
  }

  // 6.1.7. Duyệt qua danh sách movieShowtimes và render mỗi phim thành một thẻ ShowtimesCard để hiển thị ra giao diện
  const showtimesCards = movieShowtimes.map((showtime, idx) => {
    return <ShowtimesCard key={idx} {...showtime} />;
  });

  return (
    <section className="section-showtimes">
      <div className="showtimes-collection container">

        {/* 6.1.5. Hiển thị nội dung danh sách phim*/}
        {loading ? (
          <HashLoader cssOverride={override} color="#eb3656" />
        ) : (
          showtimesCards
        )}
      </div>
    </section>
  );
};
