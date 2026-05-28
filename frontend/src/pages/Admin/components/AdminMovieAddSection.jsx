import axios from "axios";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  FiCalendar,
  FiChevronDown,
  FiChevronUp,
  FiClock,
  FiEdit3,
  FiFilm,
  FiPlusCircle,
  FiRefreshCw,
  FiSave,
  FiStar,
  FiTag,
  FiTrash2,
  FiUsers,
  FiX,
} from "react-icons/fi";
import { ClipLoader } from "react-spinners";
import { useSelector } from "react-redux";
import {
  adminErrorToast,
  adminMovieDeleteToast,
  adminMovieToast,
  adminMovieUpdateToast,
} from "../../../toasts/toast";
import { generateMovieDescription } from "../../../utils/aiClient";

const emptyMovieInfo = {
  movieName: "",
  imagePath: "",
  language: "",
  description: "",
  rating: "",
  duration: "",
  cast: "",
  relDate: "",
  genres: "",
  directors: "",
};

const splitList = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const toDateInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toISOString().slice(0, 10);
};

const toMovieForm = (movie) => ({
  movieName: movie.name || "",
  imagePath: movie.image_path || "",
  language: movie.language || "",
  description: movie.synopsis || "",
  rating: movie.rating || "",
  duration: movie.duration || "",
  cast: movie.top_cast || "",
  relDate: toDateInput(movie.release_date),
  genres: movie.genres || "",
  directors: movie.directors || "",
});

const formatRating = (rating) => {
  const ratingNumber = Number(rating);
  return Number.isFinite(ratingNumber) ? ratingNumber.toFixed(1) : "N/A";
};

const movieCardMotion = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.18 },
};

export const AdminMovieAddSection = () => {
  const { signedPerson } = useSelector((store) => store.authentication);

  const [movieInfo, setMovieInfo] = useState(emptyMovieInfo);
  const [movies, setMovies] = useState([]);
  const [editingMovieId, setEditingMovieId] = useState(null);
  const [editMovieInfo, setEditMovieInfo] = useState(emptyMovieInfo);
  const [adminMovieDropDown, setAdminMovieDropDown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [moviesLoading, setMoviesLoading] = useState(false);
  const [aiDescLoading, setAiDescLoading] = useState(false);

  const adminPayload = {
    email: signedPerson?.email,
    password: signedPerson?.password,
  };

  const fetchMovies = async () => {
    if (!adminPayload.email || !adminPayload.password) return;

    try {
      setMoviesLoading(true);
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/adminMovies`,
        adminPayload
      );
      setMovies(response.data);
    } catch (err) {
      adminErrorToast(err?.response?.data?.message);
    } finally {
      setMoviesLoading(false);
    }
  };

  useEffect(() => {
    fetchMovies();
  }, [signedPerson?.email, signedPerson?.password]);

  const toggleAdminSection = () => {
    setAdminMovieDropDown((prevState) => !prevState);
  };

  const handleAIDescription = async () => {
    if (!movieInfo.movieName) return;
    setAiDescLoading(true);
    try {
      const res = await generateMovieDescription({
        name: movieInfo.movieName,
        genres: movieInfo.genres,
        director: movieInfo.directors,
        duration: movieInfo.duration,
        rating: movieInfo.rating,
      });
      setMovieInfo((prev) => ({ ...prev, description: res.data.description }));
    } catch {
      // AI helper is optional for this form.
    } finally {
      setAiDescLoading(false);
    }
  };

  const handleMovieInfo = (setter) => (e) => {
    const { name, value } = e.target;
    setter((prevInfo) => ({ ...prevInfo, [name]: value }));
  };

  const getMoviePayload = (formInfo) => ({
    ...adminPayload,
    name: formInfo.movieName.trim(),
    image_path: formInfo.imagePath.trim(),
    language: formInfo.language.trim(),
    synopsis: formInfo.description.trim(),
    rating: formInfo.rating,
    duration: formInfo.duration.trim(),
    top_cast: formInfo.cast.trim(),
    release_date: formInfo.relDate,
    genres: splitList(formInfo.genres),
    directors: splitList(formInfo.directors),
  });

  const formIsValid = (formInfo) =>
    Object.values(formInfo).every((value) => String(value).trim() !== "");

  const movieAdd = async (e) => {
    e.preventDefault();

    if (!formIsValid(movieInfo)) {
      adminErrorToast("Vui lòng nhập đầy đủ thông tin phim");
      return;
    }

    try {
      setLoading(true);
      const payload = getMoviePayload(movieInfo);
      const movieResponse = await axios.post(
        `${import.meta.env.VITE_API_URL}/adminMovieAdd`,
        payload
      );
      const movieId = movieResponse.data && movieResponse.data[0].last_id;

      if (movieId) {
        for (const genre of payload.genres) {
          await axios.post(`${import.meta.env.VITE_API_URL}/genreInsert`, {
            ...adminPayload,
            movieId,
            genre,
          });
        }

        for (const director of payload.directors) {
          await axios.post(`${import.meta.env.VITE_API_URL}/directorInsert`, {
            ...adminPayload,
            movieId,
            director,
          });
        }

        adminMovieToast();
        setAdminMovieDropDown(false);
        setMovieInfo(emptyMovieInfo);
        await fetchMovies();
      }
    } catch (err) {
      adminErrorToast(err?.response?.data?.message);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (movie) => {
    setEditingMovieId(movie.id);
    setEditMovieInfo(toMovieForm(movie));
  };

  const cancelEdit = () => {
    setEditingMovieId(null);
    setEditMovieInfo(emptyMovieInfo);
  };

  const movieUpdate = async (e) => {
    e.preventDefault();

    if (!editingMovieId || !formIsValid(editMovieInfo)) {
      adminErrorToast("Vui lòng nhập đầy đủ thông tin phim");
      return;
    }

    try {
      setLoading(true);
      await axios.post(`${import.meta.env.VITE_API_URL}/adminMovieUpdate`, {
        ...getMoviePayload(editMovieInfo),
        movieId: editingMovieId,
      });
      adminMovieUpdateToast();
      cancelEdit();
      await fetchMovies();
    } catch (err) {
      adminErrorToast(err?.response?.data?.message);
    } finally {
      setLoading(false);
    }
  };

  const movieDelete = async (movie) => {
    const shouldDelete = window.confirm(
      `Xoá phim "${movie.name}" khỏi danh sách? Phim đã có vé sẽ không được xoá.`
    );
    if (!shouldDelete) return;

    try {
      setLoading(true);
      await axios.post(`${import.meta.env.VITE_API_URL}/adminMovieDelete`, {
        ...adminPayload,
        movieId: movie.id,
      });
      adminMovieDeleteToast();
      await fetchMovies();
    } catch (err) {
      adminErrorToast(err?.response?.data?.message);
    } finally {
      setLoading(false);
    }
  };

  const renderMovieFormFields = (formInfo, onChange) => (
    <>
      <div>
        <p>Tên phim:</p>
        <input
          name="movieName"
          onChange={onChange}
          type="text"
          value={formInfo.movieName}
          placeholder="Nhập tên phim"
        />
      </div>

      <div>
        <p>Đường dẫn ảnh phim:</p>
        <input
          name="imagePath"
          onChange={onChange}
          type="text"
          value={formInfo.imagePath}
          placeholder="Nhập đường dẫn ảnh"
        />
      </div>

      <div>
        <p>Ngôn ngữ:</p>
        <input
          name="language"
          onChange={onChange}
          type="text"
          value={formInfo.language}
          placeholder="Nhập ngôn ngữ"
        />
      </div>

      <div>
        <p>Mô tả:</p>
        <input
          name="description"
          onChange={onChange}
          value={formInfo.description}
          placeholder="Nhập mô tả ngắn"
        />
      </div>

      <div>
        <p>Điểm xếp hạng (10):</p>
        <input
          name="rating"
          onChange={onChange}
          type="number"
          min="0"
          max="10"
          step="0.1"
          value={formInfo.rating}
          placeholder="Nhập điểm xếp hạng"
        />
      </div>

      <div>
        <p>Thời gian chiếu:</p>
        <input
          name="duration"
          onChange={onChange}
          type="text"
          value={formInfo.duration}
          placeholder="Ví dụ: 2h30m"
        />
      </div>

      <div>
        <p>Diễn viên chính:</p>
        <input
          name="cast"
          onChange={onChange}
          type="text"
          value={formInfo.cast}
          placeholder="Nhập tên diễn viên chính"
        />
      </div>

      <div>
        <p>Ngày phát hành:</p>
        <input
          name="relDate"
          onChange={onChange}
          type="date"
          value={formInfo.relDate}
        />
      </div>

      <div>
        <p>Thể loại phim:</p>
        <input
          name="genres"
          onChange={onChange}
          type="text"
          value={formInfo.genres}
          placeholder="Nhập các thể loại, cách nhau bằng dấu phẩy"
        />
      </div>

      <div>
        <p>Đạo diễn:</p>
        <input
          name="directors"
          onChange={onChange}
          type="text"
          value={formInfo.directors}
          placeholder="Nhập đạo diễn, cách nhau bằng dấu phẩy"
        />
      </div>
    </>
  );

  return (
    <section className="section-admin-movie-add container">
      <div className="form-heading-container">
        <h2 className="form-admin-heading">
          <FiPlusCircle className="admin-heading-icon" />
          Thêm Phim
        </h2>
        <button
          className="btn-admin-arrow"
          onClick={toggleAdminSection}
          type="button"
          title={adminMovieDropDown ? "Thu gọn form thêm phim" : "Mở form thêm phim"}
        >
          {adminMovieDropDown ? (
            <FiChevronUp className="admin-icon" />
          ) : (
            <FiChevronDown className="admin-icon" />
          )}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {adminMovieDropDown && (
          <motion.form
            {...movieCardMotion}
            className="form-movie-add"
            onSubmit={movieAdd}
          >
            {renderMovieFormFields(movieInfo, handleMovieInfo(setMovieInfo))}

            <button
              type="button"
              className="admin-ai-btn"
              onClick={handleAIDescription}
              disabled={aiDescLoading || !movieInfo.movieName}
            >
              {aiDescLoading && <ClipLoader color="#e6e6e8" size={16} />}
              <FiFilm />
              {aiDescLoading ? "Đang sinh..." : "AI sinh mô tả"}
            </button>

            <button type="submit" className="btn-admin" disabled={loading}>
              {loading && <ClipLoader color="#e6e6e8" size={16} />}
              <FiSave />
              {loading ? "Đang lưu" : "Thêm phim"}
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="admin-movie-list-header">
        <h2 className="form-admin-heading">
          <FiFilm className="admin-heading-icon" />
          Phim đang chiếu
        </h2>
        <button
          className="btn-admin admin-movie-refresh"
          onClick={fetchMovies}
          type="button"
        >
          {moviesLoading ? (
            <ClipLoader color="#e6e6e8" size={16} />
          ) : (
            <FiRefreshCw />
          )}
          Tải lại
        </button>
      </div>

      {moviesLoading && (
        <div className="admin-movie-loading">
          <ClipLoader color="#eb3656" size={26} />
          <p>Đang tải danh sách phim...</p>
        </div>
      )}

      {!moviesLoading && movies.length === 0 && (
        <p className="admin-movie-empty">Chưa có phim trong hệ thống.</p>
      )}

      {!moviesLoading && movies.length > 0 && (
        <motion.div layout className="admin-movie-grid">
          {movies.map((movie) => (
            <motion.article
              layout
              {...movieCardMotion}
              className="admin-movie-card"
              key={movie.id}
            >
              <img
                className="admin-movie-poster"
                src={movie.image_path}
                alt={`${movie.name} poster`}
              />

              {editingMovieId === movie.id ? (
                <motion.form
                  {...movieCardMotion}
                  className="form-movie-add admin-movie-edit-form"
                  onSubmit={movieUpdate}
                >
                  {renderMovieFormFields(
                    editMovieInfo,
                    handleMovieInfo(setEditMovieInfo)
                  )}
                  <div className="admin-movie-actions">
                    <button className="btn-admin" type="submit" disabled={loading}>
                      <FiSave />
                      Lưu
                    </button>
                    <button
                      className="btn-admin admin-btn-secondary"
                      type="button"
                      onClick={cancelEdit}
                    >
                      <FiX />
                      Huỷ
                    </button>
                  </div>
                </motion.form>
              ) : (
                <div className="admin-movie-card-body">
                  <div>
                    <h3>{movie.name}</h3>
                    <p className="admin-movie-genre-line">
                      <FiTag />
                      {movie.genres || "Chưa có thể loại"}
                    </p>
                  </div>
                  <div className="admin-movie-meta">
                    <span><FiStar />{formatRating(movie.rating)}/10</span>
                    <span><FiClock />{movie.duration}</span>
                    <span><FiCalendar />{toDateInput(movie.release_date)}</span>
                    <span><FiFilm />{movie.showtime_count || 0} suất chiếu</span>
                    <span><FiUsers />{movie.ticket_count || 0} vé</span>
                  </div>
                  <p className="admin-movie-description">{movie.synopsis}</p>
                  <div className="admin-movie-actions">
                    <button
                      className="btn-admin"
                      type="button"
                      onClick={() => startEdit(movie)}
                    >
                      <FiEdit3 />
                      Sửa
                    </button>
                    <button
                      className="btn-admin admin-btn-danger"
                      type="button"
                      onClick={() => movieDelete(movie)}
                      disabled={loading}
                    >
                      <FiTrash2 />
                      Xoá
                    </button>
                  </div>
                </div>
              )}
            </motion.article>
          ))}
        </motion.div>
      )}
    </section>
  );
};
