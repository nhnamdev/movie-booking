import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  FiCalendar,
  FiClock,
  FiEdit3,
  FiMapPin,
  FiMonitor,
  FiPlusCircle,
  FiRefreshCw,
  FiRotateCcw,
  FiSave,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import ClipLoader from "react-spinners/esm/ClipLoader.js";
import { adminErrorToast, adminShowtimeToast, adminShowninToast } from "../../../toasts/toast";

const emptyShowtimeForm = {
  movieId: "",
  theatreId: "",
  hallId: "",
  showtimeDate: "",
  movieStartTime: "",
  showType: "2D",
  screenType: "Tiêu chuẩn",
  pricePerSeat: "120000",
};

const ticketPrices = {
  "Tiêu chuẩn": { "2D": "120000", "3D": "150000" },
  "Cao cấp": { "2D": "150000", "3D": "180000" },
};

const getTicketPrice = (screenType, showType) =>
  ticketPrices[screenType]?.[showType] || "";

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

const toVisualTime = (value) => String(value || "").slice(0, 5);

const slotKey = (slot) => `${slot.showtime_id}-${slot.hall_id}-${slot.movie_id}`;

const toFormFromSlot = (slot, hall) => ({
  movieId: String(slot.movie_id || ""),
  theatreId: String(hall?.theatre_id || slot.theatre_id || ""),
  hallId: String(slot.hall_id || ""),
  showtimeDate: toDateInput(slot.showtime_date),
  movieStartTime: slot.movie_start_time || "",
  showType: slot.show_type || "2D",
  screenType: hall?.screen_type || slot.screen_type || "Tiêu chuẩn",
  pricePerSeat: getTicketPrice(
    hall?.screen_type || slot.screen_type || "Tiêu chuẩn",
    slot.show_type || "2D"
  ),
});

export const AdminShownInModifySection = () => {
  const { signedPerson } = useSelector((store) => store.authentication);
  const [slots, setSlots] = useState([]);
  const [movies, setMovies] = useState([]);
  const [halls, setHalls] = useState([]);
  const [showtimeOptions, setShowtimeOptions] = useState([]);
  const [selectedShowDate, setSelectedShowDate] = useState("");
  const [selectedTheatre, setSelectedTheatre] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [movieKeyword, setMovieKeyword] = useState("");
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
    }),
    [signedPerson?.email]
  );

  const fetchOptions = useCallback(async () => {
    if (!adminPayload.email) return;

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
    if (!adminPayload.email) return;

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

  const theatreOptions = useMemo(
    () =>
      [...new Set(slots.map((slot) => slot.theatre_name).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, "vi")
      ),
    [slots]
  );

  const formTheatreOptions = useMemo(() => {
    const theatreById = new Map();
    halls.forEach((hall) => {
      if (hall.theatre_id && hall.theatre_name) {
        theatreById.set(String(hall.theatre_id), hall.theatre_name);
      }
    });
    return [...theatreById.entries()].sort(([, nameA], [, nameB]) =>
      nameA.localeCompare(nameB, "vi")
    );
  }, [halls]);

  const selectableMovies = useMemo(() => {
    const keyword = movieKeyword.trim().toLocaleLowerCase("vi");
    if (!keyword) return movies;
    return movies.filter((movie) =>
      String(movie.name || "").toLocaleLowerCase("vi").includes(keyword)
    );
  }, [movieKeyword, movies]);

  useEffect(() => {
    if (selectedTheatre && !theatreOptions.includes(selectedTheatre)) {
      setSelectedTheatre("");
    }
  }, [selectedTheatre, theatreOptions]);

  const visibleSlots = useMemo(
    () =>
      slots.filter((slot) => {
        const isCancelled =
          slot.slot_status === "cancelled" || slot.showtime_status === "cancelled";
        const hasEnded = Number(slot.has_ended) === 1;
        const matchesTheatre = !selectedTheatre || slot.theatre_name === selectedTheatre;
        const matchesStatus =
          selectedStatus === "all" ||
          (selectedStatus === "active" && !isCancelled && !hasEnded) ||
          (selectedStatus === "ended" && !isCancelled && hasEnded) ||
          (selectedStatus === "cancelled" && isCancelled);
        return matchesTheatre && matchesStatus;
      }),
    [selectedStatus, selectedTheatre, slots]
  );

  const groupedSchedule = useMemo(() => {
    const dates = new Map();

    visibleSlots.forEach((slot) => {
      const dateKey = toDateInput(slot.showtime_date);
      const theatreKey = slot.theatre_name || "Chưa xác định chi nhánh";
      const hallKey = slot.hall_name || "Chưa xác định phòng";

      if (!dates.has(dateKey)) dates.set(dateKey, new Map());
      const theatres = dates.get(dateKey);
      if (!theatres.has(theatreKey)) theatres.set(theatreKey, new Map());
      const hallsByTheatre = theatres.get(theatreKey);
      if (!hallsByTheatre.has(hallKey)) hallsByTheatre.set(hallKey, []);
      hallsByTheatre.get(hallKey).push(slot);
    });

    return [...dates.entries()]
      .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
      .map(([date, theatres]) => ({
        date,
        theatres: [...theatres.entries()]
          .sort(([nameA], [nameB]) => nameA.localeCompare(nameB, "vi"))
          .map(([theatreName, hallsByTheatre]) => ({
            theatreName,
            halls: [...hallsByTheatre.entries()]
              .sort(([nameA], [nameB]) => nameA.localeCompare(nameB, "vi", { numeric: true }))
              .map(([hallName, hallSlots]) => ({
                hallName,
                slots: hallSlots.sort((slotA, slotB) =>
                  String(slotA.movie_start_time).localeCompare(String(slotB.movie_start_time))
                ),
              })),
          })),
      }));
  }, [visibleSlots]);

  const scheduleSummary = useMemo(() => {
    const cancelledCount = visibleSlots.filter(
      (slot) => slot.slot_status === "cancelled" || slot.showtime_status === "cancelled"
    ).length;
    const endedCount = visibleSlots.filter(
      (slot) =>
        slot.slot_status !== "cancelled" &&
        slot.showtime_status !== "cancelled" &&
        Number(slot.has_ended) === 1
    ).length;
    return {
      showtimes: visibleSlots.length,
      active: visibleSlots.length - cancelledCount - endedCount,
      ended: endedCount,
      cancelled: cancelledCount,
      halls: new Set(visibleSlots.map((slot) => `${slot.theatre_name}-${slot.hall_name}`)).size,
    };
  }, [visibleSlots]);

  const handleFormChange = (setter) => (e) => {
    const { name, value } = e.target;
    setter((prev) => {
      if (name === "theatreId") {
        return {
          ...prev,
          theatreId: value,
          hallId: "",
          showType: "2D",
          screenType: "Tiêu chuẩn",
          pricePerSeat: getTicketPrice("Tiêu chuẩn", "2D"),
        };
      }
      if (name === "hallId") {
        const hall = halls.find((item) => String(item.id) === String(value));
        const screenType = hall?.screen_type || "Tiêu chuẩn";
        const showType = hall?.projection_capability === "3D" ? "3D" : "2D";
        return {
          ...prev,
          hallId: value,
          showType,
          screenType,
          pricePerSeat: getTicketPrice(screenType, showType),
        };
      }
      if (name === "showType") {
        return {
          ...prev,
          showType: value,
          pricePerSeat: getTicketPrice(prev.screenType, value),
        };
      }
      return { ...prev, [name]: value };
    });
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
      setMovieKeyword("");
      setShowAddForm(false);
      await refreshAll();
    } catch (err) {
      adminErrorToast(err?.response?.data?.message);
    } finally {
      setLoading(false);
    }
  };

  const startEditSlot = (slot) => {
    const selectedHall = halls.find((hall) => Number(hall.id) === Number(slot.hall_id));
    setMovieKeyword("");
    setEditingOriginal(slot);
    setEditingKey(slotKey(slot));
    setEditingForm(toFormFromSlot(slot, selectedHall));
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
        ? `Ngừng bán suất ${slot.movie_name} lúc ${slot.movie_start_time} ngày ${toVisualDate(slot.showtime_date)}? Toàn bộ vé đã phát hành vẫn có hiệu lực.`
        : `Xoá suất ${slot.movie_name} lúc ${slot.movie_start_time} ngày ${toVisualDate(slot.showtime_date)}?`
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
      adminShowninToast(response.data?.stopped ? "Đã ngừng bán suất; toàn bộ vé vẫn có hiệu lực" : "Xoá suất chiếu thành công");
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

  const renderShowtimeFields = (form, onChange) => {
    const selectedMovie = movies.find((movie) => Number(movie.id) === Number(form.movieId));
    const selectedHall = halls.find((hall) => Number(hall.id) === Number(form.hallId));
    const availableHalls = halls.filter(
      (hall) => String(hall.theatre_id) === String(form.theatreId)
    );
    return (
    <>
      <div>
        <label>Phim</label>
        <input
          type="search"
          value={movieKeyword}
          onChange={(event) => setMovieKeyword(event.target.value)}
          placeholder="Tìm nhanh theo tên phim"
          aria-label="Tìm phim còn thời gian công chiếu"
        />
        <select name="movieId" value={form.movieId} onChange={onChange}>
          <option value="">
            {movies.length === 0 ? "Không có phim còn thời gian công chiếu" : "Chọn phim"}
          </option>
          {selectableMovies.map((movie) => (
            <option key={movie.id} value={movie.id}>
              {movie.name} · {movie.screening_status === "upcoming" ? "Sắp chiếu" : "Đang chiếu"} · đến {toVisualDate(movie.end_date)}
            </option>
          ))}
        </select>
        {movies.length > 0 && selectableMovies.length === 0 && (
          <small className="admin-field-hint">Không tìm thấy phim phù hợp.</small>
        )}
      </div>
      <div>
        <label>Chi nhánh</label>
        <select name="theatreId" value={form.theatreId} onChange={onChange}>
          <option value="">Chọn chi nhánh</option>
          {formTheatreOptions.map(([theatreId, theatreName]) => (
            <option key={theatreId} value={theatreId}>{theatreName}</option>
          ))}
        </select>
      </div>
      <div>
        <label>Phòng chiếu</label>
        <select name="hallId" value={form.hallId} onChange={onChange} disabled={!form.theatreId}>
          <option value="">Chọn phòng</option>
          {availableHalls.map((hall) => (
            <option key={hall.id} value={hall.id}>
              {hall.name} · {hall.screen_type} · {hall.projection_capability === "BOTH" ? "2D & 3D" : hall.projection_capability}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label>Ngày chiếu</label>
        <input
          name="showtimeDate"
          type="date"
          value={form.showtimeDate}
          onChange={onChange}
          min={selectedMovie?.release_date || undefined}
          max={selectedMovie?.end_date || undefined}
          disabled={!form.movieId}
        />
        {selectedMovie && (
          <small className="admin-field-hint">
            Thời gian công chiếu: {toVisualDate(selectedMovie.release_date)} - {toVisualDate(selectedMovie.end_date)}
          </small>
        )}
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
        <label>Định dạng</label>
        <select name="showType" value={form.showType} onChange={onChange} disabled={!selectedHall}>
          {selectedHall?.projection_capability !== "3D" && <option value="2D">2D</option>}
          {selectedHall?.projection_capability !== "2D" && <option value="3D">3D</option>}
        </select>
        {selectedHall && <small className="admin-field-hint">Theo khả năng trình chiếu của {selectedHall.name}.</small>}
      </div>
      <div>
        <label>Hạng phòng</label>
        <input value={selectedHall ? form.screenType : ""} placeholder="Chọn phòng trước" readOnly />
      </div>
      <div>
        <label>Giá vé</label>
        <input
          name="pricePerSeat"
          type="number"
          min="0"
          step="1000"
          value={form.pricePerSeat}
          readOnly
        />
        <small className="admin-field-hint">Tự động theo bảng giá vé.</small>
      </div>
    </>
    );
  };

  return (
    <section className="section-admin-movie-modify">
      <div className="section-movie-playlist container">
        <div className="admin-showtime-header">
          <div className="admin-showtime-heading-copy">
            <p className="admin-section-kicker">Lịch vận hành</p>
            <h2 className="form-admin-heading playlist">
              <FiClock className="admin-heading-icon" />
              Quản lý suất chiếu
            </h2>
            <p>Theo dõi lịch chiếu theo ngày, chi nhánh và từng phòng.</p>
          </div>
          <div className="admin-movie-toolbar-actions admin-showtime-primary-actions">
            <button
              className="btn-admin"
              type="button"
              onClick={() => {
                setShowAddForm(true);
                setMovieKeyword("");
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

        <div className="admin-showtime-filterbar">
          <label>
            <span>Ngày chiếu</span>
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
          </label>
          <label>
            <span>Chi nhánh</span>
            <select
              className="admin-filter-select"
              value={selectedTheatre}
              onChange={(e) => setSelectedTheatre(e.target.value)}
            >
              <option value="">Tất cả chi nhánh</option>
              {theatreOptions.map((theatre) => (
                <option key={theatre} value={theatre}>{theatre}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Trạng thái</span>
            <select
              className="admin-filter-select"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang bán</option>
              <option value="ended">Đã kết thúc</option>
              <option value="cancelled">Đã huỷ</option>
            </select>
          </label>
        </div>

        {!slotsLoading && slots.length > 0 && (
          <div className="admin-showtime-summary" aria-label="Tổng quan lịch chiếu đang hiển thị">
            <div><strong>{scheduleSummary.showtimes}</strong><span>Suất chiếu</span></div>
            <div><strong>{scheduleSummary.halls}</strong><span>Phòng đang dùng</span></div>
            <div className="is-active"><strong>{scheduleSummary.active}</strong><span>Đang bán</span></div>
            <div className="is-ended"><strong>{scheduleSummary.ended}</strong><span>Đã kết thúc</span></div>
            <div className="is-cancelled"><strong>{scheduleSummary.cancelled}</strong><span>Đã huỷ</span></div>
          </div>
        )}

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
                  setMovieKeyword("");
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

        {!slotsLoading && slots.length > 0 && visibleSlots.length === 0 && (
          <p className="admin-empty-state">Không có suất chiếu phù hợp với bộ lọc.</p>
        )}

        {!slotsLoading && groupedSchedule.length > 0 && (
          <div className="admin-showtime-calendar">
            {groupedSchedule.map((dateGroup) => {
              const dateSlotCount = dateGroup.theatres.reduce(
                (total, theatre) => total + theatre.halls.reduce((sum, hall) => sum + hall.slots.length, 0),
                0
              );
              return (
                <section className="admin-showtime-day" key={dateGroup.date}>
                  <header className="admin-showtime-day-header">
                    <div>
                      <FiCalendar />
                      <div><span>Ngày chiếu</span><strong>{toVisualDate(dateGroup.date)}</strong></div>
                    </div>
                    <span>{dateSlotCount} suất</span>
                  </header>

                  {dateGroup.theatres.map((theatre) => (
                    <section className="admin-showtime-theatre" key={theatre.theatreName}>
                      <header><FiMapPin /><strong>{theatre.theatreName}</strong></header>
                      <div className="admin-showtime-halls">
                        {theatre.halls.map((hall) => (
                          <div className="admin-showtime-hall-row" key={hall.hallName}>
                            <div className="admin-showtime-hall-label">
                              <FiMonitor />
                              <div><strong>{hall.hallName}</strong><span>{hall.slots.length} suất</span></div>
                            </div>
                            <div className="admin-showtime-timeline">
                              {hall.slots.map((slot) => {
                                const currentKey = slotKey(slot);
                                const isEditing = editingKey === currentKey;
                                const isStopped =
                                  slot.slot_status !== "active" || slot.showtime_status !== "active";
                                const hasEnded = !isStopped && Number(slot.has_ended) === 1;
                                const hasTickets = Number(slot.ticket_count || 0) > 0;
                                return (
                                  <article
                                    className={`admin-showtime-slot${isStopped ? " is-cancelled" : ""}${hasEnded ? " is-ended" : ""}${isEditing ? " is-editing" : ""}`}
                                    key={currentKey}
                                  >
                                    {isEditing ? (
                                      <form className="admin-showtime-form admin-showtime-form--inline" onSubmit={handleUpdateShowtime}>
                                        {renderShowtimeFields(editingForm, handleFormChange(setEditingForm))}
                                        <div className="admin-form-actions">
                                          <button className="btn-admin" type="submit" disabled={loading}><FiSave />Lưu</button>
                                          <button className="btn-admin admin-btn-secondary" type="button" onClick={cancelEditSlot}><FiX />Huỷ</button>
                                        </div>
                                      </form>
                                    ) : (
                                      <>
                                        <div className="admin-showtime-slot-topline">
                                          <strong className="admin-showtime-slot-time">{toVisualTime(slot.movie_start_time)}</strong>
                                          <span className={`admin-status-badge ${isStopped ? "is-cancelled" : hasEnded ? "is-ended" : "is-active"}`}>
                                            {isStopped ? "Ngừng bán" : hasEnded ? "Đã kết thúc" : "Đang bán"}
                                          </span>
                                        </div>
                                        <h4>{slot.movie_name}</h4>
                                        <div className="admin-showtime-slot-formats">
                                          <span>{slot.show_type}</span><span>{slot.screen_type}</span>
                                        </div>
                                        <div className="admin-showtime-slot-facts">
                                          <span>{Number(slot.price_per_seat || 0).toLocaleString("vi-VN")}đ</span>
                                          <span>{slot.ticket_count || 0} vé</span>
                                        </div>
                                        <div className="admin-card-actions admin-showtime-slot-actions">
                                          <button className="btn-admin admin-btn-secondary" type="button" onClick={() => startEditSlot(slot)} disabled={isStopped || hasEnded}><FiEdit3 />Sửa</button>
                                          {isStopped ? (
                                            <button className="btn-admin" type="button" onClick={() => handleRestoreShowtime(slot)} disabled={loading}><FiRotateCcw />Mở lại</button>
                                          ) : (
                                            <button
                                              className="btn-admin admin-btn-danger"
                                              type="button"
                                              onClick={() => handleDeleteShowtime(slot)}
                                              disabled={loading}
                                              title={hasTickets ? "Ngừng bán nhưng giữ nguyên toàn bộ vé" : "Xoá suất chiếu"}
                                            ><FiTrash2 />{hasTickets ? "Ngừng bán" : "Xoá"}</button>
                                          )}
                                        </div>
                                      </>
                                    )}
                                  </article>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
