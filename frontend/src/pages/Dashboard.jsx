import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowDownLeft, ArrowUpRight, CalendarDays,
  ChevronLeft, ChevronRight, CirclePlus, Ellipsis,
  Goal, PiggyBank, TrendingDown, TrendingUp,
  Wallet, Utensils, CarFront, House,
} from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useTheme } from '../context/ThemeContext';

/* ── Sample dataset (sẵn sàng kết nối API Sprint 3) ─────────────── */
const MONTHLY = [
  { month: 'Th.5',  income: 42, expense: 28 },
  { month: 'Th.6',  income: 46, expense: 31 },
  { month: 'Th.7',  income: 44, expense: 35 },
  { month: 'Th.8',  income: 52, expense: 32 },
  { month: 'Th.9',  income: 48, expense: 36 },
  { month: 'Th.10', income: 56, expense: 34 },
];

const CATEGORIES = [
  { name: 'Ăn uống',   value: 28, color: '#059669' },
  { name: 'Nhà cửa',   value: 24, color: '#0891B2' },
  { name: 'Di chuyển', value: 18, color: '#2563EB' },
  { name: 'Mua sắm',   value: 16, color: '#D97706' },
  { name: 'Khác',      value: 14, color: '#7C3AED' },
];

const TRANSACTIONS = [
  { title: 'Đi chợ cuối tuần',   category: 'Ăn uống',  date: 'Hôm nay, 09:42',    amount: -850000,   icon: Utensils,   color: 'mint' },
  { title: 'Lương tháng 10',     category: 'Thu nhập', date: 'Hôm nay, 08:15',    amount: 18500000,  icon: TrendingUp, color: 'blue' },
  { title: 'Đổ xăng xe máy',    category: 'Di chuyển', date: 'Hôm qua, 18:20',   amount: -120000,   icon: CarFront,   color: 'amber' },
  { title: 'Tiền điện tháng 10', category: 'Hóa đơn', date: '27 thg 10, 14:03',  amount: -740000,   icon: House,      color: 'violet' },
];

const MEMBERS = [
  { name: 'Nguyễn Văn An', role: 'Chủ gia đình', amount: 6200000, color: '#059669', initial: 'A' },
  { name: 'Trần Thị Bình',  role: 'Thành viên',   amount: 4300000, color: '#2563EB', initial: 'B' },
  { name: 'Lê Văn Cường',  role: 'Thành viên',   amount: 1850000, color: '#D97706', initial: 'C' },
];

const GOALS = [
  { name: 'Quỹ dự phòng',    saved: 18500000, target: 30000000, color: '#059669', icon: PiggyBank },
  { name: 'Du lịch Đà Nẵng', saved: 7200000,  target: 12000000, color: '#2563EB', icon: Goal },
];

/* ── Helpers ─────────────────────────────────────────────── */
const money = (n) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency', currency: 'VND', maximumFractionDigits: 0,
  }).format(n);

const shortMoney = (n) => {
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(1)} tỷ`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)} tr`;
  return money(n);
};

/* Custom Recharts tooltips with theme tokens */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface dark:bg-surface-dark border border-fin-border dark:border-fin-border-dark rounded-lg p-3 shadow-lg text-xs">
      <p className="mb-1.5 font-bold text-fin-text dark:text-fin-text-dark">
        {label}
      </p>
      {payload.map((p) => (
        <p key={p.name} className="my-0.5 flex items-center gap-1.5" style={{ color: p.fill }}>
          <span>{p.name}:</span>
          <strong className="font-tabular">{p.value} tr ₫</strong>
        </p>
      ))}
    </div>
  );
}

function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface dark:bg-surface-dark border border-fin-border dark:border-fin-border-dark rounded-lg p-2.5 shadow-lg text-xs flex items-center gap-2">
      <b className="text-fin-text dark:text-fin-text-dark">{payload[0].name}:</b>
      <span className="font-bold" style={{ color: payload[0].payload.color }}>
        {payload[0].value}%
      </span>
    </div>
  );
}

export default function Dashboard() {
  const { isDark } = useTheme();
  const [monthOffset, setMonthOffset] = useState(0);

  const monthLabel = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthOffset);
    return `Tháng ${d.getMonth() + 1}, ${d.getFullYear()}`;
  }, [monthOffset]);

  const axisColor   = isDark ? '#64748B' : '#94A3B8';
  const gridColor   = isDark ? '#1E293B' : '#F1F5F9';
  const incomeColor = isDark ? '#34D399' : '#059669';
  const expenseColor = isDark ? '#FB7185' : '#E05A61';

  const KPI_CARDS = [
    {
      title: 'Tổng thu nhập',
      value: money(42800000),
      change: '+12,8%',
      positive: true,
      hint: 'so với tháng trước',
      icon: ArrowDownLeft,
      iconClass: 'income',
    },
    {
      title: 'Tổng chi tiêu',
      value: money(26750000),
      change: '−4,2%',
      positive: false,
      hint: 'so với tháng trước',
      icon: ArrowUpRight,
      iconClass: 'expense',
    },
    {
      title: 'Số dư hiện tại',
      value: money(16050000),
      change: '+8,6%',
      positive: true,
      hint: 'tăng trưởng số dư',
      icon: Wallet,
      iconClass: 'info',
    },
    {
      title: 'Mục tiêu tiết kiệm',
      value: '64%',
      change: '2 đang thực hiện',
      positive: true,
      hint: 'tiến độ trung bình',
      icon: Goal,
      iconClass: 'warning',
      progress: 64,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="dashboard-container"
    >
      {/* ── Page heading ───────────────────────────────────── */}
      <div className="page-heading">
        <div className="page-heading-left">
          <div className="page-heading-meta">
            <span className="live-dot" aria-hidden="true" />
            Tổng quan tài chính gia đình
          </div>
          <h1 className="page-heading-title">Báo cáo tài chính gia đình</h1>
          <p className="page-heading-sub">
            Theo dõi tình hình thu chi, số dư và tiến độ tích lũy của cả gia đình.
          </p>
        </div>

        <div
          className="month-picker"
          role="group"
          aria-label="Chọn tháng xem báo cáo"
        >
          <CalendarDays size={15} aria-hidden="true" />
          <span aria-live="polite" aria-atomic="true" className="font-tabular font-semibold">
            {monthLabel}
          </span>
          <button
            type="button"
            onClick={() => setMonthOffset((n) => n - 1)}
            aria-label="Tháng trước"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            onClick={() => setMonthOffset((n) => Math.min(0, n + 1))}
            disabled={monthOffset >= 0}
            aria-label="Tháng sau"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* ── KPI StatCards ──────────────────────────────────────── */}
      <div className="stat-grid" role="list" aria-label="Chỉ số tài chính">
        {KPI_CARDS.map((card) => (
          <motion.article
            key={card.title}
            className="stat-card"
            role="listitem"
            whileHover={{ y: -3, transition: { duration: 0.18 } }}
          >
            <div className="stat-card-top">
              <span className="stat-card-label">{card.title}</span>
              <span className={`stat-card-icon ${card.iconClass}`} aria-hidden="true">
                <card.icon size={18} strokeWidth={1.8} />
              </span>
            </div>

            <div className="stat-card-value font-tabular">{card.value}</div>

            <div className="stat-card-footer">
              <span
                className={`change-pill ${card.positive ? 'positive' : 'negative'}`}
                aria-label={`Thay đổi: ${card.change}`}
              >
                {card.positive ? (
                  <TrendingUp size={11} aria-hidden="true" />
                ) : (
                  <TrendingDown size={11} aria-hidden="true" />
                )}
                {card.change}
              </span>
              <span>{card.hint}</span>
            </div>

            {card.progress != null && (
              <div
                className="mini-progress"
                role="progressbar"
                aria-valuenow={card.progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Tiến độ: ${card.progress}%`}
              >
                <span style={{ width: `${card.progress}%` }} />
              </div>
            )}
          </motion.article>
        ))}
      </div>

      {/* ── Charts row ─────────────────────────────────────── */}
      <div className="dashboard-grid chart-grid">
        {/* Bar chart: 6 months */}
        <section className="panel chart-panel" aria-label="Biểu đồ thu chi 6 tháng">
          <div className="panel-heading">
            <div>
              <h2 className="panel-title">Thu chi 6 tháng gần nhất</h2>
              <p className="panel-subtitle">Dòng tiền thu và chi của cả gia đình</p>
            </div>
            <button type="button" className="more-button" aria-label="Tùy chọn biểu đồ">
              <Ellipsis size={18} />
            </button>
          </div>

          <div className="chart-legend" aria-hidden="true">
            <span><i className="legend-income" /> Thu nhập</span>
            <span><i className="legend-expense" /> Chi tiêu</span>
          </div>

          <div className="bar-chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={MONTHLY}
                barGap={6}
                margin={{ top: 6, right: 6, left: -20, bottom: 0 }}
              >
                <CartesianGrid vertical={false} stroke={gridColor} strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: axisColor, fontSize: 11 }}
                  dy={8}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: axisColor, fontSize: 11 }}
                  tickFormatter={(v) => `${v}tr`}
                />
                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{ fill: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}
                />
                <Bar
                  dataKey="income"
                  name="Thu nhập"
                  fill={incomeColor}
                  radius={[5, 5, 0, 0]}
                  maxBarSize={22}
                />
                <Bar
                  dataKey="expense"
                  name="Chi tiêu"
                  fill={expenseColor}
                  radius={[5, 5, 0, 0]}
                  maxBarSize={22}
                  opacity={0.82}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-footnote" aria-live="polite">
            <span className="footnote-icon" aria-hidden="true">
              <TrendingUp size={14} />
            </span>
            <span>
              Thu nhập tháng này cao hơn chi tiêu <b className="font-tabular">22 triệu ₫</b>
            </span>
          </div>
        </section>

        {/* Donut chart: Categories */}
        <section className="panel category-panel" aria-label="Phân bổ chi tiêu theo danh mục">
          <div className="panel-heading">
            <div>
              <h2 className="panel-title">Chi tiêu theo danh mục</h2>
              <p className="panel-subtitle">Phân bổ chi tiêu trong tháng</p>
            </div>
            <button type="button" className="more-button" aria-label="Tùy chọn">
              <Ellipsis size={18} />
            </button>
          </div>

          <div className="donut-wrap" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={CATEGORIES}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="64%"
                  outerRadius="88%"
                  paddingAngle={3}
                  stroke="none"
                >
                  {CATEGORIES.map((c) => (
                    <Cell key={c.name} fill={c.color} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-center">
              <small>Tổng chi</small>
              <b className="font-tabular">26,75 tr</b>
              <span>VND</span>
            </div>
          </div>

          <div className="category-legend" aria-label="Chú giải danh mục">
            {CATEGORIES.map((c) => (
              <div key={c.name}>
                <span>
                  <i style={{ background: c.color }} aria-hidden="true" />
                  {c.name}
                </span>
                <b className="font-tabular">{c.value}%</b>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ── Lower row: Transactions, Members, Goals ─────────── */}
      <div className="dashboard-grid lower-grid">
        {/* Recent Transactions */}
        <section className="panel transaction-panel" aria-label="Giao dịch gần đây">
          <div className="panel-heading">
            <div>
              <h2 className="panel-title">Giao dịch gần đây</h2>
              <p className="panel-subtitle">Các khoản thu chi mới nhất</p>
            </div>
            <a className="text-link" href="/app/transactions" aria-label="Xem tất cả giao dịch">
              Xem tất cả <ArrowUpRight size={13} aria-hidden="true" />
            </a>
          </div>

          <div className="transaction-list" role="list">
            {TRANSACTIONS.map((t) => (
              <div className="transaction-row" key={t.title} role="listitem">
                <span className={`transaction-icon ${t.color}`} aria-hidden="true">
                  <t.icon size={17} strokeWidth={1.8} />
                </span>
                <span className="transaction-info">
                  <b>{t.title}</b>
                  <small>{t.category} <i>·</i> {t.date}</small>
                </span>
                <b
                  className={`transaction-amount font-tabular${t.amount > 0 ? ' positive' : ''}`}
                  aria-label={`${t.amount > 0 ? 'Thu' : 'Chi'} ${money(Math.abs(t.amount))}`}
                >
                  {t.amount > 0 ? '+' : '−'}{shortMoney(Math.abs(t.amount))}
                </b>
              </div>
            ))}
          </div>
        </section>

        {/* Member Spending */}
        <section className="panel member-panel" aria-label="Chi tiêu theo thành viên">
          <div className="panel-heading">
            <div>
              <h2 className="panel-title">Chi tiêu theo thành viên</h2>
              <p className="panel-subtitle">Phân bổ tháng này</p>
            </div>
            <button type="button" className="more-button" aria-label="Tùy chọn">
              <Ellipsis size={18} />
            </button>
          </div>

          <div className="member-list" role="list">
            {MEMBERS.map((m) => {
              const max = MEMBERS[0].amount;
              const pct = Math.round((m.amount / max) * 100);
              return (
                <div className="member-row" key={m.name} role="listitem">
                  <span
                    className="member-avatar"
                    style={{ background: `${m.color}18`, color: m.color }}
                    aria-hidden="true"
                  >
                    {m.initial}
                  </span>
                  <div className="member-detail">
                    <div className="member-name-line">
                      <span>
                        <b>{m.name}</b>
                        <small>{m.role}</small>
                      </span>
                      <strong className="font-tabular">{shortMoney(m.amount)}</strong>
                    </div>
                    <div
                      className="member-progress"
                      role="progressbar"
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${m.name}: ${pct}%`}
                    >
                      <span style={{ width: `${pct}%`, background: m.color }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <a className="text-link member-link" href="/app/members">
            Quản lý thành viên <ArrowUpRight size={13} aria-hidden="true" />
          </a>
        </section>

        {/* Saving Goals */}
        <section className="panel goals-panel" aria-label="Mục tiêu tiết kiệm">
          <div className="panel-heading">
            <div>
              <h2 className="panel-title">Mục tiêu tiết kiệm</h2>
              <p className="panel-subtitle">Từng bước chạm tới ước mơ</p>
            </div>
            <button
              type="button"
              className="round-add"
              title="Thêm mục tiêu"
              aria-label="Thêm mục tiêu tiết kiệm"
            >
              <CirclePlus size={17} />
            </button>
          </div>

          <div className="goals-list" role="list">
            {GOALS.map((g) => {
              const pct = Math.min(100, Math.round((g.saved / g.target) * 100));
              return (
                <div className="goal-row" key={g.name} role="listitem">
                  <span
                    className="goal-icon"
                    style={{ color: g.color, background: `${g.color}15` }}
                    aria-hidden="true"
                  >
                    <g.icon size={17} strokeWidth={1.8} />
                  </span>
                  <div className="goal-detail">
                    <div className="goal-title">
                      <b>{g.name}</b>
                      <strong className="font-tabular">{pct}%</strong>
                    </div>
                    <div
                      className="goal-progress"
                      role="progressbar"
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Tiến độ: ${pct}%`}
                    >
                      <span style={{ width: `${pct}%`, background: g.color }} />
                    </div>
                    <small className="font-tabular">
                      {shortMoney(g.saved)} <i>/</i> {shortMoney(g.target)}
                    </small>
                  </div>
                </div>
              );
            })}
          </div>

          <a className="text-link goal-link" href="/app/saving-goals">
            Xem tất cả mục tiêu <ArrowUpRight size={13} aria-hidden="true" />
          </a>
        </section>
      </div>

      {/* Footer note */}
      <div className="dashboard-bottom-note">
        <span>
          <span className="live-dot" aria-hidden="true" />
          Dữ liệu minh họa giao diện — kết nối API để xem dữ liệu thực
        </span>
        <span>FinHome V3</span>
      </div>
    </motion.div>
  );
}
