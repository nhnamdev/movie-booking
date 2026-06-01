import { FaBars, FaFilm, FaSignOutAlt, FaUserCircle } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { HashLink } from "react-router-hash-link";
import { logout, showLoginModal, showSignModal } from "../reducers/authSlice";
import { toggleMenuState } from "../reducers/mobileNavSlice";

export const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const { isAuthenticated, signedPerson } = useSelector(
    (store) => store.authentication
  );

  const selectionTab = {
    backgroundColor: "#eb3656",
  };

  let pageName;
  if (location.pathname === "/") {
    pageName = "home";
  } else if (location.pathname === "/showtimes") {
    pageName = "showtimes";
  } else if (location.pathname === "/aboutus") {
    pageName = "aboutUs";
  } else if (location.pathname === "/admin") {
    pageName = "admin";
  } else {
    pageName = "";
  }

  const LogoLink = pageName === "home" ? HashLink : Link;
  const logoTarget = pageName === "home" ? "#headerTop" : "/";

  const handlelogout = () => {
    dispatch(logout());
  };

  const handleProfileNavigation = (e) => {
    e.stopPropagation();
    if (signedPerson.person_type === "Customer") {
      navigate("/customer");
    } else if (signedPerson.person_type === "Admin") {
      navigate("/admin");
    }
  };

  return (
    <header>
      <button
        className="btn-menu"
        onClick={() => dispatch(toggleMenuState())}
        aria-label="Mở menu"
      >
        <FaBars className="menu-icon" aria-hidden="true" />
      </button>

      <LogoLink className="logo-container" to={logoTarget}>
        <FaFilm className="main-logo-icon" aria-hidden="true" />
        <h1 className="logo-text">CGV VIETNAM</h1>
      </LogoLink>

      <nav>
        <ul className="nav-items">
          <li>
            <Link
              className="nav-item"
              to="/"
              style={pageName === "home" ? selectionTab : {}}
            >
              Trang chủ
            </Link>
          </li>
          <li>
            <Link
              className="nav-item"
              to="/showtimes"
              style={pageName === "showtimes" ? selectionTab : {}}
            >
              Lịch chiếu phim
            </Link>
          </li>
          <li>
            <Link
              className="nav-item"
              to="/aboutus"
              style={pageName === "aboutUs" ? selectionTab : {}}
            >
              Liên hệ
            </Link>
          </li>

          {isAuthenticated && signedPerson.person_type === "Admin" && (
            <li>
              <Link
                className="nav-item"
                to="/admin"
                style={pageName === "admin" ? selectionTab : {}}
              >
                Quản trị
              </Link>
            </li>
          )}
        </ul>
      </nav>

      <div className="nav-signup">
        {!isAuthenticated ? (
          <div className="nav-auth-buttons">
            <button
              className="nav-auth-btn nav-auth-btn--signup"
              onClick={() => dispatch(showSignModal())}
            >
              Đăng ký
            </button>
            <button
              className="nav-auth-btn nav-auth-btn--login"
              onClick={() => dispatch(showLoginModal())}
            >
              Đăng nhập
            </button>
          </div>
        ) : (
          <>
            <p className="nav-signed-name">
              {signedPerson.first_name} {signedPerson.last_name}
            </p>
            <button
              className="customer-profile-btn"
              onClick={handleProfileNavigation}
              aria-label="Tài khoản"
            >
              <FaUserCircle className="profile-icon" aria-hidden="true" />
            </button>
            <button
              className="btn-logout"
              onClick={handlelogout}
              aria-label="Đăng xuất"
            >
              <FaSignOutAlt className="logout-icon" aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </header>
  );
};
