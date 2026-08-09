import { FaTimes } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout, showLoginModal, showSignModal } from "../reducers/authSlice";
import { toggleMenuState } from "../reducers/mobileNavSlice";

export const MobileNav = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { isAuthenticated, signedPerson } = useSelector(
    (store) => store.authentication
  );
  const { menuState } = useSelector((store) => store.mobileNav);

  const menuStyle = {
    opacity: "1",
    pointerEvents: "auto",
    visibility: "visible",
    transform: "translateX(0)",
  };

  const closeAndNavigate = (path) => {
    dispatch(toggleMenuState());
    navigate(path);
  };

  return (
    <div className="mobile-nav-menu" style={menuState ? menuStyle : {}}>
      <button
        className="btn-menu-close"
        onClick={() => dispatch(toggleMenuState())}
        aria-label="Đóng menu"
      >
        <FaTimes className="menu-icon" aria-hidden="true" />
      </button>

      <ul className="mobile-nav-items">
        <li className="mobile-nav-list-item">
          <button
            className="mobile-nav-item"
            onClick={() => closeAndNavigate("/bap-nuoc")}
          >
            Bắp nước
          </button>
        </li>
        <li className="mobile-nav-list-item">
          <button
            className="mobile-nav-item"
            onClick={() => closeAndNavigate("/")}
          >
            Trang chủ
          </button>
        </li>
        <li className="mobile-nav-list-item">
          <button
            className="mobile-nav-item"
            onClick={() => closeAndNavigate("/showtimes")}
          >
            Lịch chiếu
          </button>
        </li>
        <li className="mobile-nav-list-item">
          <button
            className="mobile-nav-item"
            onClick={() => closeAndNavigate("/aboutus")}
          >
            Về CGV
          </button>
        </li>
        {isAuthenticated && ["Admin", "Staff"].includes(signedPerson.person_type) && (
          <li className="mobile-nav-list-item">
            <button
              className="mobile-nav-item"
              onClick={() => closeAndNavigate("/admin")}
            >
              {signedPerson.person_type === "Staff" ? "Vận hành" : "Quản trị"}
            </button>
          </li>
        )}

        {!isAuthenticated && (
          <>
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
          </>
        )}

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
  );
};
