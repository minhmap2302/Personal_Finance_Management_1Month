-- =====================================================================
-- V1: Tạo toàn bộ bảng của hệ thống quản lý tài chính gia đình.
-- Yêu cầu MySQL 8.0.16+ (CHECK) và 8.0.13+ (index hàm).
-- Tiền tệ: chỉ VND, lưu bằng DECIMAL(19,2) (BigDecimal ở phía Java).
-- Các bảng được tạo theo thứ tự phụ thuộc khóa ngoại.
--
-- LƯU Ý khi xóa gia đình: transactions.category_id và budgets.category_id dùng ON DELETE RESTRICT
-- để không ai xóa nhầm danh mục đang được dùng. Vì vậy service phải xóa theo thứ tự:
--   1) transactions của gia đình, 2) budgets của gia đình, 3) xóa families.
-- Phần còn lại (family_members, invitations, categories tùy chỉnh, saving_goals, saving_contributions)
-- được xóa tự động nhờ ON DELETE CASCADE.
-- =====================================================================

-- ---------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------
CREATE TABLE users (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    username    VARCHAR(50)  NOT NULL,
    email       VARCHAR(100) NOT NULL,
    password    VARCHAR(255) NOT NULL,
    full_name   VARCHAR(100) NULL,
    role        VARCHAR(20)  NOT NULL DEFAULT 'USER',
    enabled     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at  DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT uk_user_username UNIQUE (username),
    CONSTRAINT uk_user_email UNIQUE (email),
    CONSTRAINT ck_user_role CHECK (role IN ('ADMIN', 'USER'))
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- families
-- ---------------------------------------------------------------------
CREATE TABLE families (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    name        VARCHAR(100) NOT NULL,
    created_at  DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at  DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- family_members: bảng trung gian users <-> families, lưu vai trò trong gia đình
-- ---------------------------------------------------------------------
CREATE TABLE family_members (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    user_id     BIGINT       NOT NULL,
    family_id   BIGINT       NOT NULL,
    role        VARCHAR(20)  NOT NULL DEFAULT 'MEMBER',
    joined_at   DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at  DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT uk_family_member_user_family UNIQUE (user_id, family_id),
    CONSTRAINT fk_family_member_user   FOREIGN KEY (user_id)   REFERENCES users (id)    ON DELETE CASCADE,
    CONSTRAINT fk_family_member_family FOREIGN KEY (family_id) REFERENCES families (id) ON DELETE CASCADE,
    CONSTRAINT ck_family_member_role CHECK (role IN ('OWNER', 'MANAGER', 'MEMBER'))
) ENGINE = InnoDB;

CREATE INDEX idx_family_member_family ON family_members (family_id);

-- ---------------------------------------------------------------------
-- invitations: lời mời tham gia gia đình
-- ---------------------------------------------------------------------
CREATE TABLE invitations (
    id               BIGINT       NOT NULL AUTO_INCREMENT,
    family_id        BIGINT       NOT NULL,
    invited_user_id  BIGINT       NOT NULL,
    invited_by_id    BIGINT       NOT NULL,
    status           VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    created_at       DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at       DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_invitation_family       FOREIGN KEY (family_id)       REFERENCES families (id) ON DELETE CASCADE,
    CONSTRAINT fk_invitation_invited_user FOREIGN KEY (invited_user_id) REFERENCES users (id)    ON DELETE CASCADE,
    CONSTRAINT fk_invitation_invited_by   FOREIGN KEY (invited_by_id)   REFERENCES users (id)    ON DELETE CASCADE,
    CONSTRAINT ck_invitation_status CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED'))
) ENGINE = InnoDB;

CREATE INDEX idx_invitation_invited_user_status ON invitations (invited_user_id, status);
CREATE INDEX idx_invitation_family ON invitations (family_id);

-- ---------------------------------------------------------------------
-- categories
-- family_id = NULL: danh mục hệ thống (chỉ admin quản lý)
-- family_id != NULL: danh mục tùy chỉnh của gia đình
-- ---------------------------------------------------------------------
CREATE TABLE categories (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    name        VARCHAR(100) NOT NULL,
    type        VARCHAR(20)  NOT NULL,
    family_id   BIGINT       NULL,
    active      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at  DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_category_family FOREIGN KEY (family_id) REFERENCES families (id) ON DELETE CASCADE,
    CONSTRAINT ck_category_type CHECK (type IN ('INCOME', 'EXPENSE')),
    -- Index hàm: danh mục hệ thống (family_id NULL) được gộp về 0 để cũng bị ràng buộc duy nhất.
    -- Cột name dùng collation không phân biệt hoa thường nên "Food" và "food" bị coi là trùng.
    UNIQUE INDEX uk_category_family_name_type ((COALESCE(family_id, 0)), name, type)
) ENGINE = InnoDB;

CREATE INDEX idx_category_family ON categories (family_id);

-- ---------------------------------------------------------------------
-- budgets
-- Ngân sách tổng: category_id = NULL và parent_budget_id = NULL
-- Ngân sách con: category_id và parent_budget_id đều có giá trị
-- Các quy tắc còn lại (không chồng lấn, tổng con <= tổng, ...) kiểm tra ở tầng service.
-- ---------------------------------------------------------------------
CREATE TABLE budgets (
    id                BIGINT       NOT NULL AUTO_INCREMENT,
    family_id         BIGINT       NOT NULL,
    category_id       BIGINT       NULL,
    parent_budget_id  BIGINT       NULL,
    start_date        DATE         NOT NULL,
    end_date          DATE         NOT NULL,
    amount            DECIMAL(19,2) NOT NULL,
    created_at        DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at        DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT uk_budget_parent_category UNIQUE (parent_budget_id, category_id),
    CONSTRAINT fk_budget_family   FOREIGN KEY (family_id)        REFERENCES families (id)   ON DELETE CASCADE,
    CONSTRAINT fk_budget_category FOREIGN KEY (category_id)      REFERENCES categories (id) ON DELETE RESTRICT,
    -- Xóa ngân sách tổng thì xóa luôn các ngân sách con.
    CONSTRAINT fk_budget_parent   FOREIGN KEY (parent_budget_id) REFERENCES budgets (id)    ON DELETE CASCADE,
    CONSTRAINT ck_budget_amount CHECK (amount > 0),
    CONSTRAINT ck_budget_dates  CHECK (end_date >= start_date)
) ENGINE = InnoDB;

CREATE INDEX idx_budget_family_dates ON budgets (family_id, start_date, end_date);

-- ---------------------------------------------------------------------
-- transactions
-- Số tiền luôn dương, thu hay chi do loại của danh mục quyết định.
-- ---------------------------------------------------------------------
CREATE TABLE transactions (
    id                BIGINT        NOT NULL AUTO_INCREMENT,
    family_id         BIGINT        NOT NULL,
    user_id           BIGINT        NOT NULL,
    category_id       BIGINT        NOT NULL,
    amount            DECIMAL(19,2) NOT NULL,
    transaction_date  DATE          NOT NULL,
    description       VARCHAR(255)  NULL,
    created_at        DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at        DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_transaction_family   FOREIGN KEY (family_id)   REFERENCES families (id)   ON DELETE CASCADE,
    CONSTRAINT fk_transaction_user     FOREIGN KEY (user_id)     REFERENCES users (id)      ON DELETE RESTRICT,
    CONSTRAINT fk_transaction_category FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE RESTRICT,
    CONSTRAINT ck_transaction_amount CHECK (amount > 0)
) ENGINE = InnoDB;

CREATE INDEX idx_transaction_family_date ON transactions (family_id, transaction_date);
CREATE INDEX idx_transaction_family_category_date ON transactions (family_id, category_id, transaction_date);

-- ---------------------------------------------------------------------
-- saving_goals
-- Số tiền đã tiết kiệm không lưu ở đây mà tính từ saving_contributions.
-- ---------------------------------------------------------------------
CREATE TABLE saving_goals (
    id             BIGINT       NOT NULL AUTO_INCREMENT,
    family_id      BIGINT       NOT NULL,
    created_by_id  BIGINT       NOT NULL,
    name           VARCHAR(100) NOT NULL,
    target_amount  DECIMAL(19,2) NOT NULL,
    target_date    DATE         NULL,
    status         VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    created_at     DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at     DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_saving_goal_family     FOREIGN KEY (family_id)     REFERENCES families (id) ON DELETE CASCADE,
    CONSTRAINT fk_saving_goal_created_by FOREIGN KEY (created_by_id) REFERENCES users (id)    ON DELETE RESTRICT,
    CONSTRAINT ck_saving_goal_target CHECK (target_amount > 0),
    CONSTRAINT ck_saving_goal_status CHECK (status IN ('ACTIVE', 'COMPLETED', 'CANCELLED'))
) ENGINE = InnoDB;

CREATE INDEX idx_saving_goal_family_status ON saving_goals (family_id, status);

-- ---------------------------------------------------------------------
-- saving_contributions
-- Không phải thu nhập hay chi tiêu, nhưng được tính vào "đã dùng" của ngân sách tổng.
-- ---------------------------------------------------------------------
CREATE TABLE saving_contributions (
    id                 BIGINT        NOT NULL AUTO_INCREMENT,
    saving_goal_id     BIGINT        NOT NULL,
    user_id            BIGINT        NOT NULL,
    amount             DECIMAL(19,2) NOT NULL,
    contribution_date  DATE          NOT NULL,
    note               VARCHAR(255)  NULL,
    created_at         DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at         DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_saving_contribution_goal FOREIGN KEY (saving_goal_id) REFERENCES saving_goals (id) ON DELETE CASCADE,
    CONSTRAINT fk_saving_contribution_user FOREIGN KEY (user_id)        REFERENCES users (id)        ON DELETE RESTRICT,
    CONSTRAINT ck_saving_contribution_amount CHECK (amount > 0)
) ENGINE = InnoDB;

CREATE INDEX idx_saving_contribution_goal ON saving_contributions (saving_goal_id);