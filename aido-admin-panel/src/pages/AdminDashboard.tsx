import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { UnifiedAidoUser, InspectorModalState } from '../types/user.types';
import {
  fetchAllUnifiedUsers,
  toggleUserAidmateStatus,
  toggleUserVerificationBadge,
} from '../services/userEndpoint.service';
import TopNavbar from '../components/TopNavbar';
import UnifiedUserTable from '../components/UnifiedUserTable';
import DetailInspectorModal from '../components/DetailInspectorModal';
import { getAdminSession } from '../services/adminAuth.service';

interface AdminDashboardProps {
  adminEmail: string;
  onLogout: () => void;
}

export default function AdminDashboard({ adminEmail, onLogout }: AdminDashboardProps) {
  const [users, setUsers] = useState<UnifiedAidoUser[]>([]);
  const [dataSource, setDataSource] = useState<'FIREBASE'>('FIREBASE');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ACTIVE_AIDMATE' | 'INACTIVE_NORMAL'>('ALL');
  const [inspectorModal, setInspectorModal] = useState<InspectorModalState | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const result = await fetchAllUnifiedUsers();
      setUsers(result.users);
      setDataSource(result.source);
    } catch (error) {
      if (!getAdminSession()) {
        onLogout();
        return;
      }
      setLoadError(error instanceof Error ? error.message : 'Unable to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const handleToggleAidmate = async (userId: string, currentState: boolean) => {
    try {
      setUsers(await toggleUserAidmateStatus(userId, !currentState));
      setLoadError('');
    } catch (error) {
      if (!getAdminSession()) {
        onLogout();
        return;
      }
      setLoadError(error instanceof Error ? error.message : 'Unable to update AIDMATE status.');
    }
  };

  const handleToggleVerify = async (userId: string, currentVerified: boolean) => {
    try {
      setUsers(await toggleUserVerificationBadge(userId, !currentVerified));
      setLoadError('');
    } catch (error) {
      if (!getAdminSession()) {
        onLogout();
        return;
      }
      setLoadError(error instanceof Error ? error.message : 'Unable to update verification status.');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.mobile.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      roleFilter === 'ALL' ||
      (roleFilter === 'ACTIVE_AIDMATE' && user.isActiveAidmate) ||
      (roleFilter === 'INACTIVE_NORMAL' && !user.isActiveAidmate);

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#172033]">
      <TopNavbar
        adminEmail={adminEmail}
        dataSource={dataSource}
        loading={loading}
        onSync={loadUsers}
        onLogout={onLogout}
      />

      <main className="mx-auto max-w-[1600px] p-6">
        {loadError && (
          <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {loadError}
          </div>
        )}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
            <div className="text-xs font-bold uppercase text-[#64748B]">Total Unified Users</div>
            <div className="mt-1 text-2xl font-extrabold text-[#172033]">{users.length}</div>
          </div>
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
            <div className="text-xs font-bold uppercase text-[#16A34A]">Active AIDMATES</div>
            <div className="mt-1 text-2xl font-extrabold text-[#16A34A]">
              {users.filter(user => user.isActiveAidmate).length}
            </div>
          </div>
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
            <div className="text-xs font-bold uppercase text-[#64748B]">Inactive / Normal Customers</div>
            <div className="mt-1 text-2xl font-extrabold text-[#172033]">
              {users.filter(user => !user.isActiveAidmate).length}
            </div>
          </div>
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
            <div className="text-xs font-bold uppercase text-[#64748B]">Verified Profiles</div>
            <div className="mt-1 text-2xl font-extrabold text-[#172033]">
              {users.filter(user => user.isVerified).length}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
              <input
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                placeholder="Search by name, mobile, or email"
                className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] py-2.5 pl-9 pr-3 text-sm outline-none ring-0 transition focus:border-[#16A34A]"
              />
            </div>

            <select
              value={roleFilter}
              onChange={event => setRoleFilter(event.target.value as 'ALL' | 'ACTIVE_AIDMATE' | 'INACTIVE_NORMAL')}
              className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 text-sm outline-none focus:border-[#16A34A]"
            >
              <option value="ALL">All users</option>
              <option value="ACTIVE_AIDMATE">Active AIDMATES</option>
              <option value="INACTIVE_NORMAL">Inactive / Normal customers</option>
            </select>
          </div>

          <UnifiedUserTable
            users={filteredUsers}
            onToggleAidmate={handleToggleAidmate}
            onToggleVerify={handleToggleVerify}
            onOpenInspector={setInspectorModal}
          />
        </div>
      </main>

      {inspectorModal && (
        <DetailInspectorModal
          title={inspectorModal.title}
          subtitle={inspectorModal.subtitle}
          type={inspectorModal.type}
          items={inspectorModal.items}
          onClose={() => setInspectorModal(null)}
        />
      )}
    </div>
  );
}
