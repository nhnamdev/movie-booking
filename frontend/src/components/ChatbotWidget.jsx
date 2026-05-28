import { useState, useRef, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { FaCommentDots, FaPaperPlane, FaTimes } from "react-icons/fa";
import { toggleChat, addMessage } from "../reducers/aiSlice";
import { chatWithAI } from "../utils/aiClient";
import "../styles/chatbot.css";

export const ChatbotWidget = () => {
  const dispatch = useDispatch();
  const { chatOpen, messages } = useSelector((s) => s.ai);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto scroll xuống cuối khi có tin nhắn mới
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Tin nhắn chào ban đầu khi mở chat lần đầu
  useEffect(() => {
    if (chatOpen && messages.length === 0) {
      dispatch(
        addMessage({
          role: "assistant",
          content:
            "Xin chào! Tôi là trợ lý ảo CGV. Tôi có thể giúp bạn tìm phim đang chiếu, giờ chiếu, rạp gần bạn. Bạn cần hỗ trợ gì? 🎬",
        })
      );
    }
  }, [chatOpen, messages.length, dispatch]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: "user", content: text };
    dispatch(addMessage(userMsg));
    setInput("");
    setLoading(true);

    try {
      const newMessages = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const res = await chatWithAI(newMessages);
      dispatch(
        addMessage({ role: "assistant", content: res.data.reply || "..." })
      );
    } catch (err) {
      const errorMsg =
        err.response?.data?.error || "Xin lỗi, có lỗi xảy ra. Vui lòng thử lại.";
      dispatch(addMessage({ role: "assistant", content: errorMsg }));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {!chatOpen && (
        <button
          className="chatbot-toggle"
          onClick={() => dispatch(toggleChat())}
          aria-label="Mở trợ lý ảo CGV"
        >
          <FaCommentDots />
        </button>
      )}

      {chatOpen && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <div className="chatbot-header-title">
              <span className="chatbot-header-dot" />
              Trợ lý ảo CGV
            </div>
            <button
              className="chatbot-close-btn"
              onClick={() => dispatch(toggleChat())}
              aria-label="Đóng chat"
            >
              <FaTimes size={16} />
            </button>
          </div>

          <div className="chatbot-messages" ref={messagesEndRef}>
            {messages.map((msg, i) => (
              <div key={i} className={`chatbot-msg ${msg.role}`}>
                {msg.content}
              </div>
            ))}
            {loading && (
              <div className="chatbot-msg typing">Đang trả lời...</div>
            )}
          </div>

          <div className="chatbot-input-row">
            <textarea
              className="chatbot-input"
              placeholder="Nhập câu hỏi..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={loading}
            />
            <button
              className="chatbot-send-btn"
              onClick={handleSend}
              disabled={loading || !input.trim()}
              aria-label="Gửi"
            >
              <FaPaperPlane />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
