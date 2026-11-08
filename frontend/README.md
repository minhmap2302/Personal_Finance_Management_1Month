# FinHome — Frontend quản lý chi tiêu gia đình

Frontend React + Vite + Tailwind CSS + Framer Motion + Lucide React, độc lập với backend Spring Boot.

## Chạy ứng dụng

```bash
npm install
cp .env.example .env
npm run dev
```

Mặc định API base URL là `http://localhost:8080`. Có thể thay bằng `VITE_API_BASE_URL` trong `.env`.

## Cấu trúc

```text
src/
├── components/       # ProtectedRoute, PublicRoute
├── context/          # AuthContext
├── layouts/          # MainLayout, sidebar, topbar, modal đăng xuất
├── lib/              # Axios client, chuẩn hóa lỗi API
├── pages/            # Landing, Login, Register, Dashboard, module pages, 404
├── routes/           # AppRoutes
├── main.jsx
└── styles.css
```

## API xác thực được tích hợp

- `POST /api/v1/auth/login` body `{ "usernameOrEmail": "...", "username": "...", "password": "..." }`
- `POST /api/v1/auth/register` body `{ "username": "...", "fullName": "...", "email": "...", "password": "..." }`
- `POST /api/v1/auth/logout` với Bearer token và refresh token nếu có

Backend trong repository cũng ánh xạ `/api/auth/*`; frontend hiện dùng `/api/v1/auth/*`. Nếu cấu hình deployment chỉ expose prefix `/api/auth`, cập nhật các đường dẫn trong `src/context/AuthContext.jsx`.

## Lưu ý tích hợp

- Trang đăng nhập/đăng ký gửi request thật đến backend; lỗi HTTP 400/401 được hiển thị trong form.
- Dashboard hiện sử dụng dữ liệu minh họa để hoàn thiện trải nghiệm trực quan. Các trang giao dịch, danh mục, ngân sách, tiết kiệm, thành viên, gia đình, hồ sơ và hỗ trợ có khung giao diện; cần nối từng trang với endpoint thực tế trước khi dùng dữ liệu production.
- Auth token được lưu theo lựa chọn ghi nhớ phiên (localStorage hoặc sessionStorage). Với ứng dụng production, nên cân nhắc cookie `HttpOnly`, `Secure`, `SameSite` do backend quản lý thay vì lưu access token trong JavaScript storage.
- `register()` không tự đăng nhập vì endpoint đăng ký hiện trả về `UserResponse`, không phải `AuthResponse`.
