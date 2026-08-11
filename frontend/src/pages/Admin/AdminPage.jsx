import { useState } from "react";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  FaChartBar,
  FaBuilding,
  FaClock,
  FaClipboardList,
  FaFilm,
  FaHome,
  FaChartLine,
  FaSignOutAlt,
  FaUserCircle,
  FaUserTie,
  FaGift,
} from "react-icons/fa";
import { GiPopcorn } from "react-icons/gi";
import { logout } from "../../reducers/authSlice";
import { AdminMovieAddSection } from "./components/AdminMovieAddSection";
import { AdminShownInModifySection } from "./components/AdminShownInModifySection";
import { AdminDashboardPrimary } from "./components/AdminDashboardPrimary";
import { AdminOrdersSection } from "./components/AdminOrdersSection";
import { AdminCinemaSection } from "./components/AdminCinemaSection";
import { AdminComboSection } from "./components/AdminComboSection";
import { AdminStaffSection } from "./components/AdminStaffSection";
import { AdminMoviePerformanceSection } from "./components/AdminMoviePerformanceSection";
import { API_URL } from "../../utils/apiUrl";
import { AdminRewardSection } from "./components/AdminRewardSection";

const adminTabs = [
  { id: "dashboard", label: "Tổng quan", icon: FaChartBar },
  { id: "orders", label: "Đơn hàng", icon: FaClipboardList },
  { id: "cinemas", label: "Chi nhánh & phòng", icon: FaBuilding },
  { id: "combos", label: "Combo bắp nước", icon: GiPopcorn },
  { id: "movies", label: "Quản lý phim", icon: FaFilm },
  { id: "showtimes", label: "Quản lý suất chiếu", icon: FaClock },
  { id: "performance", label: "Hiệu suất phim", icon: FaChartLine },
  { id: "rewards", label: "Điểm thưởng", icon: FaGift },
  { id: "staff", label: "Nhân viên", icon: FaUserTie },
];

const staffTabs = [
  { id: "orders", label: "Đơn hàng", icon: FaClipboardList },
];

const AdminPage = () => {
  const { signedPerson } = useSelector((store) => store.authentication);
  const isStaff = signedPerson.person_type === "Staff";
  const tabs = isStaff ? staffTabs : adminTabs;
  const [activeTab, setActiveTab] = useState(isStaff ? "orders" : "dashboard");
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const activeTabData = tabs.find((tab) => tab.id === activeTab) || tabs[0];
  const ActiveIcon = activeTabData.icon;

  const handleLogout = async () => {
    await axios.post(`${API_URL}/logout`).catch(() => {});
    dispatch(logout());
    navigate("/");
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <div className="admin-logo">
            <FaFilm className="admin-logo-icon" aria-hidden="true" />
            <h2>{isStaff ? "CGV Vận hành" : "CGV Quản trị"}</h2>
          </div>
        </div>

        <nav className="admin-nav" aria-label="Điều hướng quản trị">
          {tabs.map((tab) => {
            const TabIcon = tab.icon;

            return (
              <button
                key={tab.id}
                className={`admin-nav-item ${
                  activeTab === tab.id ? "active" : ""
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                <TabIcon className="admin-nav-icon" aria-hidden="true" />
                <span className="admin-nav-label">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-user-info">
            <FaUserCircle className="admin-user-avatar" aria-hidden="true" />
            <span className="admin-user-name">
              {signedPerson.first_name || (isStaff ? "Nhân viên" : "Admin")}
            </span>
          </div>
          <button className="admin-btn-back" onClick={() => navigate("/")}>
            <FaHome aria-hidden="true" />
            <span>Về trang chủ</span>
          </button>
          <button className="admin-btn-logout" onClick={handleLogout}>
            <FaSignOutAlt aria-hidden="true" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <p className="admin-topbar-kicker">Bảng điều khiển</p>
            <h1 className="admin-page-title">
              <ActiveIcon aria-hidden="true" />
              <span>{activeTabData.label}</span>
            </h1>
          </div>
          <p className="admin-topbar-user">
            Xin chào, {signedPerson.first_name || (isStaff ? "Nhân viên" : "Admin")}
          </p>
        </header>

        <div className="admin-content">
          {activeTab === "dashboard" && <AdminDashboardPrimary />}

          {activeTab === "movies" && <AdminMovieAddSection />}

          {activeTab === "orders" && <AdminOrdersSection />}

          {activeTab === "cinemas" && <AdminCinemaSection />}

          {activeTab === "combos" && <AdminComboSection />}

          {activeTab === "staff" && <AdminStaffSection />}

          {activeTab === "showtimes" && <AdminShownInModifySection />}

          {activeTab === "performance" && <AdminMoviePerformanceSection />}
          {activeTab === "rewards" && <AdminRewardSection />}
        </div>
      </main>
    </div>
  );
};

export default AdminPage;
