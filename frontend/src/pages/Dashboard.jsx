
import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowDownRight, ArrowUpRight, CalendarDays, ChevronLeft, ChevronRight,
  Goal, TrendingUp, Wallet, Users, PiggyBank,
} from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';
import { useFamily } from '../context/FamilyContext';
import api, { responseData } from '../lib/api';
import { useToast } from '../context/ToastContext';
import {
  dashboardApi, categoryApi, transactionApi, savingApi, asList, money, alertTone,
} from '../services/pfmApi';
import { EmptyState, PageLoading, Progress } from '../components/PfmUI';

const palette = [
  '#ff7770', '#ffad55', '#50bfe8', '#ff8b69', '#c978e8',
  '#9aa6ad', '#10b981', '#6478e8', '#d6a34a', '#4c9b86',
];
const fmtShort = value =>
    `${(Number(value || 0) / 1000000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tr`;

const formatBudgetPercent = value => {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0%';

  return number >= 1000
      ? '>999%'
      : `${number.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`;
};
const toLocalDateString = date => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

async function loadMonthlyBudgets(familyId, month) {
  const pageSize = 50;
  const firstResponse = await api.get(`/api/v1/families/${familyId}/budgets/by-month`, {
    params: { month, page: 0, size: pageSize, sort: 'startDate,asc' },
  });
  const firstPage = responseData(firstResponse);
  const budgets = asList(firstPage);
  const totalPages = Math.max(1, Number(firstPage?.totalPages || 1));

  if (totalPages > 1) {
    const otherPages = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, index) =>
            api.get(`/api/v1/families/${familyId}/budgets/by-month`, {
              params: { month, page: index + 1, size: pageSize, sort: 'startDate,asc' },
            }).then(response => asList(responseData(response)))
        )
    );
    otherPages.forEach(page => budgets.push(...page));
  }

  return budgets;
}

async function loadExpenseTransactions(familyId, startDate, endDate) {
  const pageSize = 100;
  const firstPage = await transactionApi.list(familyId, {
    startDate, endDate, type: 'EXPENSE', page: 0, size: pageSize,
    sort: 'transactionDate,desc',
  });
  const transactions = asList(firstPage);
  const totalPages = Math.max(1, Number(firstPage?.totalPages || 1));
  if (totalPages > 1) {
    const remainingPages = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, index) =>
            transactionApi.list(familyId, {
              startDate, endDate, type: 'EXPENSE', page: index + 1,
              size: pageSize, sort: 'transactionDate,desc',
            })
        )
    );
    remainingPages.forEach(page => transactions.push(...asList(page)));
  }
  return transactions;
}


function DashboardTooltip({ active, payload, label, variant = 'default' }) {
  if (!active || !payload?.length) return null;

  if (variant === 'trend') {
    const date = label && /^\d{4}-\d{2}-\d{2}$/.test(String(label))
        ? new Date(`${label}T00:00:00`).toLocaleDateString('vi-VN', {
          weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
        })
        : label;
    return (
        <div className="pfm-chart-tooltip pfm-chart-tooltip-trend">
          <span className="pfm-tooltip-eyebrow">TỔNG QUAN THEO NGÀY</span>
          <strong className="pfm-tooltip-title">{date}</strong>
          <div className="pfm-tooltip-metrics">
            {payload.map(item => (
                <div className="pfm-tooltip-metric" key={item.dataKey}>
                  <span><i style={{ background: item.color }} />{item.name}</span>
                  <b>{money(item.value)}</b>
                </div>
            ))}
          </div>
        </div>
    );
  }

  if (variant === 'category') {
    const item = payload[0]?.payload || {};
    return (
        <div className="pfm-chart-tooltip">
          <span className="pfm-tooltip-eyebrow">CHI TIÊU THEO DANH MỤC</span>
          <strong className="pfm-tooltip-title">{item.categoryName || payload[0]?.name || 'Danh mục'}</strong>
          <b className="pfm-tooltip-amount">{money(item.amount ?? payload[0]?.value)}</b>
          <span className="pfm-tooltip-caption">{Number(item.percent || 0).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}% tổng chi tiêu</span>
        </div>
    );
  }

  if (variant === 'member') {
    const item = payload[0]?.payload || {};
    return (
        <div className="pfm-chart-tooltip">
          <span className="pfm-tooltip-eyebrow">CHI TIÊU THÀNH VIÊN</span>
          <strong className="pfm-tooltip-title">{item.memberName || label || 'Thành viên'}</strong>
          <b className="pfm-tooltip-amount">{money(item.amount ?? payload[0]?.value)}</b>
          <span className="pfm-tooltip-caption">Trong kỳ đang chọn</span>
        </div>
    );
  }
  return null;
}

const familyRoleLabels = {
  OWNER: 'Chủ gia đình',
  MANAGER: 'Quản lý',
  MEMBER: 'Thành viên',
};

export default function Dashboard() {
  const { activeFamily, activeFamilyId } = useFamily();
  const toast = useToast();
  const [monthOffset, setMonthOffset] = useState(0);
  const [data, setData] = useState(null);
  const [allCategories, setAllCategories] = useState([]);
  const [expenseTransactions, setExpenseTransactions] = useState([]);
  const [savingGoals, setSavingGoals] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [monthlyBudgets, setMonthlyBudgets] = useState([]);
  const [budgetPage, setBudgetPage] = useState(0);
  const [loading, setLoading] = useState(true);

  const selected = useMemo(() => {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() + monthOffset);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return {
      month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      startDate: toLocalDateString(new Date(date.getFullYear(), date.getMonth(), 1)),
      endDate: toLocalDateString(new Date(Math.min(lastDay.getTime(), Date.now()))),
      label: `Tháng ${date.getMonth() + 1}, ${date.getFullYear()}`,
    };
  }, [monthOffset]);

  const load = useCallback(async () => {
    if (!activeFamilyId) {
      setData(null);
      setAllCategories([]);
      setExpenseTransactions([]);
      setSavingGoals([]);
      setRecentTransactions([]);
      setMonthlyBudgets([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [dashboardData, categoriesResult, transactionsResult, goalsResult, recentResult, budgetsResult] = await Promise.all([
        dashboardApi.get(activeFamilyId, {
          startDate: selected.startDate,
          endDate: selected.endDate,
        }),
        categoryApi.list(activeFamilyId, 'EXPENSE').catch(() => null),
        loadExpenseTransactions(activeFamilyId, selected.startDate, selected.endDate).catch(() => []),
        savingApi.list(activeFamilyId, { page: 0, size: 50, sort: 'createdAt,desc' }).catch(() => []),
        transactionApi.list(activeFamilyId, { startDate: selected.startDate, endDate: selected.endDate, page: 0, size: 6, sort: 'transactionDate,desc' }).catch(() => []),
        loadMonthlyBudgets(activeFamilyId, selected.month).catch(() => []),
      ]);
      setData(dashboardData);
      setAllCategories(asList(categoriesResult).filter(category => category.active !== false));
      setExpenseTransactions(transactionsResult);
      setSavingGoals(asList(goalsResult).filter(goal => String(goal.status || 'ACTIVE').toUpperCase() === 'ACTIVE'));
      setRecentTransactions(asList(recentResult).slice(0, 6));
      setMonthlyBudgets(asList(budgetsResult));
    } catch (error) {
      toast(error?.response?.data?.message || 'Không thể tải dữ liệu tổng quan.', 'error');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [activeFamilyId, selected, toast]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => { setBudgetPage(0); }, [activeFamilyId, selected.month]);
  useEffect(() => {
    setBudgetPage(current => Math.min(current, Math.max(0, monthlyBudgets.length - 1)));
  }, [monthlyBudgets.length]);

  const overview = data?.overview || {};
  const rawSummary = overview.summary || data?.summary || {};
  const trends = Array.isArray(overview.trend)
      ? overview.trend
      : (Array.isArray(data?.trend) ? data.trend : []);
  const sumTrend = key => trends.reduce((total, row) => total + Number(row?.[key] || 0), 0);
  const incomeValue = Number(
      rawSummary.totalIncome ?? rawSummary.totalIncomeAmount ??
      rawSummary.incomeAmount ?? rawSummary.income ?? sumTrend('income')
  );
  const expenseValue = Number(
      rawSummary.totalExpense ?? rawSummary.totalExpenseAmount ??
      rawSummary.expenseAmount ?? rawSummary.expense ?? sumTrend('expense')
  );
  const summary = {
    ...rawSummary,
    totalIncome: incomeValue,
    totalExpense: expenseValue,
    netBalance: Number(rawSummary.netBalance ?? rawSummary.balance ?? incomeValue - expenseValue),
  };

  const rawCategories = overview.expenseByCategory || data?.expenseByCategory || [];
  // Các chỉ số tổng hợp dùng cho thẻ thống kê phía trên.
  const allBudgetTotal = monthlyBudgets.reduce((total, item) => total + Number(item.amount || 0), 0);
  const allBudgetUsed = monthlyBudgets.reduce((total, item) => total + Number(item.used ?? item.spent ?? 0), 0);
  const allBudgetPct = allBudgetTotal > 0 ? allBudgetUsed / allBudgetTotal * 100 : 0;
  // Thẻ ngân sách bên dưới chỉ hiển thị một ngân sách tại một thời điểm.
  const currentBudget = monthlyBudgets[budgetPage] || null;
  const budgetTotal = Number(currentBudget?.amount ?? 0);
  const budgetUsed = Number(currentBudget?.used ?? currentBudget?.spent ?? 0);
  const rawBudgetPercent = Number(currentBudget?.usedPercent);
  const pct = budgetTotal > 0
      ? Math.max(0, Number.isFinite(rawBudgetPercent) && currentBudget?.usedPercent != null
          ? rawBudgetPercent
          : budgetUsed / budgetTotal * 100)
      : 0;

  const budgetSaved = Number(currentBudget?.saved ?? 0);
  const budgetSpent = Number(currentBudget?.spent ?? currentBudget?.used ?? 0);
  const budgetRemaining = Number(currentBudget?.remaining ?? budgetTotal - budgetUsed);
  const budgetOverrun = Math.max(0, budgetUsed - budgetTotal);

  // 100% vẫn là cảnh báo; chỉ trên 100% mới là vượt ngân sách.
  const tone = budgetTotal <= 0
      ? 'success'
      : pct > 100
          ? 'danger'
          : pct >= 80
              ? 'warning'
              : 'success';

  const pulseDuration =
      tone === 'danger'
          ? 1.1
          : tone === 'warning'
              ? 3
              : 5;

  const pulseScale =
      tone === 'danger'
          ? [1, 1.12, 1]
          : tone === 'warning'
              ? [1, 1.07, 1]
              : [1, 1.035, 1];

  const pulseShadow =
      tone === 'danger'
          ? [
            '0 0 0 0 rgba(239,68,68,0)',
            '0 0 0 10px rgba(239,68,68,0.24)',
            '0 0 0 0 rgba(239,68,68,0)',
          ]
          : tone === 'warning'
              ? [
                '0 0 0 0 rgba(245,158,11,0)',
                '0 0 0 8px rgba(245,158,11,0.18)',
                '0 0 0 0 rgba(245,158,11,0)',
              ]
              : [
                '0 0 0 0 rgba(16,185,129,0)',
                '0 0 0 6px rgba(16,185,129,0.13)',
                '0 0 0 0 rgba(16,185,129,0)',
              ];
  const roleCode = String(activeFamily?.myRole ?? activeFamily?.role ?? 'MEMBER').toUpperCase();
  const role = familyRoleLabels[roleCode] || 'Thành viên';

  // Merge API category totals with the complete active expense-category list.
  // Categories with no spending remain visible with 0% in the legend.
  const categories = useMemo(() => {
    const usedCategories = Array.isArray(rawCategories) ? rawCategories : [];
    const merged = allCategories.map(category => {
      const id = category.id ?? category.categoryId;
      const name = category.name ?? category.categoryName ?? 'Danh mục';
      const matched = usedCategories.find(item =>
          (id != null && String(item.categoryId ?? item.id) === String(id)) ||
          String(item.categoryName ?? item.name ?? '').toLocaleLowerCase() === String(name).toLocaleLowerCase()
      );
      return {
        categoryId: id ?? matched?.categoryId,
        categoryName: name,
        amount: Number(matched?.amount ?? matched?.totalAmount ?? 0),
      };
    });
    // Keep categories used by historical transactions even if now archived.
    usedCategories.forEach(item => {
      const name = item.categoryName ?? item.name ?? 'Danh mục';
      const exists = merged.some(category =>
          (item.categoryId != null && String(category.categoryId) === String(item.categoryId)) ||
          category.categoryName.toLocaleLowerCase() === String(name).toLocaleLowerCase()
      );
      if (!exists) merged.push({
        categoryId: item.categoryId ?? item.id,
        categoryName: name,
        amount: Number(item.amount ?? item.totalAmount ?? 0),
      });
    });
    return merged.map(category => ({
      ...category,
      percent: summary.totalExpense > 0 ? category.amount / summary.totalExpense * 100 : 0,
    }));
  }, [allCategories, rawCategories, summary.totalExpense]);

  const memberExpenses = useMemo(() => {
    const grouped = new Map();
    expenseTransactions.forEach(transaction => {
      const userId = transaction.userId ?? transaction.user?.id ?? transaction.username ?? transaction.userFullName;
      const memberName = transaction.userFullName || transaction.fullName ||
          transaction.username || transaction.user?.fullName || 'Thành viên';
      const key = String(userId ?? memberName);
      const current = grouped.get(key) || { userId: key, memberName, amount: 0 };
      current.amount += Number(transaction.amount || 0);
      grouped.set(key, current);
    });
    return [...grouped.values()].sort((a, b) => b.amount - a.amount);
  }, [expenseTransactions]);

  // Điều hướng từng ngân sách: mỗi lượt chỉ hiển thị một ngân sách.
  const budgetTotalPages = monthlyBudgets.length;

  const cards = [
    { title: 'Tổng thu nhập', value: money(summary.totalIncome), icon: ArrowDownRight, theme: 'green', sub: 'Trong kỳ đã chọn' },
    { title: 'Tổng chi tiêu', value: money(summary.totalExpense), icon: ArrowUpRight, theme: 'coral', sub: 'Trong kỳ đã chọn' },
    { title: 'Số dư ròng', value: money(summary.netBalance), icon: Wallet, theme: 'blue', sub: 'Thu nhập trừ chi tiêu' },
    { title: 'Ngân sách đã dùng', value: `${allBudgetPct.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`, icon: Goal, theme: 'gold', sub: monthlyBudgets.length ? `${money(allBudgetUsed)} / ${money(allBudgetTotal)}` : 'Chưa có ngân sách', progress: allBudgetPct },
  ];
  return (
      <motion.div className="dashboard-page"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="page-heading">
          <div>
            <div className="greeting-line">TỔNG QUAN TÀI CHÍNH <span className="live-dot" /></div>
            <h1>Chào gia đình <span>✦</span></h1>
            <p className="pfm-dashboard-family-meta"><span>{activeFamily?.name || 'Không gian gia đình'}</span><i /> <span>Vai trò: <b>{role}</b></span></p>
          </div>
          <div className="month-picker">
            <CalendarDays size={17} />
            <span>{selected.label}</span>
            <button onClick={() => setMonthOffset(value => value - 1)} aria-label="Tháng trước"><ChevronLeft size={16} /></button>
            <button onClick={() => setMonthOffset(value => Math.min(0, value + 1))} disabled={monthOffset >= 0} aria-label="Tháng sau"><ChevronRight size={16} /></button>
          </div>
        </div>

        {loading ? <PageLoading rows={4} /> : !data ? (
            <EmptyState title="Chưa có dữ liệu tổng quan" description="Hãy chọn một gia đình có dữ liệu hoặc thử tải lại." />
        ) : (
            <>
              <div className="stat-grid">
                {cards.map(card => (
                    <motion.article key={card.title} className={`stat-card ${card.theme}`} whileHover={{ y: -3 }}>
                      <div className="stat-card-top">
                        <span>{card.title}</span>
                        <span className="stat-card-icon"><card.icon size={20} /></span>
                      </div>
                      <strong>{card.value}</strong>
                      <div className="stat-card-bottom"><span>{card.sub}</span></div>
                      {card.progress !== undefined && <div className="mini-progress"><span style={{ width: `${Math.min(100, card.progress)}%` }} /></div>}
                    </motion.article>
                ))}
              </div>

              <div className="dashboard-grid chart-grid pfm-dashboard-analytics-grid">
                <section className="panel chart-panel pfm-dashboard-trend-panel">
                  <div className="panel-heading">
                    <div><h3>Thu chi theo thời gian</h3><p>Dữ liệu thực từ gia đình · VND</p></div>
                  </div>
                  <div className="chart-legend">
                    <span><i className="legend-income" /> Thu nhập</span>
                    <span><i className="legend-expense" /> Chi tiêu</span>
                  </div>
                  <div className="bar-chart-wrap">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={trends} barGap={7} margin={{ top: 10, right: 0, left: -12, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke="#eef2f6" strokeDasharray="4 4" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={value => new Date(`${value}T00:00:00`).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} dy={9} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={fmtShort} />
                        <Tooltip content={<DashboardTooltip variant="trend" />} cursor={{ fill: "var(--pfm-chart-hover, #f3faf6)" }} />
                        <Bar dataKey="income" name="Thu nhập" fill="#10b981" radius={[5, 5, 0, 0]} maxBarSize={22} />
                        <Bar dataKey="expense" name="Chi tiêu" fill="#fda4af" radius={[5, 5, 0, 0]} maxBarSize={22} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="chart-footnote">
                    <span className="footnote-icon"><TrendingUp size={16} /></span>
                    <span>Thu nhập: <b>{money(summary.totalIncome)}</b> · Chi tiêu: <b>{money(summary.totalExpense)}</b></span>
                  </div>
                </section>

                <section className="panel category-panel pfm-dashboard-category-panel">
                  <div className="panel-heading">
                    <div><h3>Chi tiêu theo danh mục</h3><p>Toàn bộ danh mục chi tiêu đang hoạt động</p></div>
                  </div>
                  <div className="donut-wrap">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={categories.filter(category => category.amount > 0)} dataKey="amount" nameKey="categoryName" innerRadius="66%" outerRadius="88%" paddingAngle={3} stroke="none">
                          {categories.filter(category => category.amount > 0).map(category => {
                            const index = categories.findIndex(item => item.categoryId === category.categoryId && item.categoryName === category.categoryName);
                            return <Cell key={category.categoryId ?? category.categoryName} fill={palette[(index < 0 ? 0 : index) % palette.length]} />;
                          })}
                        </Pie>
                        <Tooltip content={<DashboardTooltip variant="category" />} cursor={false} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="donut-center">
                      <small>Tổng chi tiêu</small>
                      <b>{money(summary.totalExpense)}</b>
                      <span>Trong kỳ</span>
                    </div>
                  </div>
                  {categories.length ? (
                      <div className="category-legend pfm-category-legend-all">
                        {categories.map((category, index) => (
                            <div key={category.categoryId ?? category.categoryName}>
                              <span><i style={{ background: palette[index % palette.length] }} />{category.categoryName}</span>
                              <b>{category.percent.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%</b>
                            </div>
                        ))}
                      </div>
                  ) : <EmptyState title="Chưa có danh mục chi tiêu" />}
                </section>

                <section className="panel category-panel pfm-dashboard-member-panel">
                  <div className="panel-heading">
                    <div><h3>Chi tiêu theo thành viên</h3><p>Tổng chi tiêu của từng người trong kỳ</p></div>
                    <span className="pfm-chart-heading-icon"><Users size={16} /></span>
                  </div>
                  {memberExpenses.length ? (
                      <div className="pfm-member-chart" style={{ height: `${Math.max(220, memberExpenses.length * 44)}px` }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={memberExpenses} layout="vertical" margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                            <CartesianGrid horizontal={false} stroke="#eef2f6" strokeDasharray="4 4" />
                            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={fmtShort} />
                            <YAxis type="category" dataKey="memberName" width={104} axisLine={false} tickLine={false} tick={{ fill: '#60776b', fontSize: 10 }} />
                            <Tooltip content={<DashboardTooltip variant="member" />} cursor={{ fill: "var(--pfm-chart-hover, #f3faf6)" }} />
                            <Bar dataKey="amount" name="Chi tiêu" fill="#36b98a" radius={[0, 7, 7, 0]} maxBarSize={22} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                  ) : <EmptyState title="Chưa có chi tiêu theo thành viên" description="Các khoản chi trong kỳ sẽ được tổng hợp tại đây." />}
                </section>
              </div>

              <div className="dashboard-budget-row">
                <section className="panel category-panel pfm-dashboard-budget-card pfm-dashboard-budget-full">
                  <div className="panel-heading">
                    <div><h3>Ngân sách sử dụng</h3><p>Theo dõi hạn mức gia đình đang áp dụng</p></div>
                    <a className="text-link" href="/app/budgets">Chi tiết <ArrowUpRight size={15} /></a>
                  </div>
                  {currentBudget ? (
                      <>
                        <div className="pfm-budget-hero">
                          <div>
                            <small>NGÂN SÁCH {budgetPage + 1}/{budgetTotalPages}</small>
                            <strong>{money(budgetTotal)}</strong>
                            <span className={`pfm-budget-state ${tone}`}>{tone === 'danger' ? 'Vượt ngân sách' : tone === 'warning' ? 'Sắp chạm hạn mức' : 'Trong hạn mức'}</span>
                          </div>

                          <div
                              className={`pfm-dashboard-budget-percent-wrap ${
                                  budgetTotal > 0 && pct > 100 ? 'has-overrun-tooltip' : ''
                              }`}
                              data-tooltip={
                                budgetTotal > 0 && pct > 100
                                    ? `Đã vượt: ${money(budgetOverrun)} (Vượt: ${((budgetUsed - budgetTotal) / budgetTotal * 100).toLocaleString('vi-VN', {
                                      maximumFractionDigits: 1
                                    })}% mức sử dụng) `
                                    : ''
                              }
                          >
                            <motion.div
                                className={`pfm-budget-percent ${tone}`}
                                animate={{
                                  '--budget-progress': `${Math.min(100, Math.max(0, pct)) * 3.6}deg`,
                                  scale: pulseScale,
                                  boxShadow: pulseShadow,
                                }}
                                transition={{
                                  '--budget-progress': {
                                    duration: 1.2,
                                    ease: 'easeOut',
                                  },
                                  scale: {
                                    duration: pulseDuration,
                                    repeat: Infinity,
                                    repeatType: 'loop',
                                    ease: 'easeInOut',
                                  },
                                  boxShadow: {
                                    duration: pulseDuration,
                                    repeat: Infinity,
                                    repeatType: 'loop',
                                    ease: 'easeInOut',
                                  },
                                }}
                                style={{
                                  background: `conic-gradient(
                            var(--budget-ring-fill) var(--budget-progress),
                            var(--budget-ring-track) 0deg
                          )`,
                                }}
                            >
                              <b>{budgetTotal > 0 ? formatBudgetPercent(pct) : '—'}</b>
                              <small>
                                {budgetTotal <= 0
                                    ? 'Chưa đặt hạn mức'
                                    : pct > 100
                                        ? 'vượt ngân sách'
                                        : pct >= 80
                                            ? 'Sắp chạm hạn mức'
                                            : 'Đã sử dụng'}
                              </small>
                            </motion.div>
                          </div>

                        </div>
                        <Progress value={Math.min(100, Math.max(0, pct))} status={tone} />
                        <div className="pfm-budget-stats">
                          <div><small><i className="spent-dot" /> Đã chi</small><b>{money(budgetSpent)}</b></div>
                          <div><small><i className="saved-dot" /> Đã tiết kiệm</small><b>{money(budgetSaved)}</b></div>
                          <div><small><i className="remaining-dot" /> Còn lại</small><b className={budgetRemaining < 0 ? 'pfm-negative' : ''}>{money(budgetRemaining)}</b></div>
                        </div>
                        <p className="pfm-budget-caption">
                          {currentBudget.startDate || '—'} – {currentBudget.endDate || '—'} · Dữ liệu được tính theo chu kỳ của ngân sách này.
                        </p>
                        {monthlyBudgets.length > 1 && (
                            <div className="pfm-budget-pagination" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--pfm-border, #e8eeeb)' }}>
                              <small style={{ color: 'var(--pfm-muted, #82938b)' }}>
                                Ngân sách {budgetPage + 1}/{budgetTotalPages}
                              </small>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <button type="button" onClick={() => setBudgetPage(page => Math.max(0, page - 1))} disabled={budgetPage === 0} aria-label="Ngân sách trước" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 9, border: '1px solid var(--pfm-border, #e8eeeb)', background: 'var(--pfm-card, #fff)', color: 'var(--pfm-text, #17352c)', cursor: budgetPage === 0 ? 'not-allowed' : 'pointer', opacity: budgetPage === 0 ? 0.45 : 1 }}>
                                  <ChevronLeft size={16} />
                                </button>
                                <button type="button" onClick={() => setBudgetPage(page => Math.min(budgetTotalPages - 1, page + 1))} disabled={budgetPage >= budgetTotalPages - 1} aria-label="Ngân sách tiếp theo" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 9, border: '1px solid var(--pfm-border, #e8eeeb)', background: 'var(--pfm-card, #fff)', color: 'var(--pfm-text, #17352c)', cursor: budgetPage >= budgetTotalPages - 1 ? 'not-allowed' : 'pointer', opacity: budgetPage >= budgetTotalPages - 1 ? 0.45 : 1 }}>
                                  <ChevronRight size={16} />
                                </button>
                              </div>
                            </div>
                        )}
                      </>
                  ) : <EmptyState title={`Không có ngân sách áp dụng trong ${selected.label}`} description="Hãy tạo ngân sách có thời gian hiệu lực giao với tháng đang chọn." />}
                </section>
              </div>
              <div className="dashboard-grid pfm-dashboard-extras">
                <section className="panel category-panel pfm-dashboard-extra-panel">
                  <div className="panel-heading">
                    <div><h3>Tiến độ mục tiêu tiết kiệm</h3><p>Theo dõi số tiền đã tích lũy của gia đình</p></div>
                    <a className="text-link" href="/app/saving-goals">Tất cả mục tiêu <ArrowUpRight size={15}/></a>
                  </div>
                  {savingGoals.length === 0 ? (
                      <EmptyState title="Chưa có mục tiêu đang thực hiện" description="Tạo mục tiêu tiết kiệm để theo dõi tiến độ tại đây."/>
                  ) : (
                      <div className="pfm-dashboard-goals-list">
                        {savingGoals.slice(0, 4).map(goal => {
                          const target = Number(goal.targetAmount || 0);
                          const saved = Number(goal.savedAmount || 0);
                          const progress = Math.max(0, Math.min(100, Number(goal.progressPercent ?? (target > 0 ? saved / target * 100 : 0))));
                          return (
                              <article className="pfm-dashboard-goal-row" key={goal.id}>
                                <span className="pfm-dashboard-goal-icon"><PiggyBank size={18}/></span>
                                <div className="pfm-dashboard-goal-main">
                                  <div className="pfm-dashboard-goal-title"><b>{goal.name || 'Mục tiêu tiết kiệm'}</b><strong>{progress.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%</strong></div>
                                  <div className="pfm-dashboard-goal-track"><span style={{ width: `${progress}%` }}/></div>
                                  <small>{money(saved)} / {money(target)}</small>
                                </div>
                              </article>
                          );
                        })}
                      </div>
                  )}
                </section>

                <section className="panel category-panel pfm-dashboard-extra-panel">
                  <div className="panel-heading">
                    <div><h3>Giao dịch gần đây</h3><p>6 khoản thu chi mới nhất trong {selected.label}</p></div>
                    <a className="text-link" href="/app/transactions">Xem tất cả <ArrowUpRight size={15}/></a>
                  </div>
                  {recentTransactions.length === 0 ? (
                      <EmptyState title="Chưa có giao dịch gần đây" description="Các giao dịch mới sẽ xuất hiện tại đây."/>
                  ) : (
                      <div className="pfm-dashboard-recent-list">
                        {recentTransactions.map(transaction => {
                          const type = String(transaction.type || transaction.transactionType || transaction.categoryType || 'EXPENSE').toUpperCase();
                          const income = type === 'INCOME';
                          const label = transaction.description || transaction.note || transaction.categoryName || transaction.category?.name || 'Giao dịch';
                          const date = transaction.transactionDate || transaction.date || transaction.createdAt;
                          return (
                              <article className="pfm-dashboard-recent-row" key={transaction.id}>
                        <span className={`pfm-dashboard-recent-icon ${income ? 'income' : 'expense'}`}>
                          {income ? <ArrowDownRight size={18}/> : <ArrowUpRight size={18}/>}
                        </span>
                                <div className="pfm-dashboard-recent-main">
                                  <b>{label}</b>
                                  <small>{date ? new Date(date).toLocaleDateString('vi-VN') : '—'} · {transaction.categoryName || transaction.category?.name || (income ? 'Thu nhập' : 'Chi tiêu')}</small>
                                </div>
                                <strong className={income ? 'income' : 'expense'}>{income ? '+' : '−'}{money(transaction.amount)}</strong>
                              </article>
                          );
                        })}
                      </div>
                  )}
                </section>
              </div>
            </>
        )}
      </motion.div>
  );
}

