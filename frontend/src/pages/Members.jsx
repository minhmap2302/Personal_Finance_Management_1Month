
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
  XCircle,
  Crown,
} from 'lucide-react';
import UserAvatar from '../components/UserAvatar';
import { useAuth } from '../context/AuthContext';
import { useFamily } from '../context/FamilyContext';
import { familyApi, getErrorMessage } from '../services/familyFinanceApi';
import { useToast } from '../context/ToastContext';

const roleMeta = {
  OWNER: { label: 'Chủ gia đình', className: 'bg-amber-100 text-amber-800' },
  MANAGER: { label: 'Quản lý', className: 'bg-sky-100 text-sky-800' },
  MEMBER: { label: 'Thành viên', className: 'bg-slate-100 text-slate-700' },
};

const dateLabel = (value) =>
    value
        ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(new Date(value))
        : '—';

const getPageRows = (data) =>
    Array.isArray(data) ? data : data?.content || [];

function ConfirmDialog({ title, description, onConfirm, onCancel, busy, danger = true }) {
  return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm">
        <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        >
          <h3 className="text-lg font-extrabold text-slate-900">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>

          <div className="mt-6 flex justify-end gap-2">
            <button
                onClick={onCancel}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"
            >
              Hủy
            </button>

            <button
                onClick={onConfirm}
                disabled={busy}
                className={`rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50 ${
                    danger
                        ? 'bg-rose-600 hover:bg-rose-700'
                        : 'bg-emerald-700 hover:bg-emerald-800'
                }`}
            >
              {busy ? 'Đang xử lý…' : 'Xác nhận'}
            </button>
          </div>
        </div>
      </div>
  );
}

export default function Members() {
  const { user } = useAuth();
  const { activeFamily, activeFamilyId, refreshFamilies } = useFamily();
  const toast = useToast();

  const [members, setMembers] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [loading, setLoading] = useState(false);
  const [incomingLoading, setIncomingLoading] = useState(false);
  const [error, setError] = useState('');
  const setNotice = useCallback((notice) => {
    if (notice?.text) toast(notice.text, notice.type || 'info');
  }, [toast]);
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
  }, []);

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
              row.userId === target.userId
                  ? { ...row, alreadyInvited: true }
                  : row
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
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-6xl space-y-6"
      >
        {/* Tiêu đề trang */}
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-700">
              {activeFamily?.name || 'Không gian gia đình'}
            </p>

            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
              Thành viên & lời mời
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Quản lý những người cùng tham gia và các lời mời bạn nhận được.
            </p>
          </div>

          {activeFamilyId && (
              <a
                  href="/app/family"
                  className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-emerald-300 hover:text-emerald-700"
              >
                Cài đặt gia đình
              </a>
          )}
        </header>

        {/* Thông báo */}
        {/* Lời mời đến - luôn hiển thị dù chưa có gia đình */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-extrabold text-slate-900">
                Lời mời đang chờ bạn
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Lời mời từ các gia đình khác.
              </p>
            </div>

            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
            {incoming.length} đang chờ
          </span>
          </div>

          {incomingLoading ? (
              <p className="py-6 text-center text-sm text-slate-400">
                Đang tải lời mời…
              </p>
          ) : incoming.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 py-7 text-center">
                <CheckCircle2 size={23} className="mx-auto text-emerald-500" />
                <p className="mt-2 text-sm font-semibold text-slate-700">
                  Bạn không có lời mời nào đang chờ.
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Khi có lời mời mới, chúng sẽ xuất hiện ở đây.
                </p>
              </div>
          ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {incoming.map((invitation) => (
                    <article
                        key={invitation.id}
                        className="rounded-xl border border-amber-100 bg-amber-50/50 p-4"
                    >
                      <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-amber-700">
                    <Users size={18} />
                  </span>

                        <div className="min-w-0 flex-1">
                          <b className="block text-sm text-slate-900">
                            {invitation.familyName}
                          </b>

                          <p className="mt-1 text-xs text-slate-500">
                            Mời bởi{' '}
                            {invitation.invitedByFullName ||
                                invitation.invitedByUsername ||
                                'Thành viên gia đình'}
                          </p>

                          <p className="mt-1 text-[11px] text-slate-400">
                            {dateLabel(invitation.createdAt)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex gap-2">
                        <button
                            onClick={() => acceptInvite(invitation.id)}
                            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800"
                        >
                          <Check size={14} />
                          Chấp nhận
                        </button>

                        <button
                            onClick={() => declineInvite(invitation.id)}
                            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                        >
                          <XCircle size={14} />
                          Từ chối
                        </button>
                      </div>
                    </article>
                ))}
              </div>
          )}
        </section>

        {/* Nội dung phụ thuộc việc người dùng đã tham gia gia đình hay chưa */}
        {activeFamilyId ? (
            <>
              {/* Danh sách thành viên */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-extrabold text-slate-900">
                      Thành viên gia đình
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Danh sách thành viên trong không gian hiện tại.
                    </p>
                  </div>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                {members.length} thành viên
              </span>
                </div>

                <label className="relative mb-4 block max-w-sm">
                  <Search
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      placeholder="Tìm theo tên hoặc username…"
                      className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
                  />
                </label>

                {error && (
                    <p className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      {error}
                    </p>
                )}

                {loading ? (
                    <p className="py-10 text-center text-sm text-slate-400">
                      Đang tải thành viên…
                    </p>
                ) : visibleMembers.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 py-9 text-center text-sm text-slate-500">
                      Không tìm thấy thành viên nào.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[620px] text-left">
                        <thead>
                        <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400">
                          <th className="pb-3 font-bold">Thành viên</th>
                          <th className="pb-3 font-bold">Vai trò</th>
                          <th className="pb-3 font-bold">Ngày tham gia</th>
                          {isOwner && (
                              <th className="pb-3 text-right font-bold">Thao tác</th>
                          )}
                        </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                        {visibleMembers.map((member) => {
                          const role = roleMeta[member.role] || roleMeta.MEMBER;
                          const self =
                              currentUserId != null &&
                              String(currentUserId) === String(member.userId);

                          return (
                              <tr key={member.userId}>
                                <td className="py-3">
                                  <div className="flex items-center gap-3">
                                    <UserAvatar
                                        name={member.fullName || member.username}
                                        size="sm"
                                    />
                                    <span>
                                <b className="block text-sm text-slate-800">
                                  {member.fullName || member.username}
                                  {self && (
                                      <small className="ml-2 font-normal text-emerald-700">
                                        (Bạn)
                                      </small>
                                  )}
                                </b>
                                <small className="text-xs text-slate-400">
                                  @{member.username}
                                </small>
                              </span>
                                  </div>
                                </td>

                                <td className="py-3">
                            <span
                                className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${role.className}`}
                            >
                              {role.label}
                            </span>
                                </td>

                                <td className="py-3 text-xs text-slate-500">
                                  {dateLabel(member.joinedAt)}
                                </td>

                                {isOwner && (
                                    <td className="py-3 text-right">
                                      {!self && member.role !== 'OWNER' && (
                                          <div className="inline-flex gap-1">
                                            <button
                                                title={
                                                  member.role === 'MANAGER'
                                                      ? 'Hạ xuống thành viên'
                                                      : 'Bổ nhiệm quản lý'
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
                                                className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
                                            >
                                              <Shield size={15} />
                                            </button>

                                            <button
                                                title="Chuyển quyền chủ gia đình"
                                                onClick={() =>
                                                    setAction({ type: 'transfer', member })
                                                }
                                                className="rounded-lg border border-amber-200 p-2 text-amber-700 hover:bg-amber-50"
                                            >
                                              <Crown size={15} />
                                            </button>

                                            <button
                                                title="Xóa khỏi gia đình"
                                                onClick={() =>
                                                    setAction({ type: 'remove', member })
                                                }
                                                className="rounded-lg border border-rose-100 p-2 text-rose-600 hover:bg-rose-50"
                                            >
                                              <UserMinus size={15} />
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
                    <p className="mt-3 text-xs text-slate-400">
                      Bạn có quyền xem danh sách thành viên. Chỉ OWNER mới có thể
                      thay đổi vai trò hoặc xóa thành viên.
                    </p>
                )}
              </section>

              {/* Chỉ OWNER và MANAGER mới được mời thành viên */}
              {canInvite && (
                  <section className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/60 p-5 shadow-sm sm:p-6">
                    <div className="mb-4">
                      <h2 className="font-extrabold text-slate-900">
                        Mời thành viên mới
                      </h2>
                      <p className="mt-1 text-xs text-slate-500">
                        Tìm tài khoản bằng username, sau đó gửi lời mời tham gia.
                      </p>
                    </div>

                    <form
                        onSubmit={searchUsers}
                        className="flex flex-col gap-2 sm:flex-row"
                    >
                      <input
                          value={inviteQuery}
                          onChange={(e) => setInviteQuery(e.target.value)}
                          minLength={2}
                          placeholder="Nhập username (ít nhất 2 ký tự)"
                          className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
                      />

                      <button
                          disabled={searching || inviteQuery.trim().length < 2}
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white disabled:opacity-50"
                      >
                        <Search size={16} />
                        {searching ? 'Đang tìm…' : 'Tìm người dùng'}
                      </button>
                    </form>

                    {matches.length > 0 && (
                        <div className="mt-4 divide-y divide-emerald-100 rounded-xl border border-emerald-100 bg-white">
                          {matches.map((target) => (
                              <div
                                  key={target.userId}
                                  className="flex flex-wrap items-center gap-3 p-3"
                              >
                                <UserAvatar
                                    name={target.fullName || target.username}
                                    size="sm"
                                />

                                <span className="min-w-0 flex-1">
                        <b className="block text-sm text-slate-800">
                          {target.fullName || target.username}
                        </b>
                        <small className="text-xs text-slate-400">
                          @{target.username}
                        </small>
                      </span>

                                {target.alreadyInvited ? (
                                    <span className="text-xs font-semibold text-amber-700">
                          Đã gửi lời mời
                        </span>
                                ) : (
                                    <button
                                        disabled={sendingId === target.userId}
                                        onClick={() => sendInvite(target)}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                                    >
                                      <Send size={13} />
                                      {sendingId === target.userId
                                          ? 'Đang gửi…'
                                          : 'Gửi lời mời'}
                                    </button>
                                )}
                              </div>
                          ))}
                        </div>
                    )}

                    {matches.length === 0 &&
                        !searching &&
                        inviteQuery.trim().length >= 2 && (
                            <p className="mt-3 text-xs text-slate-400">
                              Nhập username và chọn “Tìm người dùng” để xem kết quả.
                            </p>
                        )}

                    <p className="mt-4 rounded-xl bg-white/80 p-3 text-xs leading-5 text-slate-500">
                      API backend hiện chỉ nhận{' '}
                      <code className="rounded bg-slate-100 px-1">userId</code> khi
                      gửi lời mời; role của người được mời chưa được chọn ở bước gửi.
                      OWNER có thể điều chỉnh MANAGER/MEMBER sau khi người đó chấp
                      nhận lời mời.
                    </p>
                  </section>
              )}

              {!canInvite && (
                  <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                    Vai trò {roleMeta[currentRole]?.label || currentRole} không có
                    quyền gửi lời mời thành viên.
                  </p>
              )}
            </>
        ) : (
            <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center shadow-sm">
              <Users size={28} className="mx-auto text-slate-300" />
              <h2 className="mt-3 font-bold text-slate-800">
                Bạn chưa tham gia gia đình nào
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Bạn vẫn có thể xem và chấp nhận lời mời ở phía trên. Sau khi tham
                gia gia đình, danh sách thành viên và chức năng mời người khác sẽ
                xuất hiện tại đây.
              </p>
              <a
                  href="/app/family"
                  className="mt-4 inline-flex rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white"
              >
                Tạo gia đình mới
              </a>
            </section>
        )}

        {action && (
            <ConfirmDialog
                title={
                  action.type === 'remove'
                      ? 'Xóa thành viên khỏi gia đình?'
                      : action.type === 'transfer'
                          ? 'Chuyển quyền chủ gia đình?'
                          : 'Thay đổi vai trò thành viên?'
                }
                description={
                  action.type === 'remove'
                      ? `Bạn sẽ xóa ${
                          action.member.fullName || action.member.username
                      } khỏi gia đình ${activeFamily?.name}.`
                      : action.type === 'transfer'
                          ? `Bạn sẽ chuyển quyền OWNER cho ${
                              action.member.fullName || action.member.username
                          }. Sau đó vai trò của bạn sẽ là MANAGER.`
                          : `Đổi vai trò của ${
                              action.member.fullName || action.member.username
                          } thành ${
                              action.role === 'MANAGER' ? 'Quản lý' : 'Thành viên'
                          }?`
                }
                onCancel={() => setAction(null)}
                onConfirm={performAction}
                busy={actionBusy}
            />
        )}
      </motion.div>
  );
}
