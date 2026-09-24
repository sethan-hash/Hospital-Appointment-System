import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { adminService } from '../../services/adminService';
import { Button } from '../../components/common/Button';
import { Icon } from '../../components/common/Icon';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Modal } from '../../components/common/Modal';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ROLE_OPTIONS = [
  { label: 'All Roles', value: '' },
  { label: 'Patient', value: 'PATIENT' },
  { label: 'Doctor', value: 'DOCTOR' },
  { label: 'Receptionist', value: 'RECEPTIONIST' },
  { label: 'Admin', value: 'ADMIN' },
];

const STATUS_OPTIONS = [
  { label: 'All Statuses', value: '' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Inactive', value: 'INACTIVE' },
  { label: 'Suspended', value: 'SUSPENDED' },
];

const ROLE_ICON = {
  PATIENT: 'person',
  DOCTOR: 'stethoscope',
  RECEPTIONIST: 'badge',
  ADMIN: 'admin_panel_settings',
};

const ROLE_COLOR = {
  PATIENT: 'bg-primary/10 text-primary',
  DOCTOR: 'bg-secondary/10 text-secondary',
  RECEPTIONIST: 'bg-tertiary/10 text-tertiary',
  ADMIN: 'bg-error/10 text-error',
};

function userStatusVariant(status) {
  if (status === 'ACTIVE') return 'completed';
  if (status === 'INACTIVE') return 'cancelled';
  if (status === 'SUSPENDED') return 'pending';
  return 'default';
}

function userInitials(fullName = '') {
  return fullName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] || '')
    .join('')
    .toUpperCase();
}

function ProfileSubline({ user }) {
  if (user.role === 'DOCTOR' && user.profile) {
    return (
      <span className="text-xs text-on-surface-variant truncate">
        {user.profile.specialization} • {user.profile.department}
      </span>
    );
  }
  if (user.role === 'PATIENT' && user.profile) {
    return (
      <span className="text-xs text-on-surface-variant truncate">
        {user.profile.gender} • {user.profile.city}
      </span>
    );
  }
  return null;
}

// ---------------------------------------------------------------------------
// Confirm status change modal
// ---------------------------------------------------------------------------
function StatusConfirmModal({ isOpen, onClose, onConfirm, user, newStatus, loading }) {
  if (!user) return null;

  const isDeactivating = newStatus !== 'ACTIVE';
  const actionLabel = newStatus === 'ACTIVE' ? 'Activate' : newStatus === 'INACTIVE' ? 'Deactivate' : 'Suspend';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${actionLabel} Account`} maxWidth="max-w-sm">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-container border border-outline-variant/20">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${ROLE_COLOR[user.role] || 'bg-primary/10 text-primary'}`}
          >
            {userInitials(user.fullName)}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-on-surface truncate">{user.fullName}</p>
            <p className="text-xs text-on-surface-variant truncate">{user.email}</p>
          </div>
        </div>

        <p className="text-sm text-on-surface-variant">
          {isDeactivating
            ? `This will set the account to "${newStatus}" and the user will immediately lose API access. Continue?`
            : 'This will restore API access for this user. Continue?'}
        </p>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant={isDeactivating ? 'primary' : 'primary'}
            size="sm"
            loading={loading}
            onClick={onConfirm}
            className={isDeactivating ? 'bg-error text-on-error hover:bg-error/90' : ''}
          >
            {actionLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export function AdminUsersPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Status update modal state
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    user: null,
    newStatus: '',
  });
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState(null);
  const [statusSuccess, setStatusSuccess] = useState(null);

  // Debounce search input
  const debounceTimer = useRef(null);

  const fetchUsers = useCallback(
    async ({ searchVal, roleVal, statusVal } = {}) => {
      setLoading(true);
      setError(null);
      try {
        const data = await adminService.getUsers({
          search: searchVal ?? search,
          role: roleVal ?? roleFilter,
          status: statusVal ?? statusFilter,
        });
        setUsers(data.users);
        setTotal(data.total);
      } catch (err) {
        setError(err.message || 'Failed to load users.');
      } finally {
        setLoading(false);
      }
    },
    [search, roleFilter, statusFilter]
  );

  // Initial load
  useEffect(() => {
    fetchUsers({ searchVal: '', roleVal: '', statusVal: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced search
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      fetchUsers({ searchVal: val });
    }, 350);
  };

  const handleRoleChange = (e) => {
    const val = e.target.value;
    setRoleFilter(val);
    fetchUsers({ roleVal: val });
  };

  const handleStatusChange = (e) => {
    const val = e.target.value;
    setStatusFilter(val);
    fetchUsers({ statusVal: val });
  };

  const handleRefresh = () => fetchUsers();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Open status confirm modal
  const openStatusModal = (user, newStatus) => {
    setStatusError(null);
    setStatusSuccess(null);
    setConfirmModal({ open: true, user, newStatus });
  };

  const closeStatusModal = () => {
    if (!statusLoading) {
      setConfirmModal({ open: false, user: null, newStatus: '' });
    }
  };

  const handleStatusConfirm = async () => {
    const { user, newStatus } = confirmModal;
    setStatusLoading(true);
    setStatusError(null);
    setStatusSuccess(null);
    try {
      await adminService.updateUserStatus(user.id, newStatus);
      setStatusSuccess(`${user.fullName}'s account set to ${newStatus}.`);
      // Optimistically update local list
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u))
      );
      setConfirmModal({ open: false, user: null, newStatus: '' });
    } catch (err) {
      setStatusError(err.message || 'Failed to update status.');
    } finally {
      setStatusLoading(false);
    }
  };

  // Dismiss transient success/error banners
  useEffect(() => {
    if (!statusSuccess) return;
    const t = setTimeout(() => setStatusSuccess(null), 4000);
    return () => clearTimeout(t);
  }, [statusSuccess]);

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* ------------------------------------------------------------------ */}
      {/* Header */}
      {/* ------------------------------------------------------------------ */}
      <header className="h-16 border-b border-outline-variant/20 px-6 flex items-center justify-between bg-surface-container-lowest shadow-sm">
        <div className="flex items-center gap-2 text-primary font-bold text-lg">
          <Icon name="admin_panel_settings" filled={true} className="text-2xl" />
          <span>MedLink Care — Admin Portal</span>
        </div>
        <Button variant="outline" size="sm" onClick={handleLogout}>
          Sign Out
        </Button>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-10 flex flex-col gap-6">
        {/* ------------------------------------------------------------------ */}
        {/* Page header + breadcrumb nav */}
        {/* ------------------------------------------------------------------ */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <nav className="flex items-center gap-1.5 text-xs text-on-surface-variant mb-1">
              <Link to="/admin/dashboard" className="hover:text-primary transition-colors">
                Dashboard
              </Link>
              <Icon name="chevron_right" className="text-base opacity-50" />
              <span className="text-on-surface font-medium">User Management</span>
            </nav>
            <h1 className="text-2xl font-bold text-on-surface flex items-center gap-2">
              <Icon name="manage_accounts" className="text-primary text-2xl" />
              <span>User Management</span>
            </h1>
            <p className="text-sm text-on-surface-variant mt-0.5">
              View, search, and manage all platform accounts.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            <Icon name="refresh" className={`text-base mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Status banners */}
        {/* ------------------------------------------------------------------ */}
        {statusSuccess && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#e8f5e9] border border-[#a5d6a7] text-[#2e7d32] text-sm">
            <Icon name="check_circle" className="text-lg shrink-0" />
            {statusSuccess}
          </div>
        )}
        {statusError && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-error-container/20 border border-error/30 text-error text-sm">
            <Icon name="error" className="text-lg shrink-0" />
            {statusError}
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* Filter bar */}
        {/* ------------------------------------------------------------------ */}
        <div className="bg-surface-container-low rounded-2xl border border-outline-variant/20 p-4 flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              id="admin-user-search"
              placeholder="Search by name or email…"
              iconLeading="search"
              value={search}
              onChange={handleSearchChange}
            />
          </div>
          <div className="w-full sm:w-44">
            <Select
              id="admin-role-filter"
              placeholder=""
              options={ROLE_OPTIONS}
              value={roleFilter}
              onChange={handleRoleChange}
            />
          </div>
          <div className="w-full sm:w-44">
            <Select
              id="admin-status-filter"
              placeholder=""
              options={STATUS_OPTIONS}
              value={statusFilter}
              onChange={handleStatusChange}
            />
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Results count */}
        {/* ------------------------------------------------------------------ */}
        {!loading && !error && (
          <p className="text-sm text-on-surface-variant -mt-2">
            Showing <span className="font-semibold text-on-surface">{users.length}</span>{' '}
            {users.length !== total ? `of ${total} ` : ''}
            user{users.length !== 1 ? 's' : ''}
            {search || roleFilter || statusFilter ? ' matching filters' : ''}
          </p>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* Loading state */}
        {/* ------------------------------------------------------------------ */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant gap-3">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">Loading users…</p>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* Error state */}
        {/* ------------------------------------------------------------------ */}
        {!loading && error && (
          <div className="bg-error-container/20 border border-error/30 rounded-2xl p-6 text-center flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-error/10 text-error flex items-center justify-center">
              <Icon name="error" className="text-2xl" />
            </div>
            <h3 className="text-lg font-bold text-on-surface">Unable to Load Users</h3>
            <p className="text-on-surface-variant max-w-md text-sm">{error}</p>
            <Button variant="primary" size="sm" onClick={handleRefresh}>
              Retry
            </Button>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* Empty state */}
        {/* ------------------------------------------------------------------ */}
        {!loading && !error && users.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant gap-3">
            <Icon name="group_off" className="text-5xl opacity-30" />
            <p className="text-base font-medium">No users match your filters.</p>
            <p className="text-sm opacity-70">Try adjusting the search or filter criteria.</p>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* User table */}
        {/* ------------------------------------------------------------------ */}
        {!loading && !error && users.length > 0 && (
          <div className="bg-surface-container-low rounded-2xl border border-outline-variant/20 overflow-hidden">
            {/* Table header — visible on md+ */}
            <div className="hidden md:grid grid-cols-[auto_1fr_1fr_auto_auto] gap-4 px-5 py-3 border-b border-outline-variant/20 bg-surface-container text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
              <span>User</span>
              <span>Email</span>
              <span>Phone</span>
              <span>Status</span>
              <span>Actions</span>
            </div>

            <div className="divide-y divide-outline-variant/10">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="grid grid-cols-1 md:grid-cols-[auto_1fr_1fr_auto_auto] gap-x-4 gap-y-1 items-center px-5 py-4 hover:bg-surface-container/60 transition-colors"
                >
                  {/* Avatar + Name + Role */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${ROLE_COLOR[user.role] || 'bg-primary/10 text-primary'}`}
                    >
                      {userInitials(user.fullName)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-on-surface truncate">{user.fullName}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span
                          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide ${ROLE_COLOR[user.role] || 'bg-primary/10 text-primary'}`}
                        >
                          <Icon name={ROLE_ICON[user.role] || 'person'} className="text-[12px]" />
                          {user.role}
                        </span>
                      </div>
                      <ProfileSubline user={user} />
                    </div>
                  </div>

                  {/* Email */}
                  <p className="text-sm text-on-surface-variant truncate md:pl-1">{user.email}</p>

                  {/* Phone */}
                  <p className="text-sm text-on-surface-variant truncate">{user.phone}</p>

                  {/* Status badge */}
                  <div className="flex">
                    <Badge variant={userStatusVariant(user.status)}>
                      {user.status}
                    </Badge>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2">
                    {user.status === 'ACTIVE' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openStatusModal(user, 'INACTIVE')}
                        className="text-error border-error/30 hover:bg-error/5 text-xs"
                        title={`Deactivate ${user.fullName}`}
                      >
                        <Icon name="person_off" className="text-base mr-1" />
                        Deactivate
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openStatusModal(user, 'ACTIVE')}
                        className="text-[#2e7d32] border-[#a5d6a7] hover:bg-[#e8f5e9] text-xs"
                        title={`Activate ${user.fullName}`}
                      >
                        <Icon name="person_check" className="text-base mr-1" />
                        Activate
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Back link */}
        <div className="pt-2">
          <Link to="/admin/dashboard" className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary transition-colors">
            <Icon name="arrow_back" className="text-base" />
            Back to Dashboard
          </Link>
        </div>
      </main>

      {/* ------------------------------------------------------------------ */}
      {/* Status change confirmation modal */}
      {/* ------------------------------------------------------------------ */}
      <StatusConfirmModal
        isOpen={confirmModal.open}
        onClose={closeStatusModal}
        onConfirm={handleStatusConfirm}
        user={confirmModal.user}
        newStatus={confirmModal.newStatus}
        loading={statusLoading}
      />
    </div>
  );
}
