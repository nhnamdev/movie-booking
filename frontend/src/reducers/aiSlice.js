import { createSlice } from "@reduxjs/toolkit";

const aiSlice = createSlice({
  name: "ai",
  initialState: {
    chatOpen: false,
    messages: [],
    recommendations: [],
    recsLoading: false,
  },
  reducers: {
    toggleChat(state) {
      state.chatOpen = !state.chatOpen;
    },
    addMessage(state, action) {
      state.messages.push(action.payload);
    },
    setRecommendations(state, action) {
      state.recommendations = action.payload;
    },
    setRecsLoading(state, action) {
      state.recsLoading = action.payload;
    },
  },
});

export const { toggleChat, addMessage, setRecommendations, setRecsLoading } = aiSlice.actions;
export default aiSlice.reducer;
