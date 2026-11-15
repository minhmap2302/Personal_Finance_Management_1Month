import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
 Bot,
 Send,
 Sparkles,
 ChevronDown,
 ChevronUp,
 UserRound,
 ShieldCheck,
 LoaderCircle,
} from 'lucide-react';
import { useFamily } from '../context/FamilyContext';
import { useToast } from '../context/ToastContext';
import { supportApi } from '../services/pfmApi';

const INITIAL_MESSAGE = {
 role: 'assistant',
 content:
     'Xin chào! Tôi là trợ lý tài chính của FinHome. Bạn có thể hỏi về tình hình thu chi, ngân sách hoặc mục tiêu tiết kiệm của gia đình.',
};

const faqs = [
 [
  'Tháng này gia đình tôi đã chi tiêu bao nhiêu?',
  'Bạn có thể hỏi FinHome tổng chi tiêu trong tháng, sau đó đối chiếu với ngân sách đã lập để biết gia đình đang sử dụng hạn mức ở mức nào.',
 ],
 [
  'Khoản chi nào đang chiếm nhiều tiền nhất?',
  'Hãy yêu cầu trợ lý phân tích các khoản chi theo danh mục để nhận diện nhóm chi tiêu lớn nhất và cân nhắc điều chỉnh nếu cần.',
 ],
 [
  'Ngân sách gia đình còn lại bao nhiêu?',
  'Bạn có thể hỏi số tiền ngân sách còn lại trong kỳ hiện tại và xem khoản chi nào đang khiến hạn mức giảm nhanh.',
 ],
 [
  'Gia đình tôi đã tiết kiệm được bao nhiêu cho mục tiêu này?',
  'Hỏi theo tên mục tiêu để xem số tiền đã tích lũy, số tiền còn thiếu và tiến độ hoàn thành.',
 ],
 [
  'Nếu tiếp tục chi tiêu như hiện tại, gia đình có vượt ngân sách không?',
  'FinHome có thể hỗ trợ phân tích xu hướng thu chi dựa trên dữ liệu hiện có. Kết quả dự báo chỉ mang tính tham khảo, không phải cam kết về chi tiêu tương lai.',
 ],
 [
  'Làm thế nào để giảm chi tiêu mà không ảnh hưởng sinh hoạt?',
  'Bắt đầu bằng cách xem các danh mục chi tiêu lớn, phân biệt nhu cầu thiết yếu và khoản có thể tối ưu, sau đó đặt hạn mức phù hợp cho từng nhóm.',
 ],
];

function getChatErrorMessage(error) {
 const data = error?.response?.data;
 const serverMessage =
     data?.message || data?.error || data?.detail || data?.title;

 if (serverMessage) return String(serverMessage);

 if (error?.response?.status === 401) {
  return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
 }
 if (error?.response?.status === 403) {
  return 'Bạn không có quyền sử dụng trợ lý của gia đình này.';
 }
 if (error?.response?.status === 404) {
  return 'Không tìm thấy API chatbot. Hãy kiểm tra endpoint ở backend.';
 }
 if (error?.response?.status >= 500) {
  return 'Máy chủ AI đang gặp lỗi. Vui lòng thử lại sau.';
 }
 if (error?.code === 'ERR_NETWORK') {
  return 'Không thể kết nối máy chủ. Hãy kiểm tra backend và cấu hình CORS.';
 }

 return 'Chatbot hiện chưa thể phản hồi. Vui lòng thử lại sau.';
}

export default function Support() {
 const { activeFamily, activeFamilyId } = useFamily();
 const toast = useToast();

 const [open, setOpen] = useState(0);
 const [messages, setMessages] = useState([INITIAL_MESSAGE]);
 const [text, setText] = useState('');
 const [busy, setBusy] = useState(false);

 const endRef = useRef(null);
 const requestIdRef = useRef(0);

 // IMPORTANT: useEffect must return undefined or a cleanup function.
 // Do not implicitly return the result of scrollIntoView().
 useEffect(() => {
  endRef.current?.scrollIntoView({
   behavior: 'smooth',
   block: 'end',
  });
 }, [messages, busy]);

 // Do not carry a previous family's conversation into another family.
 useEffect(() => {
  requestIdRef.current += 1;
  setMessages([INITIAL_MESSAGE]);
  setText('');
  setBusy(false);
 }, [activeFamilyId]);

 // Invalidate any pending response when this page unmounts.
 useEffect(() => {
  return () => {
   requestIdRef.current += 1;
  };
 }, []);

 async function send(event) {
  event?.preventDefault();

  const content = text.trim();
  if (!content || busy) return;

  if (!activeFamilyId) {
   toast('Hãy chọn gia đình trước khi trò chuyện.', 'error');
   return;
  }

  const requestId = ++requestIdRef.current;

  setText('');
  setMessages((current) => [
   ...current,
   { role: 'user', content },
  ]);
  setBusy(true);

  try {
   // Keep the existing backend contract and endpoint unchanged.
   const data = await supportApi.chat(activeFamilyId, content);

   // Ignore late responses from a previous family/page session.
   if (requestId !== requestIdRef.current) return;

   const answer =
       data?.answer ||
       data?.content ||
       data?.reply ||
       data?.response;

   if (!answer || !String(answer).trim()) {
    throw new Error('API chatbot trả về phản hồi rỗng.');
   }

   setMessages((current) => [
    ...current,
    { role: 'assistant', content: String(answer) },
   ]);
  } catch (error) {
   if (requestId !== requestIdRef.current) return;

   const message =
       error?.message === 'API chatbot trả về phản hồi rỗng.'
           ? 'AI đã phản hồi nhưng nội dung trả về đang trống. Hãy kiểm tra định dạng response của backend.'
           : getChatErrorMessage(error);

   setMessages((current) => [
    ...current,
    { role: 'assistant', content: message, error: true },
   ]);
   toast(message, 'error');
  } finally {
   if (requestId === requestIdRef.current) {
    setBusy(false);
   }
  }
 }

 return (
     <motion.div
         className="pfm-page pfm-support-page"
         initial={{ opacity: 0, y: 10 }}
         animate={{ opacity: 1, y: 0 }}
     >
      <div className="pfm-page-heading">
       <div>
        <div className="pfm-eyebrow">
         FINHOME ASSISTANT · {activeFamily?.name || 'CHƯA CHỌN GIA ĐÌNH'}
        </div>
        <h1>Hỗ trợ & Trợ lý tài chính</h1>
        <p>
         Giải đáp thắc mắc và giúp bạn hiểu rõ hơn về dòng tiền gia đình.
        </p>
       </div>
      </div>

      <div className="pfm-support-grid">
       <section className="pfm-panel pfm-chat-panel">
        <header className="pfm-chat-header">
            <motion.span
              className="pfm-chat-bot-icon pfm-ai-orb"
              animate={{ scale: [1, 1.055, 1], rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
              aria-label="FinHome AI đang hoạt động"
            >
              <motion.span
                className="pfm-ai-orb-core"
                animate={{ opacity: [0.72, 1, 0.72], scale: [0.92, 1.08, 0.92] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              ><Bot size={22} /></motion.span>
              <motion.i className="pfm-ai-orb-pulse" animate={{ scale: [0.8, 1.55], opacity: [0.45, 0] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }} />
            </motion.span>
         <div>
          <b>Trợ lý FinHome</b>
          <small><i className="pfm-ai-online-dot" /> Đang trực tuyến · Sẵn sàng hỗ trợ tài chính</small>
         </div>
         <span className="pfm-chip">AI</span>
        </header>

        <div className="pfm-chat-notice">
         <ShieldCheck size={15} />
         AI chỉ đọc và phân tích dữ liệu; không thực hiện thao tác thay đổi dữ liệu tài chính.
        </div>
        <div className="pfm-ai-presence" aria-hidden="true">
          <span className="pfm-ai-wave"><i/><i/><i/><i/><i/><i/><i/></span>
          <span>FinHome đang sẵn sàng lắng nghe câu hỏi của bạn</span>
          <Sparkles size={14}/>
        </div>

        <div className="pfm-chat-messages" aria-live="polite">
         {messages.map((message, index) => (
             <div
                 className={`pfm-chat-message ${
                     message.role === 'user' ? 'from-user' : 'from-bot'
                 }`}
                 key={`${index}-${message.role}`}
             >
                <span className="pfm-message-avatar">
                  {message.role === 'user' ? (
                      <UserRound size={16} />
                  ) : (
                      <Bot size={16} />
                  )}
                </span>
              <div
                  className={`pfm-message-bubble ${
                      message.error ? 'is-error' : ''
                  }`}
              >
               {message.content}
              </div>
             </div>
         ))}

         {busy && (
             <div className="pfm-chat-message from-bot">
                <span className="pfm-message-avatar">
                  <Bot size={16} />
                </span>
              <div
                  className="pfm-message-bubble pfm-typing"
                  aria-label="AI đang trả lời"
              >
               <i />
               <i />
               <i />
              </div>
             </div>
         )}
         <div ref={endRef} />
        </div>

        <form className="pfm-chat-compose" onSubmit={send}>
         <input
             value={text}
             onChange={(event) => setText(event.target.value)}
             placeholder="Hỏi về thu chi, ngân sách gia đình…"
             maxLength={2000}
             aria-label="Nội dung câu hỏi"
             disabled={busy || !activeFamilyId}
         />
         <button
             type="submit"
             disabled={!text.trim() || busy || !activeFamilyId}
             aria-label="Gửi tin nhắn"
         >
          {busy ? (
              <LoaderCircle className="pfm-spin" size={18} />
          ) : (
              <Send size={18} />
          )}
         </button>
        </form>
        {!activeFamilyId && (
            <p className="pfm-chat-empty-hint">
             Hãy chọn một gia đình để bắt đầu trò chuyện.
            </p>
        )}
       </section>

       <aside className="pfm-support-side">
        <section className="pfm-panel pfm-faq-panel">
         <div className="pfm-panel-title">
          <div>
           <h2>Câu hỏi thường gặp</h2>
           <span>Hướng dẫn sử dụng FinHome</span>
          </div>
          <Sparkles size={19} />
         </div>

         <div className="pfm-faq-list">
          {faqs.map(([question, answer], index) => (
              <div className="pfm-faq-item" key={question}>
               <button
                   type="button"
                   onClick={() => setOpen(open === index ? -1 : index)}
                   aria-expanded={open === index}
               >
                <b>{question}</b>
                {open === index ? (
                    <ChevronUp size={17} />
                ) : (
                    <ChevronDown size={17} />
                )}
               </button>
               {open === index && <p>{answer}</p>}
              </div>
          ))}
         </div>
        </section>

        <section className="pfm-panel pfm-tip-panel">
         <span><ShieldCheck size={19} /></span>
         <div>
          <b>Quyền riêng tư & an toàn</b>
          <p>
           Không chia sẻ mật khẩu, mã OTP hoặc thông tin bí mật. Luôn kiểm tra
           số liệu trong hệ thống trước khi đưa ra quyết định tài chính.
          </p>
         </div>
        </section>
       </aside>
      </div>
     </motion.div>
 );
}
