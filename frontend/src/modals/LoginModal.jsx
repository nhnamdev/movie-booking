import { useState } from "react";
import axios from "axios";
import BarLoader from "react-spinners/esm/BarLoader.js";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { hideLoginModal, login } from "../reducers/authSlice";
import { loginFailedToast, loginSuccessToast } from "../toasts/toast";
import { API_URL } from "../utils/apiUrl";

export const LoginModal = () => {
  const [loading, setLoading] = useState(false);
  const [passViewState, setPassViewState] = useState(false);
  const [loginDetails, setLoginDetails] = useState({
    email: "",
    password: "",
  });

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const togglePassState = (e) => {
    e.preventDefault();
    setPassViewState((prevState) => !prevState);
  };

  const handleLoginDetails = (e) => {
    const name = e.target.name;
    const value = e.target.value;

    setLoginDetails((prevDetails) => ({ ...prevDetails, [name]: value }));
  };
  // hàm getLoginData gửi request đến API
  const getLoginData = async (e) => {
    e.preventDefault();

    if (loginDetails.email !== "" && loginDetails.password !== "") {
      setLoading(true);

      try {
        const response = await axios.post(
          `${API_URL}/login`,
          {
            email: loginDetails.email,
            password: loginDetails.password,
          }
        );
        // 1.2.2	Frontend tiếp tục gọi login(response.data) để cập nhập trạng thái login cho authSlice.js
        const userData = response.data.user;
        dispatch(login(userData));
        // 1.2.5	Khi cập nhật xong trạng thái thì đóng modal login
        dispatch(hideLoginModal());
        // 1.2.4	Khi cập nhật xong trạng thái thì hiển thị thông báo đăng nhập thành công trên trang chủ 
        loginSuccessToast();

        // Admin và nhân viên vận hành dùng chung khu vực nội bộ, nhưng khác quyền.
        if (["Admin", "Staff"].includes(userData.person_type)) {
          navigate("/admin");
        }
       
      } catch (err) {
        //1.2.9 Đăng nhập thất bại  chuyển về trang chủ.
        dispatch(hideLoginModal());
        //1.2.8  Frontend hiển thị thông báo đăng nhập không thành công trên trang chủ.
        loginFailedToast(err?.response?.data?.message || "Không thể kết nối tới máy chủ");
      } finally {
        setLoading(false);
        setLoginDetails({
          email: "",
          password: "",
        });
      }
    }
  };

  return (

    <div className="login-form">
      {/*  1.1.4, 1.1.5: Hệ thống khởi tạo form Login gồm các thông tin của người dùng và hiển thị form để người dùng nhập email, password */}
      <form
        onSubmit={(e) => {
          // 1.1.8: Khi người dùng nhấn nút Sign in, hàm getLoginData sẽ được gọi
          getLoginData(e);
        }}
      >
        <div className="signup-form-heading">
          <h2 className="signup-form-heading-text">Đăng nhập CGV Việt Nam</h2>
          <button
            type="button"
            className="btn-form-exit"
            onClick={() => dispatch(hideLoginModal())}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="form-icon"
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
        </div>
        {/* 1.1.6: Người dùng nhập email, password vào form */}
        <div className="signup-form-body">
          <div className="signup-form-category">
            <label>
              Email: <span>*</span>
            </label>
            <input
              name="email"
              type="email"
              disabled={loading}
              value={loginDetails.email}
              placeholder="Nhập email"
              onChange={(e) => handleLoginDetails(e)}
              required
            />
          </div>

          <div className="signup-form-category">
            <label>
              Nhập mật khẩu: <span>*</span>
            </label>
            <div className="input-password">
              <input
                name="password"
                disabled={loading}
                value={loginDetails.password}
                type={passViewState ? "text" : "password"}
                placeholder="Nhập mật khẩu"
                onChange={(e) => handleLoginDetails(e)}
                required
              />
              <button
                type="button"
                className="pass-icon-btn"
                onClick={(e) => togglePassState(e)}
              >
                {passViewState ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="pass-icon"
                    viewBox="0 0 512 512"
                  >
                    <path
                      d="M255.66 112c-77.94 0-157.89 45.11-220.83 135.33a16 16 0 00-.27 17.77C82.92 340.8 161.8 400 255.66 400c92.84 0 173.34-59.38 221.79-135.25a16.14 16.14 0 000-17.47C428.89 172.28 347.8 112 255.66 112z"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="32"
                    />
                    <circle
                      cx="256"
                      cy="256"
                      r="80"
                      fill="none"
                      stroke="currentColor"
                      strokeMiterlimit="10"
                      strokeWidth="32"
                    />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="pass-icon"
                    viewBox="0 0 512 512"
                  >
                    <path d="M432 448a15.92 15.92 0 01-11.31-4.69l-352-352a16 16 0 0122.62-22.62l352 352A16 16 0 01432 448zM255.66 384c-41.49 0-81.5-12.28-118.92-36.5-34.07-22-64.74-53.51-88.7-91v-.08c19.94-28.57 41.78-52.73 65.24-72.21a2 2 0 00.14-2.94L93.5 161.38a2 2 0 00-2.71-.12c-24.92 21-48.05 46.76-69.08 76.92a31.92 31.92 0 00-.64 35.54c26.41 41.33 60.4 76.14 98.28 100.65C162 402 207.9 416 255.66 416a239.13 239.13 0 0075.8-12.58 2 2 0 00.77-3.31l-21.58-21.58a4 4 0 00-3.83-1 204.8 204.8 0 01-51.16 6.47zM490.84 238.6c-26.46-40.92-60.79-75.68-99.27-100.53C349 110.55 302 96 255.66 96a227.34 227.34 0 00-74.89 12.83 2 2 0 00-.75 3.31l21.55 21.55a4 4 0 003.88 1 192.82 192.82 0 0150.21-6.69c40.69 0 80.58 12.43 118.55 37 34.71 22.4 65.74 53.88 89.76 91a.13.13 0 010 .16 310.72 310.72 0 01-64.12 72.73 2 2 0 00-.15 2.95l19.9 19.89a2 2 0 002.7.13 343.49 343.49 0 0068.64-78.48 32.2 32.2 0 00-.1-34.78z" />
                    <path d="M256 160a95.88 95.88 0 00-21.37 2.4 2 2 0 00-1 3.38l112.59 112.56a2 2 0 003.38-1A96 96 0 00256 160zM165.78 233.66a2 2 0 00-3.38 1 96 96 0 00115 115 2 2 0 001-3.38z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          {/* 1.1.7: Người dùng nhấn nút Sign in */}
          <button type="submit" className="btn-reg" disabled={loading}>
            {loading ? <BarLoader color="#e6e6e8" /> : "Đăng nhập"}
          </button>
        </div>
      </form>
    </div>
  );
};
