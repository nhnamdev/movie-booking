import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FiEdit3, FiSave, FiUserPlus } from "react-icons/fi";
import { useSelector } from "react-redux";
import { ClipLoader } from "react-spinners";
import { adminErrorToast, adminShowninToast } from "../../../toasts/toast";
import { API_URL } from "../../../utils/apiUrl";

const emptyForm = {
  originalEmail: "",
  staffEmail: "",
  firstName: "",
  lastName: "",
  phoneNumber: "",
  staffPassword: "",
  accountStatus: "active",
};

export const AdminStaffSection = () => {
  const { signedPerson } = useSelector((store) => store.authentication);
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const credentials = useMemo(
    () => ({ email: signedPerson.email, password: signedPerson.password }),
    [signedPerson.email, signedPerson.password]
  );

  const loadStaff = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_URL}/adminStaffList`, credentials);
      setStaff(response.data);
    } catch (err) {
      adminErrorToast(err?.response?.data?.message || "Không thể tải nhân viên");
    } finally {
      setLoading(false);
    }
  }, [credentials]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const saveStaff = async (event) => {
    event.preventDefault();
    try {
      setLoading(true);
      await axios.post(`${API_URL}/adminStaffUpsert`, { ...credentials, ...form });
      setForm(emptyForm);
      await loadStaff();
      adminShowninToast(form.originalEmail ? "Đã cập nhật nhân viên" : "Đã tạo tài khoản nhân viên");
    } catch (err) {
      adminErrorToast(err?.response?.data?.message || "Không thể lưu nhân viên");
    } finally {
      setLoading(false);
    }
  };

  const editStaff = (item) => {
    setForm({
      originalEmail: item.email,
      staffEmail: item.email,
      firstName: item.first_name,
      lastName: item.last_name,
      phoneNumber: item.phone_number,
      staffPassword: "",
      accountStatus: item.account_status,
    });
  };

  return (
    <section className="admin-management-section">
      <div className="admin-section-heading">
        <p className="admin-section-kicker">Phân quyền</p>
        <h2 className="form-admin-heading">Quản lý tài khoản nhân viên</h2>
        <p className="admin-staff-intro">
          Nhân viên chỉ được xử lý đơn tại quầy và vận hành lịch chiếu. Các quyền quản trị hệ thống vẫn thuộc Admin.
        </p>
      </div>

      <form className="admin-management-form admin-staff-form" onSubmit={saveStaff}>
        <h3>{form.originalEmail ? "Sửa nhân viên" : "Thêm nhân viên"}</h3>
        <div className="admin-staff-form-grid">
          <label>Họ<input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></label>
          <label>Tên<input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></label>
          <label>Email<input required type="email" value={form.staffEmail} onChange={(e) => setForm({ ...form, staffEmail: e.target.value })} /></label>
          <label>Số điện thoại<input required inputMode="numeric" pattern="0[0-9]{9}" value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} /></label>
          <label>Mật khẩu<input required={!form.originalEmail} type="password" minLength={6} placeholder={form.originalEmail ? "Để trống nếu không đổi" : "Ít nhất 6 ký tự"} value={form.staffPassword} onChange={(e) => setForm({ ...form, staffPassword: e.target.value })} /></label>
          <label>Trạng thái<select value={form.accountStatus} onChange={(e) => setForm({ ...form, accountStatus: e.target.value })}><option value="active">Đang hoạt động</option><option value="inactive">Đã khóa</option></select></label>
        </div>
        <div className="admin-inline-actions">
          <button className="btn-admin" disabled={loading}>{loading ? <ClipLoader color="#fff" size={16} /> : form.originalEmail ? <FiSave /> : <FiUserPlus />}{form.originalEmail ? "Lưu thay đổi" : "Tạo nhân viên"}</button>
          {form.originalEmail ? <button className="btn-admin admin-btn-secondary" type="button" onClick={() => setForm(emptyForm)}>Hủy sửa</button> : null}
        </div>
      </form>

      {loading && staff.length === 0 ? <div className="admin-chart-loading"><ClipLoader color="#eb3656" /></div> : (
        <div className="admin-staff-grid">
          {staff.length ? staff.map((item) => (
            <article className="admin-staff-card" key={item.email}>
              <div className="admin-staff-avatar" aria-hidden="true">{String(item.first_name || "N").charAt(0).toUpperCase()}</div>
              <div><h3>{item.last_name} {item.first_name}</h3><p>{item.email}</p><small>{item.phone_number}</small></div>
              <span className={`admin-state-chip ${item.account_status === "active" ? "is-active" : ""}`}>{item.account_status === "active" ? "Đang hoạt động" : "Đã khóa"}</span>
              <button type="button" onClick={() => editStaff(item)}><FiEdit3 /> Sửa</button>
            </article>
          )) : <p className="admin-empty-state">Chưa có tài khoản nhân viên.</p>}
        </div>
      )}
    </section>
  );
};
