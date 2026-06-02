import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setPaymentMethod } from "../../../reducers/cartSlice";

export const PayMethodSelector = ({ paymentOngoing }) => {
  const { payment_method: userPayMethod } = useSelector((store) => store.cart);
  const dispatch = useDispatch();

  useEffect(() => {
    if (!userPayMethod) dispatch(setPaymentMethod("PayOS"));
  }, [dispatch, userPayMethod]);

  const checkedColor = (val) => {
    return {
      backgroundColor: val === userPayMethod ? "#ef5e78" : "",
      border: val === userPayMethod ? "2px solid transparent" : "",
    };
  };

  return (
    <div>
      <form>
        <div className="form-item-heading">Chọn phương thức thanh toán</div>
        <div className="form-pay-options">
          {[
            { id: 1, label: "PayOS", value: "PayOS" },
            { id: 2, label: "Thanh toán tại rạp", value: "Thanh toán tại rạp" },
          ].map(
            ({ id, label, value }) => (
              <div
                className="pay-input-container"
                key={value}
                style={checkedColor(value)}
              >
                <input
                  disabled={paymentOngoing}
                  type="radio"
                  id={id}
                  name="select-payment"
                  value={value}
                  onChange={(e) => dispatch(setPaymentMethod(e.target.value))}
                  checked={value === userPayMethod}
                />
                <label className="form-pay-detail" htmlFor={id}>
                  {label}
                </label>
              </div>
            )
          )}
        </div>
      </form>
    </div>
  );
};
