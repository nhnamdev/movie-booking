import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import {
  FiDollarSign,
  FiSave,
  FiRefreshCw,
  FiInfo,
  FiCalendar,
  FiTv,
} from "react-icons/fi";
import ClipLoader from "react-spinners/esm/ClipLoader.js";
import { adminErrorToast, adminShowtimeToast } from "../../../toasts/toast";

export const AdminTicketPriceConfigSection = () => {
  const { signedPerson } = useSelector((store) => store.authentication);
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeRoomType, setActiveRoomType] = useState("Tiêu chuẩn");

  const fetchConfigs = useCallback(async () => {
    if (!signedPerson?.email) return;
    try {
      setLoading(true);
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/adminTicketPriceConfigs`,
        { email: signedPerson.email }
      );
      setConfigs(res.data || []);
    } catch (err) {
      adminErrorToast(err?.response?.data?.message || "Không thể tải cấu hình giá vé");
    } finally {
      setLoading(false);
    }
  }, [signedPerson?.email]);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const handlePriceChange = (id, newPrice) => {
    const parsed = parseInt(String(newPrice).replace(/\D/g, ""), 10) || 0;
    setConfigs((prev) =>
      prev.map((item) => (item.id === id ? { ...item, price: parsed } : item))
    );
  };

  const handleSave = async () => {
    if (!signedPerson?.email) return;
    try {
      setSaving(true);
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/adminTicketPriceConfigUpdate`,
        {
          email: signedPerson.email,
          configs,
        }
      );
      adminShowtimeToast(res?.data?.message || "Cập nhật cấu hình giá vé thành công!");
      fetchConfigs();
    } catch (err) {
      adminErrorToast(err?.response?.data?.message || "Không thể lưu cấu hình giá vé");
    } finally {
      setSaving(false);
    }
  };

  const roomTypes = ["Tiêu chuẩn", "Cao cấp"];

  const formatVND = (amount) => {
    if (!amount && amount !== 0) return "0 đ";
    return Number(amount).toLocaleString("vi-VN") + " VNĐ";
  };

  return (
    <div className="admin-price-config-section">
      <div className="admin-price-config-header">
        <div>
          <div className="admin-price-config-kicker">
            <FiDollarSign />
            <span>Cài Đặt Giá Ghế & Suất Chiếu</span>
          </div>
          <h2 className="admin-price-config-title">
            Bảng Cấu Hình Giá Vé Theo Ngày Trong Tuần
          </h2>
          <p className="admin-price-config-subtitle">
            Thiết lập giá ghế Thường và ghế VIP cho Ngày thường và Cuối tuần. Khi setup phòng & suất chiếu, hệ thống sẽ tự động áp giá mà không cần chỉnh lại thủ công.
          </p>
        </div>

        <div className="admin-price-config-actions">
          <button
            onClick={fetchConfigs}
            disabled={loading || saving}
            className="btn-admin-secondary"
            type="button"
          >
            <FiRefreshCw className={loading ? "animate-spin" : ""} />
            <span>Làm mới</span>
          </button>

          <button
            onClick={handleSave}
            disabled={loading || saving}
            className="btn-admin-primary"
            type="button"
          >
            {saving ? <ClipLoader size={16} color="#fff" /> : <FiSave />}
            <span>Lưu thay đổi</span>
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="admin-price-info-box">
        <FiInfo className="admin-price-info-icon" />
        <div className="admin-price-info-content">
          <strong>Quy tắc áp dụng giá vé tự động:</strong>
          <ul className="admin-price-info-list">
            <li><strong>Ngày thường (WEEKDAY)</strong>: Tự động áp dụng cho các suất chiếu Thứ 2, Thứ 3, Thứ 4, Thứ 5.</li>
            <li><strong>Cuối tuần (WEEKEND)</strong>: Tự động áp dụng cho các suất chiếu Thứ 6, Thứ 7, Chủ Nhật.</li>
            <li>Giá vé của từng ghế (Thường / VIP) sẽ tự động khớp theo loại phòng và định dạng (2D / 3D) của suất chiếu.</li>
          </ul>
        </div>
      </div>

      {/* Room Type Tabs */}
      <div className="admin-price-room-tabs">
        {roomTypes.map((rt) => (
          <button
            key={rt}
            type="button"
            onClick={() => setActiveRoomType(rt)}
            className={`admin-price-tab-btn ${activeRoomType === rt ? "active" : ""}`}
          >
            <FiTv />
            <span>Phòng {rt}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ClipLoader size={40} color="#eb3656" />
          <p className="text-sm text-gray-400 mt-4 font-medium">Đang tải bảng cấu hình giá vé...</p>
        </div>
      ) : (
        <div className="admin-price-grid">
          {/* WEEKDAY Card */}
          <div className="admin-price-card">
            <div className="admin-price-card-header">
              <div className="admin-price-card-icon weekday">
                <FiCalendar />
              </div>
              <div className="admin-price-card-title">
                <h3>Giá Ngày Thường (Thứ 2 - Thứ 5)</h3>
                <p>Phòng {activeRoomType} • Các suất chiếu từ Thứ 2 đến Thứ 5</p>
              </div>
            </div>

            <div className="admin-price-formats">
              {["2D", "3D"].map((showType) => (
                <div key={showType} className="admin-price-format-block">
                  <span className="admin-price-format-badge type-2d">
                    Định dạng {showType}
                  </span>

                  <div className="admin-price-seats-grid">
                    {["STANDARD", "VIP"].map((seatType) => {
                      const item = configs.find(
                        (c) =>
                          c.room_type === activeRoomType &&
                          c.show_type === showType &&
                          c.day_type === "WEEKDAY" &&
                          c.seat_type === seatType
                      );
                      const isVip = seatType === "VIP";

                      return (
                        <div key={seatType} className="admin-price-input-group">
                          <label className="admin-price-input-label">
                            <span>{isVip ? "⭐ Ghế VIP" : "🪑 Ghế Thường"}</span>
                            <span className="admin-price-formatted-preview">
                              {formatVND(item?.price || 0)}
                            </span>
                          </label>
                          <div className="admin-price-input-wrapper">
                            <input
                              type="text"
                              value={item?.price ? item.price.toLocaleString("vi-VN") : "0"}
                              onChange={(e) =>
                                item && handlePriceChange(item.id, e.target.value)
                              }
                              className="admin-price-input"
                            />
                            <span className="admin-price-unit">VNĐ</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* WEEKEND Card */}
          <div className="admin-price-card">
            <div className="admin-price-card-header">
              <div className="admin-price-card-icon weekend">
                <FiCalendar />
              </div>
              <div className="admin-price-card-title">
                <h3>Giá Cuối Tuần (Thứ 6 - Chủ Nhật)</h3>
                <p>Phòng {activeRoomType} • Các suất chiếu Thứ 6, Thứ 7 & Chủ Nhật</p>
              </div>
            </div>

            <div className="admin-price-formats">
              {["2D", "3D"].map((showType) => (
                <div key={showType} className="admin-price-format-block">
                  <span className="admin-price-format-badge type-3d">
                    Định dạng {showType}
                  </span>

                  <div className="admin-price-seats-grid">
                    {["STANDARD", "VIP"].map((seatType) => {
                      const item = configs.find(
                        (c) =>
                          c.room_type === activeRoomType &&
                          c.show_type === showType &&
                          c.day_type === "WEEKEND" &&
                          c.seat_type === seatType
                      );
                      const isVip = seatType === "VIP";

                      return (
                        <div key={seatType} className="admin-price-input-group">
                          <label className="admin-price-input-label">
                            <span>{isVip ? "⭐ Ghế VIP" : "🪑 Ghế Thường"}</span>
                            <span className="admin-price-formatted-preview">
                              {formatVND(item?.price || 0)}
                            </span>
                          </label>
                          <div className="admin-price-input-wrapper">
                            <input
                              type="text"
                              value={item?.price ? item.price.toLocaleString("vi-VN") : "0"}
                              onChange={(e) =>
                                item && handlePriceChange(item.id, e.target.value)
                              }
                              className="admin-price-input"
                            />
                            <span className="admin-price-unit">VNĐ</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

