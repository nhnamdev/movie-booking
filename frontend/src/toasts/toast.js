import { toast } from "react-toastify";

export const toastPrimaryCategories = {
  position: "top-right",
  autoClose: 3000,
  closeOnClick: true,
  pauseOnHover: false,
  draggable: true,
};
export const toastFontStyle = {
  fontFamily: "Inter",
  fontSize: "1.6rem",
  fontWeight: 500,
  letterSpacing: "0.75px",
  color: "#1a1d2c",
};

// //////////////////
// Toasts handlers
// /////////////////
export const loginSuccessToast = () => {
  toast.success("Đăng nhập thành công", {
    ...toastPrimaryCategories,
    theme: "colored",
    style: toastFontStyle,
  });
};

export const loginFailedToast = (msg) => {
  toast.error(msg, {
    ...toastPrimaryCategories,
    theme: "colored",
    style: toastFontStyle,
  });
};

export const signupSuccessToast = (msg) => {
  toast.success(msg, {
    ...toastPrimaryCategories,
    theme: "colored",
    style: toastFontStyle,
  });
};

export const signupFailedToast = (msg) => {
  toast.error(msg, {
    ...toastPrimaryCategories,
    theme: "colored",
    style: toastFontStyle,
  });
};

export const ticketPurchaseError = (
  message = "Xin lỗi, không thể hoàn tất việc mua vé"
) => {
  toast.error(message, {
    ...toastPrimaryCategories,
    theme: "colored",
    style: toastFontStyle,
  });
};

export const purchaseCompletion = (tickets) => {
  toast.success("🎉Chúc mừng việc mua vé thành công!", {
    ...toastPrimaryCategories,
    theme: "colored",
    style: toastFontStyle,
  });

  toast.success(`Your ticket ID:${tickets.join(",")}`, {
    position: "top-right",
    autoClose: 8000,
    closeOnClick: true,
    pauseOnHover: false,
    draggable: true,
    theme: "light",
    style: toastFontStyle,
  });
};

export const adminMovieToast = (msg = "Thêm phim thành công") => {
  toast.success(msg, {
    ...toastPrimaryCategories,
    theme: "light",
    style: toastFontStyle,
  });
};

export const adminMovieUpdateToast = (msg = "Cập nhật phim thành công") => {
  toast.success(msg, {
    ...toastPrimaryCategories,
    theme: "light",
    style: toastFontStyle,
  });
};

export const adminMovieDeleteToast = (msg = "Xoá phim thành công") => {
  toast.success(msg, {
    ...toastPrimaryCategories,
    theme: "light",
    style: toastFontStyle,
  });
};

export const adminShowtimeToast = (msg = "Thêm suất chiếu thành công") => {
  toast.success(msg, {
    ...toastPrimaryCategories,
    theme: "light",
    style: toastFontStyle,
  });
};

export const adminShowninToast = (msg = "Cập nhật suất chiếu thành công") => {
  toast.success(msg, {
    ...toastPrimaryCategories,
    theme: "light",
    style: toastFontStyle,
  });
};

export const adminErrorToast = (msg = "Không thể cập nhật. Vui lòng thử lại!") => {
  toast.error(msg, {
    ...toastPrimaryCategories,
    theme: "colored",
    style: toastFontStyle,
  });
};
