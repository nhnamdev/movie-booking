import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { HashLink } from "react-router-hash-link";
import { logout, showLoginModal, showSignModal } from "../reducers/authSlice";
import { toggleMenuState } from "../reducers/mobileNavSlice";


export const Navbar = () => {
  let pageName;
  const navigate = useNavigate();
  const location = useLocation();

  const selectionTab = {
    backgroundColor: "#eb3656",
  };

  const { isAuthenticated, signedPerson } = useSelector(
    (store) => store.authentication
  );

  const dispatch = useDispatch();

  const handlelogout = () => {
    dispatch(logout());
  };

  if (location.pathname === "/") {
    pageName = "home";
  } else if (location.pathname === "/showtimes") {
    pageName = "showtimes";
  } else if (location.pathname === "/aboutus") {
    pageName = "aboutUs";
  }
  else if (location.pathname === "/admin") {
    pageName = "admin";
  } else {
    pageName = "";
  }

  return (
    <header>
      <button className="btn-menu" onClick={() => dispatch(toggleMenuState())}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="menu-icon"
          viewBox="0 0 512 512"
        >
          <path
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeMiterlimit="10"
            strokeWidth="32"
            d="M80 160h352M80 256h352M80 352h352"
          />
        </svg>
      </button>

      {pageName === "home" ? (
        <HashLink className="logo-container" to="#headerTop">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="main-logo-icon"
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
          <h1 className="logo-text">CGV VIETNAM</h1>
        </HashLink>
      ) : (
        <Link className="logo-container" to="/">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="main-logo-icon"
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
          <h1 className="logo-text">CGV VIETNAM</h1>
        </Link>
      )}

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

          {/* 6.1.1. Người dùng nhấn vào "Lịch chiếu phim sẽ liên kết đến endpoint /showtimes*/}
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

{/*12.1.2 Hệ thống kiểm tra quyền admin (Navbar) */}
          {isAuthenticated && signedPerson.person_type === "Admin" && (
// 12.1.3 Hệ thống render Navbar chứa liên kết điều hường “Admin” dành cho người có quyền  quản lý phim. (Navbar)
            <li>
{/*12.1.4 Sử dụng React Router’s <Link> với prop (to=’ /admin’) để xử lý điêù hướng sang trang AdminPage.*/}
              <Link
                className="nav-item"
// 12.1.6 Khi click, React Router chuyển hướng đến route /admin, tải trang AdminPage mà không reload lại trang.
                to="/admin"
                style={pageName === "admin" ? selectionTab : {}}
              >
                Admin
              </Link>
            </li>
          )}
        </ul>
      </nav>

      <div className="nav-signup">
        {!isAuthenticated ? (
          /* Chưa đăng nhập: hiện 2 nút Đăng ký / Đăng nhập */
          <div className="nav-auth-buttons">
            <button
              className="nav-auth-btn nav-auth-btn--signup"
              onClick={() => dispatch(showSignModal())}
            >
              Đăng ký
            </button>
            <button
              className="nav-auth-btn nav-auth-btn--login"
              // 1.1.2	Cài đặt sự kiện click cho button Sign In Button trên NavBar
              // 1.1.3	Người dùng click vào nút SignIn nằm bên góc phải màn hình
              onClick={() => dispatch(showLoginModal())}
            >
              Đăng nhập
            </button>
          </div>
        ) : (
          /* Đã đăng nhập: hiện tên + icon người + nút logout */
          <>
            <p className="nav-signed-name">{signedPerson.first_name} {signedPerson.last_name}</p>
            <button
              className="customer-profile-btn"
              onClick={(e) => {
                e.stopPropagation();
                if (signedPerson.person_type === "Customer") {
                  navigate("/customer");
                } else if (signedPerson.person_type === "Admin") {
                  navigate("/admin");
                }
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="profile-icon"
                viewBox="0 0 512 512"
              >
                <path
                  d="M344 144c-3.92 52.87-44 96-88 96s-84.15-43.12-88-96c-4-55 35-96 88-96s92 42 88 96z"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="32"
                />
                <path
                  d="M256 304c-87 0-175.3 48-191.64 138.6C62.39 453.52 68.57 464 80 464h352c11.44 0 17.62-10.48 15.65-21.4C431.3 352 343 304 256 304z"
                  fill="none"
                  stroke="currentColor"
                  strokeMiterlimit="10"
                  strokeWidth="32"
                />
              </svg>
            </button>
            <button className="btn-logout" onClick={handlelogout}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="logout-icon"
                viewBox="0 0 512 512"
              >
                <path
                  d="M304 336v40a40 40 0 01-40 40H104a40 40 0 01-40-40V136a40 40 0 0140-40h152c22.09 0 48 17.91 48 40v40M368 336l80-80-80-80M176 256h256"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="32"
                />
              </svg>
            </button>
          </>
        )}
      </div>
    </header>
  );
};
