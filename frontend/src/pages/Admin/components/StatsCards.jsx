import { useState, useEffect } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import { FaMoneyBillWave, FaTicketAlt, FaFilm, FaClock, FaUsers, FaClipboardList } from "react-icons/fa";
import HashLoader from "react-spinners/esm/HashLoader.js";

const statCardConfig = [
  { key: "totalRevenue", icon: FaMoneyBillWave, label: "Tổng doanh thu", format: "vnd" },
  { key: "totalTickets", icon: FaTicketAlt, label: "Tổng vé đã bán", format: "number" },
  { key: "totalMovies", icon: FaFilm, label: "Phim đang chiếu", format: "number" },
  { key: "totalShowtimesToday", icon: FaClock, label: "Suất chiếu hôm nay", format: "number" },
  { key: "totalUsers", icon: FaUsers, label: "Người dùng", format: "number" },
  { key: "totalOrders", icon: FaClipboardList, label: "Đơn đặt vé", format: "number" },
];

export const StatsCards = () => {
  const { signedPerson } = useSelector((store) => store.authentication);
  const email = signedPerson?.email;
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!email) return;

    const fetchStats = async () => {
      try {
        const res = await axios.post(
          `${import.meta.env.VITE_API_URL}/adminDashboardStats`,
          { email }
        );
        setStats(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [email]);

  const formatValue = (value, format) => {
    if (!Number.isFinite(value)) return "0";
    if (format === "vnd") return value.toLocaleString("vi-VN") + " VND";
    return value.toLocaleString("vi-VN");
  };

  return (
    <section className="admin-stats-section">
      <div className="admin-section-heading">
        <p className="admin-section-kicker">Tổng quan</p>
        <h2 className="form-admin-heading dash-heading">Thống kê</h2>
      </div>
      <div className="admin-stats-grid">
        {statCardConfig.map((card) => {
          const Icon = card.icon;
          const value = stats?.[card.key];
          const isLoading = loading || stats === null;

          return (
            <div key={card.key} className="dashboard-pri-card">
              <Icon className="admin-icon" aria-hidden="true" />
              {isLoading ? (
                <HashLoader size={26} color="#eb3656" />
              ) : (
                <p className="admin-dashboard-val">
                  {formatValue(value, card.format)}
                </p>
              )}
              <p className="admin-dashboard-category">{card.label}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
};
