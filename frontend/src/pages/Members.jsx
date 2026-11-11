import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Check,
  CheckCircle2,
  Search,
  Send,
  Shield,
  UserMinus,
  Users,
  X,
  Crown,
  Mail,
  UserPlus,
  ArrowRight,
  Clock,
  Settings,
  AlertCircle,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import UserAvatar from '../components/UserAvatar';
import { Button, Badge, Card, Input, ConfirmDialog } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useFamily } from '../context/FamilyContext';
import { familyApi, getErrorMessage } from '../services/familyFinanceApi';
import { useToast } from '../context/ToastContext';

const roleMeta = {
  OWNER: { label: 'Chủ gia đình', variant: 'amber', icon: Crown },
  MANAGER: { label: 'Quản lý', variant: 'sky', icon: Shield },
  MEMBER: { label: 'Thành viên', variant: 'slate', icon: null },
};

const dateLabel = (value) =>
  value
    ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(new Date(value))
    : '—';

const getPageRows = (data) =>
  Array.isArray(data) ? data : data?.content || [];

export default function Members() {
  const { user } = useAuth();
  const { activeFamily, activeFamilyId, refreshFamilies } = useFamily();
  const toast = useToast();

  const [members, setMembers] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [loading, setLoading] = useState(false);
  const [incomingLoading, setIncomingLoading] = useState(false);
  const [error, setError] = useState('');
  const setNotice = useCallback(
    (notice) => {
      if (notice?.text) toast(notice.text, notice.type || 'info');
    },
    [toast]
  );
  const [keyword, setKeyword] = useState('');
  const [inviteQuery, setInviteQuery] = useState('');
  const [matches, setMatches] = useState([]);
  const [searching, setSearching] = useState(false);
  const [sendingId, setSendingId] = useState(null);
  const [action, setAction] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);

  const currentRole = activeFamily?.myRole;
  const isOwner = currentRole === 'OWNER';
  const canInvite = isOwner || currentRole === 'MANAGER';
  const currentUserId = user?.id ?? user?.userId;

  // Tải danh sách thành viên của gia đình đang chọn.
  const loadMembers = useCallback(async () => {
    if (!activeFamilyId) {
      setMembers([]);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await familyApi.members(activeFamilyId, {
        page: 0,
        size: 50,
        keyword: keyword.trim() || undefined,
      });

      setMembers(getPageRows(data));
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể tải danh sách thành viên.'));
    } finally {
      setLoading(false);
    }
  }, [activeFamilyId, keyword]);

  // Lời mời phải được tải kể cả khi người dùng chưa có gia đình.
  const loadIncoming = useCallback(async () => {
    setIncomingLoading(true);

    try {
      const data = await familyApi.myInvitations('PENDING');
      setIncoming(getPageRows(data));
    } catch (err) {
      setNotice({
        type: 'error',
        text: getErrorMessage(err, 'Không thể tải lời mời đang chờ.'),
      });
    } finally {
      setIncomingLoading(false);
    }
  }, [setNotice]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    loadIncoming();
  }, [loadIncoming]);

  const visibleMembers = useMemo(() => members, [members]);

  // Chấp nhận lời mời.
  async function acceptInvite(invitationId) {
    try {
      await familyApi.acceptInvitation(invitationId);

      setNotice({
        type: 'success',
        text: 'Đã chấp nhận lời mời gia đình.',
      });

      await Promise.all([loadIncoming(), refreshFamilies()]);
    } catch (err) {
      setNotice({
        type: 'error',
        text: getErrorMessage(err, 'Không thể chấp nhận lời mời.'),
      });
    }
  }

  // Từ chối lời mời.
  async function declineInvite(invitationId) {
    try {
      await familyApi.declineInvitation(invitationId);

      setNotice({
        type: 'success',
        text: 'Đã từ chối lời mời.',
      });

      await loadIncoming();
    } catch (err) {
      setNotice({
        type: 'error',
        text: getErrorMessage(err, 'Không thể từ chối lời mời.'),
      });
    }
  }

  // Tìm người dùng để mời vào gia đình.
  async function searchUsers(event) {
    event.preventDefault();

    if (!activeFamilyId || inviteQuery.trim().length < 2) {
      setNotice({
        type: 'error',
        text: 'Nhập ít nhất 2 ký tự username để tìm người dùng.',
      });
      return;
    }

    setSearching(true);
    setMatches([]);
    setNotice(null);

    try {
      const data = await familyApi.searchUsers(activeFamilyId, inviteQuery.trim());
      setMatches(getPageRows(data));
    } catch (err) {
      setNotice({
        type: 'error',
        text: getErrorMessage(err, 'Không thể tìm người dùng.'),
      });
    } finally {
      setSearching(false);
    }
  }

  // Gửi lời mời.
  async function sendInvite(target) {
    setSendingId(target.userId);

    try {
      await familyApi.sendInvitation(activeFamilyId, target.userId);

      setNotice({
        type: 'success',
        text: `Đã gửi lời mời tới @${target.username}.`,
      });

      setMatches((rows) =>
        rows.map((row) =>
          row.userId === target.userId ? { ...row, alreadyInvited: true } : row
        )
      );
    } catch (err) {
      setNotice({
        type: 'error',
        text: getErrorMessage(err, 'Không thể gửi lời mời.'),
      });
    } finally {
      setSendingId(null);
    }
  }

  // Xóa thành viên, đổi vai trò hoặc chuyển quyền OWNER.
  async function performAction() {
    if (!action || !activeFamilyId) return;

    setActionBusy(true);

    try {
      if (action.type === 'remove') {
        await familyApi.removeMember(activeFamilyId, action.member.userId);
      } else if (action.type === 'transfer') {
        await familyApi.transferOwnership(activeFamilyId, action.member.userId);
      } else {
        await familyApi.updateMemberRole(
          activeFamilyId,
          action.member.userId,
          action.role
        );
      }

      setNotice({
        type: 'success',
        text:
          action.type === 'remove'
            ? 'Đã xóa thành viên khỏi gia đình.'
            : action.type === 'transfer'
            ? `Đã chuyển quyền chủ gia đình cho ${
                action.member.fullName || action.member.username
              }.`
            : 'Đã cập nhật vai trò thành viên.',
      });

      setAction(null);

      await Promise.all([loadMembers(), refreshFamilies()]);
    } catch (err) {
      setNotice({
        type: 'error',
        text: getErrorMessage(err, 'Không thể cập nhật thành viên.'),
      });
    } finally {
      setActionBusy(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      {/* Tiêu đề trang */}
      <PageHeader
        title="Thành viên & Lời mời"
        subtitle={
          activeFamily
            ? `Không gian: ${activeFamily.name} • Quản lý các thành viên và quyền hạn trong gia đình`
            : 'Quản lý các thành viên và phản hồi các lời mời gia đình'
        }
        breadcrumbs={[
          { label: 'Gia đình', href: '/app/family' },
          { label: 'Thành viên & Lời mời' },
        ]}
        badge="FinHome V3"
        action={
          activeFamilyId ? (
            <Button
              variant="outline"
              size="sm"
              icon={Settings}
              onClick={() => {
                window.location.href = '/app/family';
              }}
            >
              Cài đặt không gian
            </Button>
          ) : null
        }
      />

      {/* Lời mời đến - Luôn hiển thị dù chưa có gia đình */}
      <Card
        className="border-amber-200/60 dark:border-amber-900/40 bg-gradient-to-br from-white via-amber-50/20 to-white dark:from-slate-900 dark:via-amber-950/10 dark:to-slate-900"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 grid place-items-center shrink-0 border border-amber-200/40 dark:border-amber-800/40">
              <Mail size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Lời mời gia đình đang chờ bạn
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Các lời mời từ gia đình khác cần bạn phản hồi.
              </p>
            </div>
          </div>

          <Badge variant="amber" size="md" dot>
            {incoming.length} lời mời
          </Badge>
        </div>

        {incomingLoading ? (
          <div className="py-8 text-center text-sm text-slate-400">
            <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-amber-500 border-t-transparent mb-2" />
            <p>Đang tải lời mời…</p>
          </div>
        ) : incoming.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 py-8 text-center bg-white/60 dark:bg-slate-900/40">
            <CheckCircle2 size={24} className="mx-auto text-emerald-500 mb-2" />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Bạn không có lời mời nào đang chờ
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Khi ai đó mời bạn vào không gian tài chính của họ, bạn sẽ thấy ở đây.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {incoming.map((invitation) => (
              <div
                key={invitation.id}
                className="rounded-xl border border-amber-200/70 dark:border-amber-900/50 bg-white/90 dark:bg-slate-900/90 p-4 shadow-sm hover:border-amber-300 dark:hover:border-amber-800 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 grid place-items-center shrink-0 border border-amber-200/50 dark:border-amber-800/40">
                    <Users size={18} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                      {invitation.familyName}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      Mời bởi{' '}
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {invitation.invitedByFullName ||
                          invitation.invitedByUsername ||
                          'Thành viên gia đình'}
                      </span>
                    </p>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 mt-1 tabular-nums">
                      <Clock size={12} />
                      <span>{dateLabel(invitation.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    variant="primary"
                    size="sm"
                    className="flex-1"
                    icon={Check}
                    onClick={() => acceptInvite(invitation.id)}
                  >
                    Chấp nhận
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    icon={X}
                    onClick={() => declineInvite(invitation.id)}
                  >
                    Từ chối
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Nội dung khi đã chọn hoặc chưa chọn gia đình */}
      {activeFamilyId ? (
        <div className="space-y-6">
          {/* Card Danh sách thành viên */}
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Thành viên trong không gian
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Danh sách những người đang cùng theo dõi thu chi trong không gian này.
                </p>
              </div>

              <Badge variant="emerald" size="md">
                {members.length} thành viên
              </Badge>
            </div>

            {/* Thanh tìm kiếm thành viên */}
            <div className="max-w-md mb-4">
              <Input
                placeholder="Tìm theo họ tên hoặc @username…"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                icon={Search}
                clearable
                onClear={() => setKeyword('')}
              />
            </div>

            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-900/50">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {loading ? (
              <div className="py-12 text-center text-sm text-slate-400">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent mb-2" />
                <p>Đang tải danh sách thành viên…</p>
              </div>
            ) : visibleMembers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                Không tìm thấy thành viên nào phù hợp với từ khóa.
              </div>
            ) : (
              <div className="overflow-x-auto -mx-5 px-5 sm:mx-0 sm:px-0">
                <table className="w-full min-w-[580px] text-left">
                  <thead>
                    <tr className="border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      <th className="pb-3 pl-1">Thành viên</th>
                      <th className="pb-3">Vai trò</th>
                      <th className="pb-3">Ngày tham gia</th>
                      {isOwner && <th className="pb-3 text-right pr-1">Thao tác</th>}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {visibleMembers.map((member) => {
                      const meta = roleMeta[member.role] || roleMeta.MEMBER;
                      const self =
                        currentUserId != null &&
                        String(currentUserId) === String(member.userId);

                      return (
                        <tr
                          key={member.userId}
                          className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors group"
                        >
                          <td className="py-3.5 pl-1">
                            <div className="flex items-center gap-3">
                              <UserAvatar
                                name={member.fullName || member.username}
                                size="md"
                              />
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
                                    {member.fullName || member.username}
                                  </span>
                                  {self && (
                                    <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/50 rounded px-1.5 py-0.2">
                                      Bạn
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                                  @{member.username}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5">
                            <Badge
                              variant={meta.variant}
                              size="sm"
                              icon={meta.icon}
                              dot={member.role === 'OWNER'}
                            >
                              {meta.label}
                            </Badge>
                          </td>

                          <td className="py-3.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                            {dateLabel(member.joinedAt)}
                          </td>

                          {isOwner && (
                            <td className="py-3.5 text-right pr-1">
                              {!self && member.role !== 'OWNER' && (
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    title={
                                      member.role === 'MANAGER'
                                        ? 'Chuyển về Thành viên'
                                        : 'Thăng cấp Quản lý'
                                    }
                                    onClick={() =>
                                      setAction({
                                        type: 'role',
                                        member,
                                        role:
                                          member.role === 'MANAGER'
                                            ? 'MEMBER'
                                            : 'MANAGER',
                                      })
                                    }
                                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 hover:border-sky-300 dark:hover:border-sky-700 transition-colors"
                                  >
                                    <Shield size={14} />
                                  </button>

                                  <button
                                    type="button"
                                    title="Chuyển quyền Chủ gia đình (OWNER)"
                                    onClick={() =>
                                      setAction({ type: 'transfer', member })
                                    }
                                    className="p-1.5 rounded-lg border border-amber-200 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 hover:bg-amber-100/70 transition-colors"
                                  >
                                    <Crown size={14} />
                                  </button>

                                  <button
                                    type="button"
                                    title="Xóa thành viên khỏi gia đình"
                                    onClick={() =>
                                      setAction({ type: 'remove', member })
                                    }
                                    className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100/60 transition-colors"
                                  >
                                    <UserMinus size={14} />
                                  </button>
                                </div>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {!isOwner && (
              <p className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 text-xs text-slate-400 dark:text-slate-500">
                Ghi chú: Bạn đang xem với vai trò {roleMeta[currentRole]?.label || currentRole}. Chỉ Chủ gia đình (OWNER) mới có quyền phân quyền hoặc xóa thành viên.
              </p>
            )}
          </Card>

          {/* Card Mời thành viên mới (chỉ hiện cho OWNER và MANAGER) */}
          {canInvite ? (
            <Card className="border-emerald-200/70 dark:border-emerald-900/50 bg-gradient-to-br from-white via-emerald-50/25 to-white dark:from-slate-900 dark:via-emerald-950/10 dark:to-slate-900">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 grid place-items-center shrink-0 border border-emerald-200/60 dark:border-emerald-800/50">
                  <UserPlus size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Mời thành viên mới
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Tìm kiếm theo @username tài khoản để gửi lời mời tham gia không gian này.
                  </p>
                </div>
              </div>

              <form onSubmit={searchUsers} className="flex flex-col sm:flex-row gap-2.5">
                <div className="flex-1">
                  <Input
                    value={inviteQuery}
                    onChange={(e) => setInviteQuery(e.target.value)}
                    placeholder="Nhập chính xác username (tối thiểu 2 ký tự)…"
                    icon={Search}
                  />
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  icon={Search}
                  loading={searching}
                  disabled={searching || inviteQuery.trim().length < 2}
                >
                  {searching ? 'Đang tìm…' : 'Tìm người dùng'}
                </Button>
              </form>

              {/* Kết quả tìm kiếm */}
              {matches.length > 0 && (
                <div className="mt-4 rounded-xl border border-emerald-200/60 dark:border-emerald-900/40 bg-white/80 dark:bg-slate-900/80 divide-y divide-emerald-100 dark:divide-slate-800 overflow-hidden shadow-xs">
                  {matches.map((target) => (
                    <div
                      key={target.userId}
                      className="flex flex-wrap items-center justify-between gap-3 p-3 hover:bg-emerald-50/30 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <UserAvatar
                          name={target.fullName || target.username}
                          size="md"
                        />
                        <div className="min-w-0">
                          <span className="block font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                            {target.fullName || target.username}
                          </span>
                          <span className="block text-xs text-slate-400 dark:text-slate-500 font-mono truncate">
                            @{target.username}
                          </span>
                        </div>
                      </div>

                      {target.alreadyInvited ? (
                        <Badge variant="amber" size="sm">
                          Đã gửi lời mời
                        </Badge>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          icon={Send}
                          loading={sendingId === target.userId}
                          disabled={sendingId === target.userId}
                          onClick={() => sendInvite(target)}
                        >
                          {sendingId === target.userId ? 'Đang gửi…' : 'Gửi lời mời'}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {matches.length === 0 && !searching && inviteQuery.trim().length >= 2 && (
                <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
                  Nhập username và bấm "Tìm người dùng" để kiểm tra tài khoản.
                </p>
              )}

              <div className="mt-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 p-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400 border border-slate-200/50 dark:border-slate-800">
                <p>
                  💡 <strong>Quy trình phân quyền:</strong> Người được mời sẽ gia nhập với vai trò mặc định là <strong>Thành viên (MEMBER)</strong>. Sau khi họ chấp nhận lời mời, Chủ gia đình (OWNER) có thể nâng quyền lên <strong>Quản lý (MANAGER)</strong> bất cứ lúc nào.
                </p>
              </div>
            </Card>
          ) : (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4 text-xs text-slate-500 dark:text-slate-400">
              Vai trò <strong className="text-slate-700 dark:text-slate-200">{roleMeta[currentRole]?.label || currentRole}</strong> chỉ có quyền xem thành viên, không có quyền gửi lời mời thành viên mới.
            </div>
          )}
        </div>
      ) : (
        /* Trạng thái chưa tham gia không gian nào */
        <Card className="text-center py-12">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800 grid place-items-center text-slate-400 dark:text-slate-500 mb-3">
            <Users size={24} />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            Bạn chưa chọn hoặc chưa tham gia không gian gia đình nào
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            Bạn vẫn có thể nhận và chấp nhận các lời mời ở danh sách phía trên. Hoặc bạn có thể tạo một không gian mới để bắt đầu quản lý tài chính cùng người thân.
          </p>
          <div className="mt-5">
            <Button
              variant="primary"
              icon={ArrowRight}
              onClick={() => {
                window.location.href = '/app/family';
              }}
            >
              Đi đến Quản lý Gia đình
            </Button>
          </div>
        </Card>
      )}

      {/* Hộp thoại xác nhận các thao tác: remove, transfer, role */}
      {action && (
        <ConfirmDialog
          isOpen={Boolean(action)}
          title={
            action.type === 'remove'
              ? 'Xóa thành viên khỏi gia đình?'
              : action.type === 'transfer'
              ? 'Chuyển quyền Chủ gia đình (OWNER)?'
              : 'Thay đổi vai trò thành viên?'
          }
          description={
            action.type === 'remove'
              ? `Bạn có chắc chắn muốn xóa "${
                  action.member.fullName || action.member.username
                }" (@${action.member.username}) khỏi không gian "${
                  activeFamily?.name
                }"? Họ sẽ mất quyền truy cập toàn bộ dữ liệu thu chi của gia đình.`
              : action.type === 'transfer'
              ? `Bạn sẽ chuyển vai trò OWNER cao nhất cho "${
                  action.member.fullName || action.member.username
                }". Sau khi chuyển, bạn sẽ trở thành Quản lý (MANAGER) và không thể tự lấy lại quyền OWNER.`
              : `Bạn muốn đổi vai trò của "${
                  action.member.fullName || action.member.username
                }" thành ${
                  action.role === 'MANAGER' ? 'Quản lý (MANAGER)' : 'Thành viên (MEMBER)'
                }?`
          }
          confirmText={
            action.type === 'remove'
              ? 'Xóa thành viên'
              : action.type === 'transfer'
              ? 'Xác nhận chuyển quyền'
              : 'Cập nhật vai trò'
          }
          variant={action.type === 'remove' ? 'danger' : action.type === 'transfer' ? 'warning' : 'primary'}
          icon={
            action.type === 'remove'
              ? UserMinus
              : action.type === 'transfer'
              ? Crown
              : Shield
          }
          busy={actionBusy}
          onConfirm={performAction}
          onClose={() => setAction(null)}
        />
      )}
    </motion.div>
  );
}
