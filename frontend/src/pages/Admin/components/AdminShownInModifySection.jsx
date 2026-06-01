import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  FiClock,
  FiEdit3,
  FiPlusCircle,
  FiRefreshCw,
  FiRotateCcw,
  FiSave,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import { ClipLoader } from "react-spinners";
import { adminErrorToast, adminShowtimeToast, adminShowninToast } from "../../../toasts/toast";

const emptyShowtimeForm = {
  movieId: "",
  hallId: "",
  showtimeDate: "",
  movieStartTime: "",
  showType: "2D",
  screenType: "Tiêu chuẩn",
  pricePerSeat: "120000",
};

const toDateInput = (value) => {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const toVisualDate = (value) => {
  const inputDate = toDateInput(value);
  if (!inputDate) return "";
  return new Date(`${inputDate}T00:00:00`).toLocaleDateString("vi-VN");
};

const slotKey = (slot) => `${slot.showtime_id}-${slot.hall_id}-${slot.movie_id}`;

const toFormFromSlot = (slot) => ({
  movieId: String(slot.movie_id || ""),
  hallId: String(slot.hall_id || ""),
  showtimeDate: toDateInput(slot.showtime_date),
  movieStartTime: slot.movie_start_time || "",
  showType: slot.show_type || "2D",
  screenType: slot.screen_type || "Tiêu chuẩn",
  pricePerSeat: String(slot.price_per_seat || ""),
});

export const AdminShownInModifySection = () => {
  const { signedPerson } = useSelector((store) => store.authentication);
  const [slots, setSlots] = useState([]);
  const [movies, setMovies] = useState([]);
  const [halls, setHalls] = useState([]);
  const [showtimeOptions, setShowtimeOptions] = useState([]);
  const [selectedShowDate, setSelectedShowDate] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showtimeForm, setShowtimeForm] = useState(emptyShowtimeForm);
  const [editingKey, setEditingKey] = useState("");
  const [editingOriginal, setEditingOriginal] = useState(null);
  const [editingForm, setEditingForm] = useState(emptyShowtimeForm);
  const [loading, setLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const adminPayload = useMemo(
    () => ({
      email: signedPerson?.email,
      password: signedPerson?.password,
    }),
    [signedPerson?.email, signedPerson?.password]
  );

  const fetchOptions = useCallback(async () => {
    if (!adminPayload.email || !adminPayload.password) return;

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/adminShowtimeOptions`,
        adminPayload
      );
      setMovies(response.data.movies || []);
      setHalls(response.data.halls || []);
      setShowtimeOptions(response.data.showtimes || []);
    } catch (err) {
      adminErrorToast(err?.response?.data?.message);
    }
  }, [adminPayload]);

  const fetchSlots = useCallback(async () => {
    if (!adminPayload.email || !adminPayload.password) return;

    try {
      setSlotsLoading(true);
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/adminShowtimeSlots`,
        {
          ...adminPayload,
          selectedShowDate,
        }
      );
      setSlots(response.data);
    } catch (err) {
      adminErrorToast(err?.response?.data?.message);
    } finally {
      setSlotsLoading(false);
    }
  }, [adminPayload, selectedShowDate]);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  const showDateOptions = useMemo(() => {
    const dates = new Set(
      showtimeOptions.map((showtime) => toDateInput(showtime.showtime_date))
    );
    return [...dates].filter(Boolean).sort((a, b) => b.localeCompare(a));
  }, [showtimeOptions]);

  const handleFormChange = (setter) => (e) => {
    const { name, value } = e.target;
    setter((prev) => ({ ...prev, [name]: value }));
  };

  const formIsValid = (form) =>
    Object.values(form).every((value) => String(value).trim() !== "");

  const refreshAll = async () => {
    await fetchOptions();
    await fetchSlots();
  };

  const handleCreateShowtime = async (e) => {
    e.preventDefault();
    if (!formIsValid(showtimeForm)) {
      adminErrorToast("Vui lòng nhập đầy đủ thông tin suất chiếu");
      return;
    }

    try {
      setLoading(true);
      await axios.post(`${import.meta.env.VITE_API_URL}/adminShowtimeCreate`, {
        ...adminPayload,
        ...showtimeForm,
      });
      adminShowtimeToast("Thêm suất chiếu thành công");
      setShowtimeForm(emptyShowtimeForm);
      setShowAddForm(false);
      await refreshAll();
    } catch (err) {
      adminErrorToast(err?.response?.data?.message);
    } finally {
      setLoading(false);
    }
  };

  const startEditSlot = (slot) => {
    setEditingOriginal(slot);
    setEditingKey(slotKey(slot));
    setEditingForm(toFormFromSlot(slot));
    setShowAddForm(false);
  };

  const cancelEditSlot = () => {
    setEditingOriginal(null);
    setEditingKey("");
    setEditingForm(emptyShowtimeForm);
  };

  const handleUpdateShowtime = async (e) => {
    e.preventDefault();
    if (!editingOriginal || !formIsValid(editingForm)) {
      adminErrorToast("Vui lòng nhập đầy đủ thông tin suất chiếu");
      return;
    }

    try {
      setLoading(true);
      await axios.post(`${import.meta.env.VITE_API_URL}/adminShowtimeUpdate`, {
        ...adminPayload,
        ...editingForm,
        originalMovieId: editingOriginal.movie_id,
        originalHallId: editingOriginal.hall_id,
        showtimeId: editingOriginal.showtime_id,
      });
      adminShowninToast("Cập nhật suất chiếu thành công");
      cancelEditSlot();
      await refreshAll();
    } catch (err) {
      adminErrorToast(err?.response?.data?.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteShowtime = async (slot) => {
    const hasTickets = Number(slot.ticket_count || 0) > 0;
    const shouldDelete = window.confirm(
      hasTickets
        ? `Huỷ/ngưng bán suất ${slot.movie_name} lúc ${slot.movie_start_time} ngày ${toVisualDate(
            slot.showtime_date
          )}? Vé đã đặt vẫn được giữ trong lịch sử.`
        : `Xoá suất ${slot.movie_name} lúc ${slot.movie_start_time} ngày ${toVisualDate(
            slot.showtime_date
          )}?`
    );
    if (!shouldDelete) return;

    try {
      setLoading(true);
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/adminShowtimeDelete`, {
        ...adminPayload,
        movieId: slot.movie_id,
        hallId: slot.hall_id,
        showtimeId: slot.showtime_id,
      });
      adminShowninToast(
        response.data?.cancelled
          ? "Đã huỷ/ngưng bán suất chiếu và giữ nguyên vé đã đặt"
          : "Xoá suất chiếu thành công"
      );
      await refreshAll();
    } catch (err) {
      adminErrorToast(err?.response?.data?.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreShowtime = async (slot) => {
    try {
      setLoading(true);
      await axios.post(`${import.meta.env.VITE_API_URL}/adminShowtimeRestore`, {
        ...adminPayload,
        movieId: slot.movie_id,
        hallId: slot.hall_id,
        showtimeId: slot.showtime_id,
      });
      adminShowninToast("Đã mở bán lại suất chiếu");
      await refreshAll();
    } catch (err) {
      adminErrorToast(err?.response?.data?.message);
    } finally {
      setLoading(false);
    }
  };

  const renderShowtimeFields = (form, onChange) => (
    <>
      <div>
        <label>Ngày chiếu</label>
        <input
          name="showtimeDate"
          type="date"
          value={form.showtimeDate}
          onChange={onChange}
        />
      </div>
      <div>
        <label>Giờ bắt đầu</label>
        <input
          name="movieStartTime"
          type="time"
          value={form.movieStartTime}
          onChange={onChange}
        />
      </div>
      <div>
        <label>Phim</label>
        <select name="movieId" value={form.movieId} onChange={onChange}>
          <option value="">Chọn phim</option>
          {movies.map((movie) => (
            <option key={movie.id} value={movie.id}>
              {movie.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label>Phòng chiếu</label>
        <select name="hallId" value={form.hallId} onChange={onChange}>
          <option value="">Chọn phòng</option>
          {halls.map((hall) => (
            <option key={hall.id} value={hall.id}>
              {hall.theatre_name} - {hall.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label>Định dạng</label>
        <select name="showType" value={form.showType} onChange={onChange}>
          <option value="2D">2D</option>
          <option value="3D">3D</option>
        </select>
      </div>
      <div>
        <label>Loại phòng</label>
        <select name="screenType" value={form.screenType} onChange={onChange}>
          <option value="Tiêu chuẩn">Tiêu chuẩn</option>
          <option value="Cao cấp">Cao cấp</option>
          <option value="IMAX">IMAX</option>
        </select>
      </div>
      <div>
        <label>Giá vé</label>
        <input
          name="pricePerSeat"
          type="number"
          min="0"
          step="1000"
          value={form.pricePerSeat}
          onChange={onChange}
        />
      </div>
    </>
  );

  return (
    <section className="section-admin-movie-modify">
      <div className="section-movie-playlist container">
        <div className="admin-movie-list-header">
          <h2 className="form-admin-heading playlist">
            <FiClock className="admin-heading-icon" />
            Quản lý suất chiếu
          </h2>
          <div className="admin-movie-toolbar-actions">
            <select
              className="admin-filter-select"
              value={selectedShowDate}
              onChange={(e) => setSelectedShowDate(e.target.value)}
            >
              <option value="">Tất cả ngày</option>
              {showDateOptions.map((dateValue) => (
                <option key={dateValue} value={dateValue}>
                  {toVisualDate(dateValue)}
                </option>
              ))}
            </select>
            <button
              className="btn-admin"
              type="button"
              onClick={() => {
                setShowAddForm(true);
                cancelEditSlot();
              }}
              disabled={showAddForm}
            >
              <FiPlusCircle />
              Thêm suất chiếu
            </button>
            <button
              className="btn-admin admin-movie-refresh"
              type="button"
              onClick={refreshAll}
              disabled={slotsLoading}
            >
              {slotsLoading ? <ClipLoader color="#e6e6e8" size={16} /> : <FiRefreshCw />}
              Tải lại
            </button>
          </div>
        </div>

        {showAddForm && (
          <form className="admin-showtime-form" onSubmit={handleCreateShowtime}>
            <div className="admin-form-panel-header">
              <div>
                <p className="admin-section-kicker">Suất chiếu mới</p>
                <h3 className="form-admin-heading">Thêm suất chiếu</h3>
              </div>
              <button
                className="btn-admin admin-btn-secondary"
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setShowtimeForm(emptyShowtimeForm);
                }}
              >
                <FiX />
                Huỷ
              </button>
            </div>
            {renderShowtimeFields(showtimeForm, handleFormChange(setShowtimeForm))}
            <div className="admin-form-actions">
              <button className="btn-admin" type="submit" disabled={loading}>
                {loading && <ClipLoader color="#e6e6e8" size={16} />}
                <FiSave />
                Thêm suất chiếu
              </button>
            </div>
          </form>
        )}

        {slotsLoading && (
          <div className="admin-movie-loading">
            <ClipLoader color="#eb3656" size={26} />
            <p>Đang tải suất chiếu...</p>
          </div>
        )}

        {!slotsLoading && slots.length === 0 && (
          <p className="admin-empty-state">Chưa có suất chiếu trong hệ thống.</p>
        )}

        {!slotsLoading && slots.length > 0 && (
          <div className="admin-showtime-grid">
            {slots.map((slot) => {
              const currentKey = slotKey(slot);
              const isEditing = editingKey === currentKey;
              const isCancelled =
                slot.slot_status === "cancelled" || slot.showtime_status === "cancelled";
              const hasTickets = Number(slot.ticket_count || 0) > 0;

              return (
                <article className="admin-showtime-card" key={currentKey}>
                  {isEditing ? (
                    <form className="admin-showtime-form admin-showtime-form--inline" onSubmit={handleUpdateShowtime}>
                      {renderShowtimeFields(editingForm, handleFormChange(setEditingForm))}
                      <div className="admin-form-actions">
                        <button className="btn-admin" type="submit" disabled={loading}>
                          <FiSave />
                          Lưu
                        </button>
                        <button
                          className="btn-admin admin-btn-secondary"
                          type="button"
                          onClick={cancelEditSlot}
                        >
                          <FiX />
                          Huỷ
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div>
                        <div className="admin-card-title-row">
                          <p className="admin-showtime-title">{slot.movie_name}</p>
                          <span className={`admin-status-badge ${isCancelled ? "is-cancelled" : "is-active"}`}>
                            {isCancelled ? "Đã huỷ" : "Đang bán"}
                          </span>
                        </div>
                        <p className="admin-showtime-meta">
                          {toVisualDate(slot.showtime_date)} - {slot.movie_start_time} -{" "}
                          {slot.show_type} - {slot.screen_type}
                        </p>
                        <p className="admin-showtime-meta">
                          {slot.theatre_name}, {slot.hall_name}
                        </p>
                      </div>
                      <div className="admin-showtime-stats">
                        <span>{Number(slot.price_per_seat || 0).toLocaleString("vi-VN")}đ</span>
                        <span>{slot.ticket_count || 0} vé</span>
                      </div>
                      <div className="admin-card-actions">
                        <button
                          className="btn-admin admin-btn-secondary"
                          type="button"
                          onClick={() => startEditSlot(slot)}
                          disabled={isCancelled}
                        >
                          <FiEdit3 />
                          Sửa
                        </button>
                        {isCancelled ? (
                          <button
                            className="btn-admin"
                            type="button"
                            onClick={() => handleRestoreShowtime(slot)}
                            disabled={loading}
                          >
                            <FiRotateCcw />
                            Mở bán lại
                          </button>
                        ) : (
                          <button
                            className="btn-admin admin-btn-danger"
                            type="button"
                            onClick={() => handleDeleteShowtime(slot)}
                            disabled={loading}
                          >
                            <FiTrash2 />
                            {hasTickets ? "Huỷ" : "Xoá"}
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
