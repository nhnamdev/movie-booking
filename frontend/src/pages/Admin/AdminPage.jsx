import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout } from "../../reducers/authSlice";
import { AdminMovieAddSection } from "./components/AdminMovieAddSection";
import { AdminShowtimesAddSection } from "./components/AdminShowtimesAddSection";
import { AdminShownInModifySection } from "./components/AdminShownInModifySection";
import { AdminDashboardPrimary } from "./components/AdminDashboardPrimary";
import { MovieWiseTicket } from "./components/MovieWiseTicket";
import { AdminAIPanel } from "./components/AdminAIPanel";

const AdminPage = () => {
  const [selectedShowDate, setSelectedShowDate] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  const { signedPerson } = useSelector((store) => store.authentication);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleSelectedDate = (e) => {
    setSelectedShowDate(e.target.value);
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate("/");
  };

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "movies", label: "Quản lý phim", icon: "🎬" },
    { id: "showtimes", label: "Lịch chiếu", icon: "🕐" },
    { id: "modify", label: "Chỉnh sửa suất chiếu", icon: "🔄" },
    { id: "ai", label: "AI Assistant", icon: "✨" },
  ];

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <div className="admin-logo">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="admin-logo-icon"
              viewBox="0 0 512 512"
            >
              <path
                d="M448 256c0-106-86-192-192-192S64 150 64 256s86 192 192 192 192-86 192-192z"
                fill="none"
                stroke="currentColor"
                strokeMiterlimit="10"
                strokeWidth="32"
              />
              <path
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="32"
                d="M360 94.59V296M443.13 212.87L296 360M417.41 360H216M299.13 443.13l-144-144M152 416V216M68.87 299.13l144-144M94.59 152H288M212.87 68.87L360 216"
              />
            </svg>
            <h2>CGV Admin</h2>
          </div>
        </div>

        <nav className="admin-nav">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`admin-nav-item ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="admin-nav-icon">{tab.icon}</span>
              <span className="admin-nav-label">{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-user-info">
            <span className="admin-user-avatar">👤</span>
            <span className="admin-user-name">{signedPerson.first_name}</span>
          </div>
          <button className="admin-btn-back" onClick={() => navigate("/")}>
            ← Về trang chủ
          </button>
          <button className="admin-btn-logout" onClick={handleLogout}>
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="admin-main">
        <header className="admin-topbar">
          <h1 className="admin-page-title">
            {tabs.find((t) => t.id === activeTab)?.icon}{" "}
            {tabs.find((t) => t.id === activeTab)?.label}
          </h1>
        </header>

        <div className="admin-content">
          {activeTab === "dashboard" && (
            <>
              <AdminDashboardPrimary />
              <MovieWiseTicket />
            </>
          )}

          {activeTab === "movies" && <AdminMovieAddSection />}

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
