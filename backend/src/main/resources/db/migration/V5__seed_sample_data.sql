-- =====================================================================
-- V5: Dữ liệu mẫu để thử và trình diễn. KHÔNG dùng cho môi trường thật.
-- Mật khẩu của mọi người dùng mẫu: 12345678 (đã mã hóa BCrypt).
--
-- Hai gia đình mẫu, mỗi gia đình 4 người: "Tổ Ấm Nhỏ" và "Biệt Đội Ăn Vặt".
-- Dung vừa là chủ gia đình "Biệt Đội Ăn Vặt" vừa là thành viên của "Tổ Ấm Nhỏ"
-- để thử việc một người thuộc nhiều gia đình.
--
-- Phụ thuộc V2 (danh mục hệ thống). Ngày tháng tính theo ngày chạy migration (CURDATE()),
-- nên dữ liệu luôn nằm quanh thời điểm hiện tại:
--   - ngân sách hiện tại:  từ 20 ngày trước đến 9 ngày sau
--   - ngân sách kỳ trước:  từ 50 đến 21 ngày trước (liền kề, không chồng lấn)
--
-- Trường hợp được minh họa:
--   - đủ ba vai trò OWNER, MANAGER, MEMBER
--   - lời mời đang chờ và lời mời bị từ chối, một tài khoản bị khóa
--   - danh mục tùy chỉnh, trong đó có một danh mục đã lưu trữ
--   - ngân sách tổng đang ở mức cam (>= 80%), một ngân sách con vượt mức (đỏ), một ngân sách con đúng 80%
--   - mục tiêu tiết kiệm đang thực hiện và một mục tiêu đã hủy (khoản đóng góp không tính vào ngân sách)
-- =====================================================================

-- ---------------------------------------------------------------------
-- Người dùng
-- ---------------------------------------------------------------------
INSERT INTO users (username, email, password, full_name, role, enabled)
VALUES ('nguyenvanan', 'an@example.com', '$2a$10$/N62ErV9FKWID3nRmf4X1u2IiW1guGCLtum7wCSotoxhSTG4QyRzm', 'Nguyễn Văn An', 'USER', TRUE);
SET @u_an = LAST_INSERT_ID();

INSERT INTO users (username, email, password, full_name, role, enabled)
VALUES ('tranthibinh', 'binh@example.com', '$2a$10$/N62ErV9FKWID3nRmf4X1u2IiW1guGCLtum7wCSotoxhSTG4QyRzm', 'Trần Thị Bình', 'USER', TRUE);
SET @u_binh = LAST_INSERT_ID();

INSERT INTO users (username, email, password, full_name, role, enabled)
VALUES ('levancuong', 'cuong@example.com', '$2a$10$/N62ErV9FKWID3nRmf4X1u2IiW1guGCLtum7wCSotoxhSTG4QyRzm', 'Lê Văn Cường', 'USER', TRUE);
SET @u_cuong = LAST_INSERT_ID();

INSERT INTO users (username, email, password, full_name, role, enabled)
VALUES ('phamthidung', 'dung@example.com', '$2a$10$/N62ErV9FKWID3nRmf4X1u2IiW1guGCLtum7wCSotoxhSTG4QyRzm', 'Phạm Thị Dung', 'USER', TRUE);
SET @u_dung = LAST_INSERT_ID();

INSERT INTO users (username, email, password, full_name, role, enabled)
VALUES ('hoangthihoa', 'hoa@example.com', '$2a$10$/N62ErV9FKWID3nRmf4X1u2IiW1guGCLtum7wCSotoxhSTG4QyRzm', 'Hoàng Thị Hoa', 'USER', TRUE);
SET @u_hoa = LAST_INSERT_ID();

INSERT INTO users (username, email, password, full_name, role, enabled)
VALUES ('vominhkhoa', 'khoa@example.com', '$2a$10$/N62ErV9FKWID3nRmf4X1u2IiW1guGCLtum7wCSotoxhSTG4QyRzm', 'Võ Minh Khoa', 'USER', TRUE);
SET @u_khoa = LAST_INSERT_ID();

INSERT INTO users (username, email, password, full_name, role, enabled)
VALUES ('dangthulan', 'lan@example.com', '$2a$10$/N62ErV9FKWID3nRmf4X1u2IiW1guGCLtum7wCSotoxhSTG4QyRzm', 'Đặng Thu Lan', 'USER', TRUE);
SET @u_lan = LAST_INSERT_ID();

-- Tài khoản bị khóa (enabled = FALSE).
INSERT INTO users (username, email, password, full_name, role, enabled)
VALUES ('vuvanminh', 'minh@example.com', '$2a$10$/N62ErV9FKWID3nRmf4X1u2IiW1guGCLtum7wCSotoxhSTG4QyRzm', 'Vũ Văn Minh', 'USER', FALSE);

-- ---------------------------------------------------------------------
-- Gia đình và thành viên
-- ---------------------------------------------------------------------
INSERT INTO families (name) VALUES ('Tổ Ấm Nhỏ');
SET @f_nest = LAST_INSERT_ID();

INSERT INTO families (name) VALUES ('Biệt Đội Ăn Vặt');
SET @f_snack = LAST_INSERT_ID();

INSERT INTO family_members (user_id, family_id, role) VALUES
                                                          (@u_an,    @f_nest,  'OWNER'),
                                                          (@u_binh,  @f_nest,  'MANAGER'),
                                                          (@u_cuong, @f_nest,  'MEMBER'),
                                                          (@u_dung,  @f_nest,  'MEMBER'),
                                                          (@u_dung,  @f_snack, 'OWNER'),
                                                          (@u_hoa,   @f_snack, 'MANAGER'),
                                                          (@u_khoa,  @f_snack, 'MEMBER'),
                                                          (@u_lan,   @f_snack, 'MEMBER');

-- Lời mời: An mời Hoa vào "Tổ Ấm Nhỏ" (đang chờ), Dung mời Cường vào "Biệt Đội Ăn Vặt" (đã bị từ chối).
INSERT INTO invitations (family_id, invited_user_id, invited_by_id, status) VALUES
                                                                                (@f_nest,  @u_hoa,   @u_an,   'PENDING'),
                                                                                (@f_snack, @u_cuong, @u_dung, 'DECLINED');

-- ---------------------------------------------------------------------
-- Danh mục
-- ---------------------------------------------------------------------
SET @c_food      = (SELECT id FROM categories WHERE family_id IS NULL AND name = 'Food & Dining'     AND type = 'EXPENSE');
SET @c_transport = (SELECT id FROM categories WHERE family_id IS NULL AND name = 'Transportation'    AND type = 'EXPENSE');
SET @c_bills     = (SELECT id FROM categories WHERE family_id IS NULL AND name = 'Bills & Utilities' AND type = 'EXPENSE');
SET @c_fun       = (SELECT id FROM categories WHERE family_id IS NULL AND name = 'Entertainment'     AND type = 'EXPENSE');
SET @c_salary    = (SELECT id FROM categories WHERE family_id IS NULL AND name = 'Salary'            AND type = 'INCOME');

INSERT INTO categories (name, type, family_id, active) VALUES ('Học phí', 'EXPENSE', @f_nest, TRUE);
SET @c_tuition = LAST_INSERT_ID();

INSERT INTO categories (name, type, family_id, active) VALUES ('Tiền thưởng', 'INCOME', @f_nest, TRUE);
SET @c_bonus = LAST_INSERT_ID();

-- Danh mục đã lưu trữ: vẫn được giao dịch cũ sử dụng nhưng không chọn được cho dữ liệu mới.
INSERT INTO categories (name, type, family_id, active) VALUES ('Cà phê', 'EXPENSE', @f_nest, FALSE);
SET @c_coffee = LAST_INSERT_ID();

-- ---------------------------------------------------------------------
-- Ngân sách "Tổ Ấm Nhỏ"
-- Kỳ hiện tại: tổng 18.000.000, đã dùng khoảng 84% (cam).
--   Food vượt mức (đỏ), Entertainment đúng 80% (cam), Transportation còn thoải mái.
-- ---------------------------------------------------------------------
INSERT INTO budgets (family_id, category_id, parent_budget_id, start_date, end_date, amount)
VALUES (@f_nest, NULL, NULL, DATE_SUB(CURDATE(), INTERVAL 20 DAY), DATE_ADD(CURDATE(), INTERVAL 9 DAY), 18000000.00);
SET @b_cur = LAST_INSERT_ID();

INSERT INTO budgets (family_id, category_id, parent_budget_id, start_date, end_date, amount) VALUES
                                                                                                 (@f_nest, @c_food,      @b_cur, DATE_SUB(CURDATE(), INTERVAL 20 DAY), DATE_ADD(CURDATE(), INTERVAL 9 DAY), 5000000.00),
                                                                                                 (@f_nest, @c_transport, @b_cur, DATE_SUB(CURDATE(), INTERVAL 20 DAY), DATE_ADD(CURDATE(), INTERVAL 9 DAY), 2000000.00),
                                                                                                 (@f_nest, @c_fun,       @b_cur, DATE_SUB(CURDATE(), INTERVAL 20 DAY), DATE_ADD(CURDATE(), INTERVAL 9 DAY), 1500000.00);

-- Kỳ trước (liền kề kỳ hiện tại).
INSERT INTO budgets (family_id, category_id, parent_budget_id, start_date, end_date, amount)
VALUES (@f_nest, NULL, NULL, DATE_SUB(CURDATE(), INTERVAL 50 DAY), DATE_SUB(CURDATE(), INTERVAL 21 DAY), 16000000.00);
SET @b_prev = LAST_INSERT_ID();

INSERT INTO budgets (family_id, category_id, parent_budget_id, start_date, end_date, amount)
VALUES (@f_nest, @c_food, @b_prev, DATE_SUB(CURDATE(), INTERVAL 50 DAY), DATE_SUB(CURDATE(), INTERVAL 21 DAY), 5000000.00);

-- Ngân sách tổng "Biệt Đội Ăn Vặt" (chưa có ngân sách con).
INSERT INTO budgets (family_id, category_id, parent_budget_id, start_date, end_date, amount)
VALUES (@f_snack, NULL, NULL, DATE_SUB(CURDATE(), INTERVAL 20 DAY), DATE_ADD(CURDATE(), INTERVAL 9 DAY), 8000000.00);

-- ---------------------------------------------------------------------
-- Mục tiêu tiết kiệm của "Tổ Ấm Nhỏ"
-- ---------------------------------------------------------------------
INSERT INTO saving_goals (family_id, created_by_id, name, target_amount, target_date, status)
VALUES (@f_nest, @u_an, 'Du lịch Đà Nẵng', 20000000.00, DATE_ADD(CURDATE(), INTERVAL 120 DAY), 'ACTIVE');
SET @g_trip = LAST_INSERT_ID();

INSERT INTO saving_goals (family_id, created_by_id, name, target_amount, target_date, status)
VALUES (@f_nest, @u_an, 'Quỹ khẩn cấp', 50000000.00, NULL, 'ACTIVE');
SET @g_emergency = LAST_INSERT_ID();

-- Mục tiêu đã hủy: các khoản đóng góp vẫn được lưu nhưng không tính vào ngân sách.
INSERT INTO saving_goals (family_id, created_by_id, name, target_amount, target_date, status)
VALUES (@f_nest, @u_an, 'Mua xe máy mới', 35000000.00, NULL, 'CANCELLED');
SET @g_bike = LAST_INSERT_ID();

INSERT INTO saving_contributions (saving_goal_id, user_id, amount, contribution_date, note) VALUES
                                                                                                (@g_emergency, @u_an,   5000000.00, DATE_SUB(CURDATE(), INTERVAL 40 DAY), 'Quỹ khẩn cấp tháng trước'),
                                                                                                (@g_trip,      @u_an,   1500000.00, DATE_SUB(CURDATE(), INTERVAL 28 DAY), NULL),
                                                                                                (@g_trip,      @u_an,   2000000.00, DATE_SUB(CURDATE(), INTERVAL 11 DAY), 'Góp tiền đi Đà Nẵng'),
                                                                                                (@g_trip,      @u_binh, 1000000.00, DATE_SUB(CURDATE(), INTERVAL 9 DAY),  NULL),
                                                                                                (@g_bike,      @u_an,   1000000.00, DATE_SUB(CURDATE(), INTERVAL 8 DAY),  'Đóng góp trước khi hủy mục tiêu');

-- ---------------------------------------------------------------------
-- Giao dịch "Tổ Ấm Nhỏ", kỳ trước
-- ---------------------------------------------------------------------
INSERT INTO transactions (family_id, user_id, category_id, amount, transaction_date, description) VALUES
                                                                                                      (@f_nest, @u_an,   @c_salary,    18000000.00, DATE_SUB(CURDATE(), INTERVAL 44 DAY), 'Lương tháng trước của An'),
                                                                                                      (@f_nest, @u_binh, @c_salary,    12000000.00, DATE_SUB(CURDATE(), INTERVAL 43 DAY), 'Lương tháng trước của Bình'),
                                                                                                      (@f_nest, @u_binh, @c_food,       2300000.00, DATE_SUB(CURDATE(), INTERVAL 40 DAY), 'Đi chợ và siêu thị'),
                                                                                                      (@f_nest, @u_an,   @c_coffee,      450000.00, DATE_SUB(CURDATE(), INTERVAL 38 DAY), 'Cà phê với đồng nghiệp'),
                                                                                                      (@f_nest, @u_an,   @c_transport,   900000.00, DATE_SUB(CURDATE(), INTERVAL 35 DAY), 'Xăng xe'),
                                                                                                      (@f_nest, @u_an,   @c_bills,      1500000.00, DATE_SUB(CURDATE(), INTERVAL 33 DAY), 'Điện, nước, internet'),
                                                                                                      (@f_nest, @u_an,   @c_food,       2300000.00, DATE_SUB(CURDATE(), INTERVAL 30 DAY), 'Đi chợ và siêu thị');

-- ---------------------------------------------------------------------
-- Giao dịch "Tổ Ấm Nhỏ", kỳ hiện tại
-- ---------------------------------------------------------------------
INSERT INTO transactions (family_id, user_id, category_id, amount, transaction_date, description, receipt_image) VALUES
                                                                                                                     (@f_nest, @u_an,    @c_salary,    18000000.00, DATE_SUB(CURDATE(), INTERVAL 19 DAY), 'Lương tháng này của An', NULL),
                                                                                                                     (@f_nest, @u_binh,  @c_salary,    12000000.00, DATE_SUB(CURDATE(), INTERVAL 18 DAY), 'Lương tháng này của Bình', NULL),
                                                                                                                     (@f_nest, @u_an,    @c_food,       1850000.00, DATE_SUB(CURDATE(), INTERVAL 17 DAY), 'Đi chợ tuần 1', 'https://res.cloudinary.com/demo/image/upload/sample.jpg'),
                                                                                                                     (@f_nest, @u_an,    @c_transport,   650000.00, DATE_SUB(CURDATE(), INTERVAL 15 DAY), 'Xăng xe', NULL),
                                                                                                                     (@f_nest, @u_an,    @c_bills,      1200000.00, DATE_SUB(CURDATE(), INTERVAL 14 DAY), 'Tiền điện, nước', NULL),
                                                                                                                     (@f_nest, @u_binh,  @c_bills,       350000.00, DATE_SUB(CURDATE(), INTERVAL 13 DAY), 'Internet', NULL),
                                                                                                                     (@f_nest, @u_an,    @c_tuition,    3000000.00, DATE_SUB(CURDATE(), INTERVAL 12 DAY), 'Học phí cho con', NULL),
                                                                                                                     (@f_nest, @u_binh,  @c_food,       1450000.00, DATE_SUB(CURDATE(), INTERVAL 10 DAY), 'Đi chợ tuần 2', NULL),
                                                                                                                     (@f_nest, @u_cuong, @c_transport,   400000.00, DATE_SUB(CURDATE(), INTERVAL 8 DAY),  'Xe buýt và Grab', NULL),
                                                                                                                     (@f_nest, @u_cuong, @c_food,        980000.00, DATE_SUB(CURDATE(), INTERVAL 6 DAY),  'Ăn ngoài cuối tuần', NULL),
                                                                                                                     (@f_nest, @u_dung,  @c_fun,        1200000.00, DATE_SUB(CURDATE(), INTERVAL 5 DAY),  'Xem phim và ăn tối', NULL),
                                                                                                                     (@f_nest, @u_an,    @c_bonus,      3000000.00, DATE_SUB(CURDATE(), INTERVAL 4 DAY),  'Thưởng dự án', NULL),
                                                                                                                     (@f_nest, @u_binh,  @c_food,       1070000.00, DATE_SUB(CURDATE(), INTERVAL 2 DAY),  'Đi chợ tuần 3', NULL);

-- ---------------------------------------------------------------------
-- Giao dịch "Biệt Đội Ăn Vặt"
-- ---------------------------------------------------------------------
INSERT INTO transactions (family_id, user_id, category_id, amount, transaction_date, description) VALUES
                                                                                                      (@f_snack, @u_dung, @c_salary,    20000000.00, DATE_SUB(CURDATE(), INTERVAL 18 DAY), 'Lương của Dung'),
                                                                                                      (@f_snack, @u_dung, @c_food,       2500000.00, DATE_SUB(CURDATE(), INTERVAL 9 DAY),  'Đi chợ'),
                                                                                                      (@f_snack, @u_hoa,  @c_transport,   500000.00, DATE_SUB(CURDATE(), INTERVAL 7 DAY),  'Xăng xe'),
                                                                                                      (@f_snack, @u_khoa, @c_food,        320000.00, DATE_SUB(CURDATE(), INTERVAL 4 DAY),  'Trà sữa và đồ ăn vặt'),
                                                                                                      (@f_snack, @u_lan,  @c_fun,         450000.00, DATE_SUB(CURDATE(), INTERVAL 3 DAY),  'Đi chơi cuối tuần');