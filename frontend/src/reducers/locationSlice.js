import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  id: "",
  location: "",
  name: "",
  location_details: "",
};

const locationSlice = createSlice({
  name: "currentLocation",
  initialState,
  reducers: {
    selectLocation(state, action) {
      const { id, location, name, location_details } = action.payload;
      state.id = id;
      state.location = location;
      state.name = name;
      state.location_details = location_details || "";
    },
  },
});

export const { selectLocation } = locationSlice.actions;

export default locationSlice.reducer;
