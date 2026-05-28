import { configureStore } from "@reduxjs/toolkit";
import locationReducer from "./reducers/locationSlice";
import authSlice from "./reducers/authSlice";
import mobileNavSlice from "./reducers/mobileNavSlice";
import cartSlice from "./reducers/cartSlice";
import aiSlice from "./reducers/aiSlice";

const reduxStore = configureStore({
  reducer: {
    currentLocation: locationReducer,
    authentication: authSlice,
    mobileNav: mobileNavSlice,
    cart: cartSlice,
    ai: aiSlice,
  },
});

export default reduxStore;
