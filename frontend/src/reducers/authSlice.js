import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isAuthenticated: false,
  authChecked: false,
  signedPerson: {},
  signModalState: false,
  loginModalState: false,
};

const authSlice = createSlice({
  name: "authentication",
  initialState,
  reducers: {
    login(state, action) {
      state.isAuthenticated = true;
      state.authChecked = true;
      state.signedPerson = action.payload;
    },
    logout(state) {
      state.isAuthenticated = false;
      state.authChecked = true;
      state.signedPerson = {};
    },
    finishAuthCheck(state) { state.authChecked = true; },
    showSignModal(state) { state.signModalState = true; },
    showLoginModal(state) { state.loginModalState = true; },
    hideSignModal(state) { state.signModalState = false; },
    hideLoginModal(state) { state.loginModalState = false; },
  },
});

export const {
  login, logout, finishAuthCheck, showSignModal, showLoginModal,
  hideSignModal, hideLoginModal,
} = authSlice.actions;

export default authSlice.reducer;
