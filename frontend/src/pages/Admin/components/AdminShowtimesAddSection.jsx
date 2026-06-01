import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { FiCalendar, FiEdit3, FiPlusCircle, FiRefreshCw, FiRotateCcw, FiSave, FiTrash2, FiX } from "react-icons/fi";
import { ClipLoader } from "react-spinners";
import {
  adminErrorToast,
  adminShowtimeToast,
  adminShowninToast,
} from "../../../toasts/toast";

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

export const AdminShowtimesAddSection = () => {
  const { signedPerson } = useSelector((store) => store.authentication);
  const [scheduleDates, setScheduleDates] = useState([]);
  const [newDate, setNewDate] = useState("");
  const [editingDate, setEditingDate] = useState("");
  const [editingNextDate, setEditingNextDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [datesLoading, setDatesLoading] = useState(false);

  const adminPayload = useMemo(
    () => ({
      email: signedPerson?.email,
      password: signedPerson?.password,
    }),
    [signedPerson?.email, signedPerson?.password]
  );

  const fetchScheduleDates = useCallback(async () => {
    if (!adminPayload.email || !adminPayload.password) return;

    try {
      setDatesLoading(true);
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/adminScheduleDates`,
        adminPayload
      );
      setScheduleDates(response.data);
    } catch (err) {
      adminErrorToast(err?.response?.data?.message);
    } finally {
      setDatesLoading(false);
    }
  }, [adminPayload]);

  useEffect(() => {
    fetchScheduleDates();
  }, [fetchScheduleDates]);

  const handleAddDate = async (e) => {
    e.preventDefault();
    if (!newDate) {
      adminErrorToast("Vui lòng chọn ngày chiếu");
      return;
    }

    try {
      setLoading(true);
      await axios.post(`${import.meta.env.VITE_API_URL}/adminScheduleDateAdd`, {
        ...adminPayload,
        showtimeDate: newDate,
      });
      adminShowtimeToast("Thêm lịch chiếu thành công");
      setNewDate("");
      await fetchScheduleDates();
    } catch (err) {
      adminErrorToast(err?.response?.data?.message);
    } finally {
      setLoading(false);
    }
  };

  const startEditDate = (dateValue) => {
    const dateInput = toDateInput(dateValue);
    setEditingDate(dateInput);
    setEditingNextDate(dateInput);
  };

  const cancelEditDate = () => {
    setEditingDate("");
    setEditingNextDate("");
  };

  const handleUpdateDate = async (e) => {
    e.preventDefault();
    if (!editingDate || !editingNextDate) {
      adminErrorToast("Vui lòng chọn ngày chiếu");
      return;
    }

    try {
      setLoading(true);
      await axios.post(`${import.meta.env.VITE_API_URL}/adminScheduleDateUpdate`, {
        ...adminPayload,
        currentDate: editingDate,
        nextDate: editingNextDate,
      });
      adminShowninToast("Cập nhật lịch chiếu thành công");
      cancelEditDate();
      await fetchScheduleDates();
    } catch (err) {
      adminErrorToast(err?.response?.data?.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDate = async (dateItem) => {
    const showtimeDate = toDateInput(dateItem.showtime_date);
    const hasTickets = Number(dateItem.ticket_count || 0) > 0;
    const shouldDelete = window.confirm(
      hasTickets
        ? `Huỷ/ngưng bán lịch chiếu ngày ${toVisualDate(showtimeDate)}? Vé đã đặt vẫn được giữ trong lịch sử.`
        : `Xoá lịch chiếu ngày ${toVisualDate(showtimeDate)}?`
    );
    if (!shouldDelete) return;

    try {
      setLoading(true);
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/adminScheduleDateDelete`, {
        ...adminPayload,
        showtimeDate,
      });
      adminShowninToast(
        response.data?.cancelled
          ? "Đã huỷ/ngưng bán lịch chiếu và giữ nguyên vé đã đặt"
          : "Xoá lịch chiếu thành công"
      );
      await fetchScheduleDates();
    } catch (err) {
      adminErrorToast(err?.response?.data?.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreDate = async (dateValue) => {
    const showtimeDate = toDateInput(dateValue);

    try {
      setLoading(true);
      await axios.post(`${import.meta.env.VITE_API_URL}/adminScheduleDateRestore`, {
        ...adminPayload,
        showtimeDate,
      });
      adminShowninToast("Đã mở bán lại lịch chiếu");
      await fetchScheduleDates();
    } catch (err) {
      adminErrorToast(err?.response?.data?.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="section-admin-showtimes container">
      <div className="admin-movie-list-header">
        <h2 className="form-admin-heading">
          <FiCalendar className="admin-heading-icon" />
          Quản lý lịch chiếu
        </h2>
        <button
          className="btn-admin admin-movie-refresh"
          onClick={fetchScheduleDates}
          type="button"
          disabled={datesLoading}
        >
          {datesLoading ? <ClipLoader color="#e6e6e8" size={16} /> : <FiRefreshCw />}
          Tải lại
        </button>
      </div>

      <form className="admin-schedule-form" onSubmit={handleAddDate}>
        <div>
          <label htmlFor="new-showtime-date">Ngày chiếu mới</label>
          <input
            id="new-showtime-date"
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
          />
        </div>
        <button className="btn-admin" type="submit" disabled={loading}>
          {loading && <ClipLoader color="#e6e6e8" size={16} />}
          <FiPlusCircle />
          Thêm lịch chiếu
        </button>
      </form>

      {datesLoading && (
        <div className="admin-movie-loading">
          <ClipLoader color="#eb3656" size={26} />
          <p>Đang tải lịch chiếu...</p>
        </div>
      )}

      {!datesLoading && scheduleDates.length === 0 && (
        <p className="admin-empty-state">Chưa có lịch chiếu trong hệ thống.</p>
      )}

      {!datesLoading && scheduleDates.length > 0 && (
        <div className="admin-schedule-list">
          {scheduleDates.map((dateItem) => {
            const dateInput = toDateInput(dateItem.showtime_date);
            const isEditing = editingDate === dateInput;
            const activeShowtimes = Number(dateItem.active_showtime_count || 0);
            const isCancelled = Number(dateItem.showtime_count || 0) > 0 && activeShowtimes === 0;
            const hasTickets = Number(dateItem.ticket_count || 0) > 0;

            return (
              <article className="admin-schedule-card" key={dateInput}>
                {isEditing ? (
                  <form className="admin-schedule-edit" onSubmit={handleUpdateDate}>
                    <div>
                      <label htmlFor={`edit-date-${dateInput}`}>Ngày chiếu</label>
                      <input
                        id={`edit-date-${dateInput}`}
                        type="date"
                        value={editingNextDate}
                        onChange={(e) => setEditingNextDate(e.target.value)}
                      />
                    </div>
                    <div className="admin-card-actions">
                      <button className="btn-admin" type="submit" disabled={loading}>
                        <FiSave />
                        Lưu
                      </button>
                      <button
                        className="btn-admin admin-btn-secondary"
                        type="button"
                        onClick={cancelEditDate}
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
                        <p className="admin-schedule-date">{toVisualDate(dateInput)}</p>
                        <span className={`admin-status-badge ${isCancelled ? "is-cancelled" : "is-active"}`}>
                          {isCancelled ? "Đã huỷ" : "Đang bán"}
                        </span>
                      </div>
                      <p className="admin-schedule-meta">
                        {dateItem.showtime_count || 0} khung giờ,{" "}
                        {dateItem.slot_count || 0} suất phim,{" "}
                        {dateItem.ticket_count || 0} vé
                      </p>
                    </div>
                    <div className="admin-card-actions">
                      <button
                        className="btn-admin admin-btn-secondary"
                        type="button"
                        onClick={() => startEditDate(dateInput)}
                        disabled={isCancelled}
                      >
                        <FiEdit3 />
                        Sửa
                      </button>
                      {isCancelled ? (
                        <button
                          className="btn-admin"
                          type="button"
                          onClick={() => handleRestoreDate(dateInput)}
                          disabled={loading}
                        >
                          <FiRotateCcw />
                          Mở bán lại
                        </button>
                      ) : (
                        <button
                          className="btn-admin admin-btn-danger"
                          type="button"
                          onClick={() => handleDeleteDate(dateItem)}
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
    </section>
  );
};
