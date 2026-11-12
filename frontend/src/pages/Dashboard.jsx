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
const toLocalDateString = date => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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
  const [loading, setLoading] = useState(true);

  const selected = useMemo(() => {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() + monthOffset);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return {
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
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [dashboardData, categoriesResult, transactionsResult, goalsResult, recentResult] = await Promise.all([
        dashboardApi.get(activeFamilyId, {
          startDate: selected.startDate,
          endDate: selected.endDate,
        }),
        categoryApi.list(activeFamilyId, 'EXPENSE').catch(() => null),
        loadExpenseTransactions(activeFamilyId, selected.startDate, selected.endDate).catch(() => []),
        savingApi.list(activeFamilyId, { page: 0, size: 50, sort: 'createdAt,desc' }).catch(() => []),
        transactionApi.list(activeFamilyId, { page: 0, size: 6, sort: 'transactionDate,desc' }).catch(() => []),
      ]);
      setData(dashboardData);
      setAllCategories(asList(categoriesResult).filter(category => category.active !== false));
      setExpenseTransactions(transactionsResult);
      setSavingGoals(asList(goalsResult).filter(goal => String(goal.status || 'ACTIVE').toUpperCase() === 'ACTIVE'));
      setRecentTransactions(asList(recentResult).slice(0, 6));
    } catch (error) {
      toast(error?.response?.data?.message || 'Không thể tải dữ liệu tổng quan.', 'error');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [activeFamilyId, selected, toast]);

  useEffect(() => { load(); }, [load]);

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

  const budget = data?.budgetAndSavings?.budget || data?.budget || null;
  const rawCategories = overview.expenseByCategory || data?.expenseByCategory || [];
  const budgetTotal = Number(budget?.totalAmount ?? budget?.amount ?? budget?.limitAmount ?? 0);
  const budgetUsed = Number(budget?.used ?? budget?.spent ?? budget?.spentAmount ?? budget?.usedAmount ?? 0);
  const pct = Number(budget?.usedPercent ?? budget?.usagePercent ?? (budgetTotal > 0 ? budgetUsed / budgetTotal * 100 : 0));
  const budgetSaved = Number(budget?.saved ?? budget?.savedAmount ?? 0);
  const budgetSpent = Number(budget?.spent ?? budget?.spentAmount ?? budget?.expenseAmount ?? 0);
  const budgetRemaining = Number(budget?.remaining ?? budget?.remainingAmount ?? budgetTotal - budgetUsed);
  const tone = alertTone(budget?.alertLevel, pct);
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

  const cards = [
    { title: 'Tổng thu nhập', value: money(summary.totalIncome), icon: ArrowDownRight, theme: 'green', sub: 'Trong kỳ đã chọn' },
    { title: 'Tổng chi tiêu', value: money(summary.totalExpense), icon: ArrowUpRight, theme: 'coral', sub: 'Trong kỳ đã chọn' },
    { title: 'Số dư ròng', value: money(summary.netBalance), icon: Wallet, theme: 'blue', sub: 'Thu nhập trừ chi tiêu' },
    { title: 'Ngân sách đã dùng', value: `${pct.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`, icon: Goal, theme: 'gold', sub: budget ? `${money(budgetUsed)} / ${money(budgetTotal)}` : 'Chưa có ngân sách', progress: pct },
  ];

  return (
    <motion.div className="dashboard-page" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
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
                <div><h3>Ngân sách hiện tại</h3><p>Theo dõi hạn mức gia đình đang áp dụng</p></div>
                <a className="text-link" href="/app/budgets">Chi tiết <ArrowUpRight size={15} /></a>
              </div>
              {budget ? (
                <>
                  <div className="pfm-budget-hero">
                    <div>
                      <small>TỔNG HẠN MỨC</small>
                      <strong>{money(budgetTotal)}</strong>
                      <span className={`pfm-budget-state ${tone}`}>{tone === 'danger' ? 'Vượt ngân sách' : tone === 'warning' ? 'Sắp chạm hạn mức' : 'Trong hạn mức'}</span>
                    </div>
                    <div className="pfm-budget-percent" style={{ background: `conic-gradient(#10b981 ${Math.min(100, Math.max(0, pct)) * 3.6}deg, #e5f3e9 0deg)` }}>
                      <b>{pct.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%</b>
                      <small>đã sử dụng</small>
                    </div>
                  </div>
                  <Progress value={pct} status={tone} />
                  <div className="pfm-budget-stats">
                    <div><small><i className="spent-dot" /> Đã chi</small><b>{money(budgetSpent)}</b></div>
                    <div><small><i className="saved-dot" /> Đã tiết kiệm</small><b>{money(budgetSaved)}</b></div>
                    <div><small><i className="remaining-dot" /> Còn lại</small><b className={budgetRemaining < 0 ? 'pfm-negative' : ''}>{money(budgetRemaining)}</b></div>
                  </div>
                  <p className="pfm-budget-caption">Ngân sách đã dùng bao gồm chi tiêu và các khoản đóng góp tiết kiệm. Ngân sách con chỉ tính chi tiêu theo danh mục.</p>
                </>
              ) : <EmptyState title="Chưa có ngân sách hiện tại" description="Tạo ngân sách tổng để theo dõi hạn mức chi tiêu của gia đình." />}
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
                <div><h3>Giao dịch gần đây</h3><p>Các khoản thu chi mới nhất của gia đình</p></div>
                <a className="text-link" href="/app/transactions">Xem tất cả <ArrowUpRight size={15}/></a>
              </div>
              {recentTransactions.length === 0 ? (
                <EmptyState title="Chưa có giao dịch gần đây" description="Các giao dịch mới sẽ xuất hiện tại đây."/>
              ) : (
                <div className="pfm-dashboard-recent-list">
                  {recentTransactions.map(transaction => {
                    const type = String(transaction.type || transaction.transactionType || 'EXPENSE').toUpperCase();
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

          <div className="dashboard-bottom-note">
            <span><span className="live-dot" /> Dữ liệu được tải từ backend</span>
            <span>Cập nhật khi chuyển gia đình hoặc kỳ báo cáo</span>
          </div>
        </>
      )}
    </motion.div>
  );
}
