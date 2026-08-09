import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FiEdit3, FiGrid, FiPlus, FiSave, FiTrash2 } from "react-icons/fi";
import { useSelector } from "react-redux";
import { ClipLoader } from "react-spinners";
import { adminErrorToast, adminShowninToast } from "../../../toasts/toast";

const emptyTheatre = { theatreId: "", name: "", location: "", locationDetails: "", status: "active" };
const emptyHall = { hallId: "", theatreId: "", name: "", status: "active" };
const cellKey = (rowIndex, columnIndex) => `${rowIndex}-${columnIndex}`;

export const AdminCinemaSection = () => {
  const { signedPerson } = useSelector((store) => store.authentication);
  const [structure, setStructure] = useState([]);
  const [theatreForm, setTheatreForm] = useState(emptyTheatre);
  const [hallForm, setHallForm] = useState(emptyHall);
  const [selectedHall, setSelectedHall] = useState(null);
  const [layout, setLayout] = useState({});
  const [rowCount, setRowCount] = useState(6);
  const [columnCount, setColumnCount] = useState(8);
  const [vipSurcharge, setVipSurcharge] = useState(30000);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const credentials = useMemo(
    () => ({ email: signedPerson?.email, password: signedPerson?.password }),
    [signedPerson?.email, signedPerson?.password]
  );

  const apiPost = useCallback(
    (path, payload = {}) =>
      axios.post(`${import.meta.env.VITE_API_URL}/${path}`, { ...credentials, ...payload }),
    [credentials]
  );

  const loadStructure = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiPost("adminCinemaStructure");
      setStructure(response.data);
    } catch (err) {
      adminErrorToast(err?.response?.data?.message || "Không thể tải cấu trúc rạp");
    } finally {
      setLoading(false);
    }
  }, [apiPost]);

  useEffect(() => {
    loadStructure();
  }, [loadStructure]);

  const saveTheatre = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      await apiPost("adminTheatreUpsert", theatreForm);
      setTheatreForm(emptyTheatre);
      await loadStructure();
      adminShowninToast("Đã lưu chi nhánh");
    } catch (err) {
      adminErrorToast(err?.response?.data?.message || "Không thể lưu chi nhánh");
    } finally {
      setSaving(false);
    }
  };

  const saveHall = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      await apiPost("adminHallUpsert", hallForm);
      setHallForm(emptyHall);
      await loadStructure();
      adminShowninToast("Đã lưu phòng chiếu");
    } catch (err) {
      adminErrorToast(err?.response?.data?.message || "Không thể lưu phòng chiếu");
    } finally {
      setSaving(false);
    }
  };

  const removeTheatre = async (theatreId) => {
    if (!window.confirm("Xóa chi nhánh này?")) return;
    try {
      await apiPost("adminTheatreDelete", { theatreId });
      await loadStructure();
    } catch (err) {
      adminErrorToast(err?.response?.data?.message);
    }
  };

  const removeHall = async (hallId) => {
    if (!window.confirm("Xóa phòng chiếu này?")) return;
    try {
      await apiPost("adminHallDelete", { hallId });
      if (selectedHall?.id === hallId) setSelectedHall(null);
      await loadStructure();
    } catch (err) {
      adminErrorToast(err?.response?.data?.message);
    }
  };

  const editLayout = async (hall) => {
    try {
      setLoading(true);
      const response = await apiPost("adminHallLayout", { hallId: hall.id });
      const nextLayout = {};
      response.data.seats.forEach((seat) => {
        nextLayout[cellKey(seat.row_index, seat.column_index)] = {
          seatId: seat.seat_id,
          seatType: seat.seat_type,
          priceSurcharge: Number(seat.price_surcharge || 0),
        };
      });
      setLayout(nextLayout);
      setRowCount(Math.max(1, ...response.data.seats.map((seat) => Number(seat.row_index))));
      setColumnCount(Math.max(1, ...response.data.seats.map((seat) => Number(seat.column_index))));
      const firstVip = response.data.seats.find((seat) => seat.seat_type === "VIP");
      if (firstVip) setVipSurcharge(Number(firstVip.price_surcharge || 0));
      setSelectedHall({ ...hall, theatre_name: response.data.theatre_name });
    } catch (err) {
      adminErrorToast(err?.response?.data?.message || "Không thể tải sơ đồ ghế");
    } finally {
      setLoading(false);
    }
  };

  const fillGrid = () => {
    const next = { ...layout };
    for (let row = 1; row <= rowCount; row += 1) {
      for (let column = 1; column <= columnCount; column += 1) {
        const key = cellKey(row, column);
        next[key] = next[key] || { seatId: null, seatType: "STANDARD", priceSurcharge: 0 };
      }
    }
    setLayout(next);
  };

  const cycleSeat = (rowIndex, columnIndex) => {
    const key = cellKey(rowIndex, columnIndex);
    const current = layout[key];
    const next = { ...layout };
    if (!current) {
      next[key] = { seatId: null, seatType: "STANDARD", priceSurcharge: 0 };
    } else if (current.seatType === "STANDARD") {
      next[key] = { ...current, seatType: "VIP", priceSurcharge: vipSurcharge };
    } else {
      delete next[key];
    }
    setLayout(next);
  };

  const saveLayout = async () => {
    if (!selectedHall) return;
    const seats = Object.entries(layout)
      .map(([key, seat]) => {
        const [rowIndex, columnIndex] = key.split("-").map(Number);
        if (rowIndex > rowCount || columnIndex > columnCount) return null;
        return {
          seatId: seat.seatId,
          rowIndex,
          columnIndex,
          seatType: seat.seatType,
          priceSurcharge: seat.seatType === "VIP" ? Number(vipSurcharge) : 0,
        };
      })
      .filter(Boolean);
    try {
      setSaving(true);
      await apiPost("adminHallLayoutSave", { hallId: selectedHall.id, seats });
      await loadStructure();
      await editLayout(selectedHall);
      adminShowninToast("Đã lưu sơ đồ ghế");
    } catch (err) {
      adminErrorToast(err?.response?.data?.message || "Không thể lưu sơ đồ ghế");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="admin-management-section">
      <div className="admin-section-heading">
        <p className="admin-section-kicker">Hệ thống rạp</p>
        <h2 className="form-admin-heading">Chi nhánh, phòng và sơ đồ ghế</h2>
      </div>

      <div className="admin-management-forms">
        <form className="admin-management-form" onSubmit={saveTheatre}>
          <h3>{theatreForm.theatreId ? "Sửa chi nhánh" : "Thêm chi nhánh"}</h3>
          <input required placeholder="Tên chi nhánh" value={theatreForm.name} onChange={(e) => setTheatreForm({ ...theatreForm, name: e.target.value })} />
          <input required placeholder="Khu vực" value={theatreForm.location} onChange={(e) => setTheatreForm({ ...theatreForm, location: e.target.value })} />
          <textarea required placeholder="Địa chỉ chi tiết" value={theatreForm.locationDetails} onChange={(e) => setTheatreForm({ ...theatreForm, locationDetails: e.target.value })} />
          <select value={theatreForm.status} onChange={(e) => setTheatreForm({ ...theatreForm, status: e.target.value })}>
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Ngừng hoạt động</option>
          </select>
          <button className="btn-admin" disabled={saving}><FiSave /> Lưu chi nhánh</button>
        </form>

        <form className="admin-management-form" onSubmit={saveHall}>
          <h3>{hallForm.hallId ? "Sửa phòng" : "Thêm phòng"}</h3>
          <select required value={hallForm.theatreId} onChange={(e) => setHallForm({ ...hallForm, theatreId: e.target.value })}>
            <option value="">Chọn chi nhánh</option>
            {structure.map((theatre) => <option key={theatre.id} value={theatre.id}>{theatre.name}</option>)}
          </select>
          <input required placeholder="Tên phòng" value={hallForm.name} onChange={(e) => setHallForm({ ...hallForm, name: e.target.value })} />
          <select value={hallForm.status} onChange={(e) => setHallForm({ ...hallForm, status: e.target.value })}>
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Ngừng hoạt động</option>
          </select>
          <button className="btn-admin" disabled={saving}><FiPlus /> Lưu phòng</button>
        </form>
      </div>

      {loading ? <div className="admin-chart-loading"><ClipLoader color="#eb3656" /></div> : (
        <div className="admin-cinema-list">
          {structure.map((theatre) => (
            <article className="admin-cinema-card" key={theatre.id}>
              <div className="admin-cinema-card-header">
                <div><h3>{theatre.name}</h3><p>{theatre.location_details}</p></div>
                <div className="admin-inline-actions">
                  <button onClick={() => setTheatreForm({ theatreId: theatre.id, name: theatre.name, location: theatre.location, locationDetails: theatre.location_details, status: theatre.status })}><FiEdit3 /></button>
                  <button onClick={() => removeTheatre(theatre.id)}><FiTrash2 /></button>
                </div>
              </div>
              <div className="admin-hall-list">
                {theatre.halls.map((hall) => (
                  <div className="admin-hall-row" key={hall.id}>
                    <div><strong>{hall.name}</strong><small>{hall.total_seats} ghế · {hall.vip_seats} VIP · {hall.status === "active" ? "Hoạt động" : "Đã tắt"}</small></div>
                    <div className="admin-inline-actions">
                      <button onClick={() => editLayout(hall)} title="Sơ đồ ghế"><FiGrid /></button>
                      <button onClick={() => setHallForm({ hallId: hall.id, theatreId: hall.theatre_id, name: hall.name, status: hall.status })}><FiEdit3 /></button>
                      <button onClick={() => removeHall(hall.id)}><FiTrash2 /></button>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}

      {selectedHall ? (
        <div className="admin-seat-editor">
          <div className="admin-seat-editor-header">
            <div><p className="admin-section-kicker">Sơ đồ ghế</p><h3>{selectedHall.theatre_name} · {selectedHall.name}</h3></div>
            <button className="btn-admin" onClick={saveLayout} disabled={saving}><FiSave /> Lưu sơ đồ</button>
          </div>
          <div className="admin-layout-controls">
            <label>Số hàng <input type="number" min="1" max="26" value={rowCount} onChange={(e) => setRowCount(Number(e.target.value))} /></label>
            <label>Số cột <input type="number" min="1" max="50" value={columnCount} onChange={(e) => setColumnCount(Number(e.target.value))} /></label>
            <label>Phụ thu VIP <input type="number" min="0" step="1000" value={vipSurcharge} onChange={(e) => setVipSurcharge(Number(e.target.value))} /></label>
            <button className="btn-admin is-secondary" onClick={fillGrid}>Tạo đủ lưới</button>
          </div>
          <p className="admin-seat-help">Bấm từng ô để đổi: Lối đi → Ghế thường → Ghế VIP → Lối đi.</p>
          <div className="admin-seat-grid-scroll">
            <div className="admin-seat-screen">Màn hình</div>
            <div className="admin-seat-matrix" style={{ gridTemplateColumns: `repeat(${columnCount}, 4rem)` }}>
              {Array.from({ length: rowCount * columnCount }, (_, index) => {
                const rowIndex = Math.floor(index / columnCount) + 1;
                const columnIndex = (index % columnCount) + 1;
                const seat = layout[cellKey(rowIndex, columnIndex)];
                return (
                  <button
                    type="button"
                    key={`${rowIndex}-${columnIndex}`}
                    className={`admin-seat-cell ${seat ? (seat.seatType === "VIP" ? "is-vip" : "is-standard") : "is-empty"}`}
                    onClick={() => cycleSeat(rowIndex, columnIndex)}
                    title={seat ? `${String.fromCharCode(64 + rowIndex)}${columnIndex} · ${seat.seatType}` : "Lối đi"}
                  >
                    {seat ? `${String.fromCharCode(64 + rowIndex)}${columnIndex}` : "·"}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};
