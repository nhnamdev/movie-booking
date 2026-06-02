import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  FaChartBar,
  FaClock,
  FaClipboardList,
  FaEdit,
  FaFilm,
  FaHome,
  FaRobot,
  FaSignOutAlt,
  FaUserCircle,
} from "react-icons/fa";
import { logout } from "../../reducers/authSlice";
import { AdminMovieAddSection } from "./components/AdminMovieAddSection";
import { AdminShowtimesAddSection } from "./components/AdminShowtimesAddSection";
import { AdminShownInModifySection } from "./components/AdminShownInModifySection";
import { AdminDashboardPrimary } from "./components/AdminDashboardPrimary";
import { MovieWiseTicket } from "./components/MovieWiseTicket";
import { AdminAIPanel } from "./components/AdminAIPanel";
import { AdminOrdersSection } from "./components/AdminOrdersSection";

const tabs = [
  { id: "dashboard", label: "Tổng quan", icon: FaChartBar },
  { id: "orders", label: "Đơn hàng", icon: FaClipboardList },
  { id: "movies", label: "Quản lý phim", icon: FaFilm },
  { id: "showtimes", label: "Lịch chiếu", icon: FaClock },
  { id: "modify", label: "Chỉnh sửa suất chiếu", icon: FaEdit },
  { id: "ai", label: "Trợ lý AI", icon: FaRobot },
];

const AdminPage = () => {
  const [selectedShowDate, setSelectedShowDate] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  const { signedPerson } = useSelector((store) => store.authentication);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const activeTabData = tabs.find((tab) => tab.id === activeTab) || tabs[0];
  const ActiveIcon = activeTabData.icon;

  const handleSelectedDate = (e) => {
    setSelectedShowDate(e.target.value);
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate("/");
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <div className="admin-logo">
            <FaFilm className="admin-logo-icon" aria-hidden="true" />
            <h2>CGV Quản trị</h2>
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
              {signedPerson.first_name || "Admin"}
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
            Xin chào, {signedPerson.first_name || "Admin"}
          </p>
        </header>

        <div className="admin-content">
          {activeTab === "dashboard" && (
            <>
              <AdminDashboardPrimary />
              <MovieWiseTicket />
            </>
          )}

          {activeTab === "movies" && <AdminMovieAddSection />}

          {activeTab === "orders" && <AdminOrdersSection />}

          {activeTab === "showtimes" && (
            <AdminShowtimesAddSection
              selectedShowDate={selectedShowDate}
              setSelectedShowDate={setSelectedShowDate}
              handleSelectedDate={handleSelectedDate}
            />
          )}

          {activeTab === "modify" && (
            <AdminShownInModifySection selectedDate={selectedShowDate} />
          )}

          {activeTab === "ai" && <AdminAIPanel />}
        </div>
      </main>
    </div>
  );
};

export default AdminPage;
