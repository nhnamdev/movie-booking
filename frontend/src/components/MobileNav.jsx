import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout, showLoginModal, showSignModal } from "../reducers/authSlice";
import { toggleMenuState } from "../reducers/mobileNavSlice";

export const MobileNav = () => {
  const navigate = useNavigate();

  const { isAuthenticated, signedPerson } = useSelector(
    (store) => store.authentication
  );
  const { menuState } = useSelector((store) => store.mobileNav);

  const dispatch = useDispatch();

  const menuStyle = {
    opacity: "1",
    pointerEvents: "auto",
    visibility: "visible",
    transform: "translateX(0)",
  };

  return (
    <>
      <div className="mobile-nav-menu" style={menuState ? menuStyle : {}}>
        <button
          className="btn-menu-close"
          onClick={() => dispatch(toggleMenuState())}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="menu-icon"
            viewBox="0 0 512 512"
          >
            <path
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="32"
              d="M368 368L144 144M368 144L144 368"
            />
          </svg>
        </button>

        <ul className="mobile-nav-items">
          <li className="mobile-nav-list-item">
            <button
              className="mobile-nav-item"
              onClick={() => {
                dispatch(toggleMenuState());
                navigate("/");
              }}
            >
              Trang chủ
            </button>
          </li>
          <li className="mobile-nav-list-item">
            <button
              className="mobile-nav-item"
              onClick={() => {
                dispatch(toggleMenuState());
                navigate("/showtimes");
              }}
            >
              Lịch chiếu
            </button>
          </li>
          <li className="mobile-nav-list-item">
            <button
              className="mobile-nav-item"
              onClick={() => {
                dispatch(toggleMenuState());
                navigate("/aboutus");
              }}
            >
              Về CGV
            </button>
          </li>
          {isAuthenticated && signedPerson.person_type === "Admin" && (
            <li className="mobile-nav-list-item">
              <button
                className="mobile-nav-item"
                onClick={() => {
                  dispatch(toggleMenuState());
                  navigate("/admin");
                }}
              >
                Quản trị
              </button>
            </li>
          )}

          <li className="mobile-nav-list-item">
            <button
              className="mobile-nav-item"
              onClick={() => {
                dispatch(toggleMenuState());
                dispatch(showSignModal());
              }}
            >
              Đăng ký
            </button>
          </li>
          <li className="mobile-nav-list-item">
            <button
              className="mobile-nav-item"
              onClick={() => {
                dispatch(toggleMenuState());
                dispatch(showLoginModal());
              }}
            >
              Đăng nhập
            </button>
          </li>

          {isAuthenticated && (
            <li className="mobile-nav-list-item">
              <button
                className="mobile-nav-item"
                onClick={() => {
                  dispatch(logout());
                  dispatch(toggleMenuState());
                }}
              >
                Đăng xuất
              </button>
            </li>
          )}
        </ul>

        {isAuthenticated && (
          <p className="mobile-nav-name">
            Đang đăng nhập: {signedPerson.first_name}
          </p>
        )}
      </div>
    </>
  );
};
