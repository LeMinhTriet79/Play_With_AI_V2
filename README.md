# 🎮 Play With AI - V2 (Windows 98 Edition)

> **Documented by:** Senior Software Architect
> **Version:** 2.0
> **Architecture Style:** Client-Server, Real-time Event-Driven, Embedded Web-Engine (Hybrid)

---

## 📑 Mục lục
1. [Tổng quan Dự án](#1-tổng-quan-dự-án)
2. [Kiến trúc Tổng thể (High-Level Architecture)](#2-kiến-trúc-tổng-thể)
3. [Cấu trúc Thư mục (Directory Structure)](#3-cấu-trúc-thư-mục)
4. [Phân tích Client (Frontend - JavaFX + Web)](#4-phân-tích-client-frontend)
5. [Phân tích Server (Backend - Spring Boot)](#5-phân-tích-server-backend)
6. [Luồng giao tiếp thời gian thực (Real-time Flow)](#6-luồng-giao-tiếp)
7. [Định hướng mở rộng (Future Roadmap)](#7-định-hướng-mở-rộng)

---

## 1. Tổng quan Dự án
**Play With AI - V2** là một nền tảng giải trí đa luồng được xây dựng theo phong cách hoài cổ **Windows 98**. 
Dự án bao gồm một hệ điều hành giả lập chứa các ứng dụng như **Cờ Tướng Online (Xiangqi)**, **Messenger (Chat)**, và hệ thống **Tích hợp AI**. Hệ thống hỗ trợ đa người dùng trực tuyến, cho phép tạo phòng, chơi cờ theo thời gian thực (Real-time Multiplayer), chat toàn cầu và quản lý trạng thái trực tuyến (Presence State).

---

## 2. Kiến trúc Tổng thể
Hệ thống áp dụng mô hình **Client-Server** kết hợp **Hybrid Desktop Application**:
* **Backend (Server-side):** Sử dụng **Spring Boot**, cung cấp cả RESTful API (cho các tác vụ đồng bộ) và WebSocket / STOMP (cho các luồng sự kiện thời gian thực - real-time events).
* **Frontend (Client-side):** Sử dụng **JavaFX** làm vỏ bọc (Native Wrapper). Lõi hiển thị (View) sử dụng thành phần `WebView` để render một ứng dụng Web (HTML5/CSS3/Vanilla JS) mô phỏng giao diện Windows 98. 

---

## 3. Cấu trúc Thư mục

Dự án được chia thành 2 module chính biệt lập:

```text
Play_With_AI_V2 (Root Workspace)
│
├── Play_With_AI_V2/                  # [FRONTEND] Nền tảng Client (JavaFX + Web)
│   ├── src/main/java/                # Code Java (Khởi tạo Window, Bridge JS-Java)
│   ├── src/main/resources/web/       # Cốt lõi giao diện (HTML/CSS/JS)
│   │   ├── index.html                # Entry point, giao diện Windows 98
│   │   ├── css/                      # Stylesheets (os.css, chess.css, messenger.css)
│   │   ├── js/                       # Logic xử lý (Game, Messenger, OS Window Manager)
│   │   ├── musics/                   # Tài nguyên âm thanh (BGM Playlist)
│   │   └── images/                   # Tài nguyên hình ảnh (Icon, cờ tướng)
│   └── pom.xml                       # Cấu hình Maven Client
│
└── play_with_ai_backend/             # [BACKEND] Máy chủ (Spring Boot)
    ├── src/main/java/
    │   └── .../play_with_ai_backend/
    │       ├── config/               # Cấu hình WebSocket, STOMP, CORS
    │       ├── controller/           # REST APIs & WebSocket Message Mappings
    │       ├── model/                # Thực thể Dữ liệu (DTO, Entity)
    │       ├── repository/           # Kết nối Database (nếu có)
    │       └── service/              # Logic nghiệp vụ (Presence, Room Management)
    └── pom.xml                       # Cấu hình Maven Backend
```

---

## 4. Phân tích Client (Frontend)
Client là một kiến trúc **Hybrid** rất độc đáo:
- **Vỏ bọc (Wrapper):** `MainApp.java` tạo một cửa sổ `Stage` của JavaFX, set kích thước Full-screen (Maximized) và chứa một đối tượng `WebView`.
- **Trình quản lý Cửa sổ (Window Manager):** File `window-manager.js` hoạt động như một kernel siêu nhỏ của Windows 98, quản lý trạng thái Z-Index, Maximize, Minimize, Drag & Drop của các cửa sổ DOM nội bộ.
- **Module Cờ Tướng (`chinese-chess.js`):** 
  - Render bàn cờ động dựa trên mảng tọa độ.
  - Quản lý logic Cờ Tướng cơ bản.
  - Xử lý các luồng sự kiện STOMP: Đi cờ (`MOVE`), Vào/Ra phòng (`JOIN`/`LEAVE`), Đầu hàng (`RESIGN`), Cầu hòa (`DRAW`), và tái thiết lập bàn cờ.
  - Tích hợp hệ thống Audio HTML5 (BGM Playlist tự động).
- **Module Messenger (`messenger.js`, `stomp-client.js`):**
  - Quản lý kênh chat Public và Private.
  - Hiển thị danh sách User Online.

---

## 5. Phân tích Server (Backend)
Backend đóng vai trò là "Trái tim" của hệ thống Real-time:
- **Core Technology:** Spring Boot + Spring WebSockets.
- **WebSocket Config (`WebSocketConfig.java`):** Đăng ký Message Broker (STOMP) và các endpoint `/ws`.
- **Presence Management (`PresenceService.java` & `WebSocketPresenceListener.java`):** Theo dõi sự kiện `SessionConnectedEvent` và `SessionDisconnectEvent` để biết chính xác người chơi nào đang Online/Offline, từ đó broadcast danh sách User cho toàn bộ Client.
- **Chess Room Management (`ChessRoomController.java`):**
  - Cung cấp REST API cho việc Tạo phòng (Create), Lấy danh sách phòng (List), Tham gia (Join) và Rời phòng (Leave).
  - Quản lý trạng thái logic (Người cầm cờ Đỏ / Đen) trên RAM (hoặc DB).
- **Game Controller (`GameController.java`):** 
  - Lắng nghe và điều hướng các bản tin STOMP (Tọa độ bước đi, Trạng thái game) đến đúng Topic của từng phòng (`/topic/chess/room/{roomId}`).

---

## 6. Luồng giao tiếp thời gian thực (Real-time Flow)
* **Message Protocol:** Client và Server giao tiếp thông qua giao thức **STOMP over WebSocket**.
* **Pub/Sub Model:**
  - **Kênh Global (`/topic/public`):** Dùng để chat tổng và broadcast danh sách User online.
  - **Kênh Phòng cờ (`/topic/chess/room/{id}`):** Dùng để trao đổi trực tiếp các bước đi cờ, tin nhắn trong phòng, và các sự kiện ván đấu (Hòa, Đầu Hàng, Xin chơi lại) giữa 2 người chơi mà không làm ảnh hưởng đến các phòng khác.

---

## 7. Định hướng mở rộng (Future Roadmap)
Với tư cách là Kiến trúc sư phần mềm, tôi đề xuất các hướng mở rộng cho Version 3.0:
1. **Thay thế Engine (Tùy chọn):** Nếu có nhu cầu cao về Voice Chat / WebRTC, cân nhắc thay thế `JavaFX WebView` bằng `JCEF (Java Chromium Embedded Framework)` để khai thác toàn bộ sức mạnh phần cứng của Chromium.
2. **Database Persistence:** Tích hợp Redis để quản lý session tốc độ cao và PostgreSQL/MySQL để lưu trữ lịch sử các ván đấu, ELO rating của người chơi.
3. **AI Chess Engine Integration:** Xây dựng một Worker phụ trách chạy thuật toán Minimax (Alpha-Beta Pruning) hoặc gọi API LLM (Langchain4J) để tạo ra chế độ "Chơi với Máy (AI)".
4. **Hệ thống System Log tập trung:** Thiết kế một cửa sổ `System Log` trên HĐH ảo để theo dõi luồng dữ liệu STOMP, tiện lợi cho việc Debug trực tiếp trên giao diện Client.
