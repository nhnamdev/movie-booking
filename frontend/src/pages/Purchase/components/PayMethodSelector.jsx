import { useDispatch, useSelector } from "react-redux";
import { setPaymentMethod } from "../../../reducers/cartSlice";

export const PayMethodSelector = ({ paymentOngoing }) => {
  const { payment_method: userPayMethod } = useSelector((store) => store.cart);
  const dispatch = useDispatch();

  const checkedColor = (val) => {
    return {
      backgroundColor: val === userPayMethod ? "#ef5e78" : "",
      border: val === userPayMethod ? "2px solid transparent" : "",
    };
  };

  return (
    <div>
      <form>
        <div className="form-item-heading">Chọn Phương Thức Thanh Toán</div>
        <div className="form-pay-options">
          {[
            { id: 1, label: "MoMo", value: "MoMo" },
            { id: 2, label: "ZaloPay", value: "ZaloPay" },
            { id: 3, label: "Thẻ ATM", value: "ATM" },
            { id: 4, label: "Tiền mặt", value: "Cash" },
          ].map(({ id, label, value }) => (
            <div
              className="pay-input-container"
              key={value}
              style={checkedColor(value)}
            >
              <input
                disabled={paymentOngoing}
                type="radio"
                id={id}
                name="Select Payment"
                value={value}
                onChange={(e) => dispatch(setPaymentMethod(e.target.value))}
                checked={value === userPayMethod}
              />
              <label className="form-pay-detail" htmlFor={id}>
                {label}
              </label>
            </div>
          ))}
        </div>
      </form>
    </div>
  );
};
