import { Check, FileText, ShieldCheck, X } from 'lucide-react';
import { ComplaintItem, InspectorModalState, ReviewItem, UnifiedAidoUser } from '../types/user.types';

interface UnifiedUserTableProps {
  users: UnifiedAidoUser[];
  onToggleAidmate: (userId: string, currentValue: boolean) => Promise<void> | void;
  onToggleVerify: (userId: string, currentValue: boolean) => Promise<void> | void;
  onOpenInspector: (modal: InspectorModalState) => void;
}

export default function UnifiedUserTable({
  users,
  onToggleAidmate,
  onToggleVerify,
  onOpenInspector,
}: UnifiedUserTableProps) {
  const openReviews = (user: UnifiedAidoUser, type: 'CUSTOMER' | 'AIDMATE') => {
    const items = type === 'CUSTOMER' ? user.customerReviews.items : user.aidmateReviews.items;
    onOpenInspector({
      title: `${user.name} ${type === 'CUSTOMER' ? 'Customer' : 'AIDMATE'} Reviews`,
      subtitle: `${items.length} review${items.length === 1 ? '' : 's'} on record`,
      type: 'REVIEWS',
      items,
    });
  };

  const openComplaints = (user: UnifiedAidoUser, type: 'CUSTOMER' | 'AIDMATE') => {
    const items = type === 'CUSTOMER' ? user.customerComplaints : user.aidmateComplaints;
    onOpenInspector({
      title: `${user.name} ${type === 'CUSTOMER' ? 'Customer' : 'AIDMATE'} Complaints`,
      subtitle: `${items.length} complaint${items.length === 1 ? '' : 's'} on record`,
      type: 'COMPLAINTS',
      items,
    });
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
        <thead>
          <tr className="bg-[#F8FAFC] text-[#64748B]">
            <th className="border-b border-[#E2E8F0] px-4 py-3 font-bold uppercase tracking-[0.08em]">Profile</th>
            <th className="border-b border-[#E2E8F0] px-4 py-3 font-bold uppercase tracking-[0.08em]">Role</th>
            <th className="border-b border-[#E2E8F0] px-4 py-3 font-bold uppercase tracking-[0.08em]">Verification</th>
            <th className="border-b border-[#E2E8F0] px-4 py-3 font-bold uppercase tracking-[0.08em]">Certificates</th>
            <th className="border-b border-[#E2E8F0] px-4 py-3 font-bold uppercase tracking-[0.08em]">Customer Reviews</th>
            <th className="border-b border-[#E2E8F0] px-4 py-3 font-bold uppercase tracking-[0.08em]">AIDMATE Reviews</th>
            <th className="border-b border-[#E2E8F0] px-4 py-3 font-bold uppercase tracking-[0.08em]">Complaints</th>
          </tr>
        </thead>

        <tbody>
          {users.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-10 text-center text-[#64748B]">
                No users match the current filters.
              </td>
            </tr>
          ) : (
            users.map(user => (
              <tr key={user.id} className="align-top hover:bg-[#F8FAFC]">
                <td className="border-b border-[#E2E8F0] px-4 py-4">
                  <div className="font-semibold text-[#172033]">{user.name}</div>
                  <div className="mt-1 text-xs text-[#64748B]">{user.mobile}</div>
                  <div className="mt-1 text-xs text-[#64748B]">{user.email || 'No email'}</div>
                </td>

                <td className="border-b border-[#E2E8F0] px-4 py-4">
                  <button
                    type="button"
                    disabled={user.accountType !== 'provider'}
                    onClick={() => void onToggleAidmate(user.id, user.isActiveAidmate)}
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50 ${
                      user.isActiveAidmate
                        ? 'bg-[#DCFCE7] text-[#166534]'
                        : 'bg-[#F1F5F9] text-[#475569]'
                    }`}
                  >
                    {user.accountType !== 'provider'
                      ? 'SEEKER'
                      : user.isActiveAidmate ? 'AIDMATE ON' : 'AIDMATE OFF'}
                  </button>
                </td>

                <td className="border-b border-[#E2E8F0] px-4 py-4">
                  <button
                    type="button"
                    disabled={user.accountType !== 'provider'}
                    onClick={() => void onToggleVerify(user.id, user.isVerified)}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50 ${
                      user.isVerified
                        ? 'bg-[#DCFCE7] text-[#166534]'
                        : 'bg-[#FEE2E2] text-[#B91C1C]'
                    }`}
                  >
                    {user.isVerified ? <ShieldCheck className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                    {user.isVerified ? 'Verified' : 'Not Verified'}
                  </button>
                </td>

                <td className="border-b border-[#E2E8F0] px-4 py-4">
                  {user.certificates.length > 0 ? (
                    <div className="space-y-2">
                      {user.certificates.slice(0, 2).map(certificate => (
                        <a
                          key={certificate.id}
                          href={certificate.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-2 py-1.5 text-xs text-[#172033] hover:border-[#16A34A]"
                        >
                          <FileText className="h-3.5 w-3.5 text-[#16A34A]" />
                          {certificate.title}
                        </a>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-[#64748B]">No certificates</span>
                  )}
                </td>

                <td className="border-b border-[#E2E8F0] px-4 py-4">
                  <div className="flex items-center gap-2 text-xs text-[#172033]">
                    <span className="font-bold text-[#16A34A]">{user.customerReviews.averageRating.toFixed(1)}</span>
                    <span className="text-[#64748B]">({user.customerReviews.totalCount})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openReviews(user, 'CUSTOMER')}
                    className="mt-2 rounded-md border border-[#E2E8F0] px-2 py-1 text-xs font-medium text-[#172033] hover:border-[#16A34A] hover:text-[#16A34A]"
                  >
                    View reviews
                  </button>
                </td>

                <td className="border-b border-[#E2E8F0] px-4 py-4">
                  <div className="flex items-center gap-2 text-xs text-[#172033]">
                    <span className="font-bold text-[#16A34A]">{user.aidmateReviews.averageRating.toFixed(1)}</span>
                    <span className="text-[#64748B]">({user.aidmateReviews.totalCount})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openReviews(user, 'AIDMATE')}
                    className="mt-2 rounded-md border border-[#E2E8F0] px-2 py-1 text-xs font-medium text-[#172033] hover:border-[#16A34A] hover:text-[#16A34A]"
                  >
                    View reviews
                  </button>
                </td>

                <td className="border-b border-[#E2E8F0] px-4 py-4">
                  <div className="flex items-center gap-2 text-xs text-[#172033]">
                    <span className="font-bold text-[#172033]">{user.customerComplaints.length + user.aidmateComplaints.length}</span>
                    <span className="text-[#64748B]">total</span>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => openComplaints(user, 'CUSTOMER')}
                      className="rounded-md border border-[#E2E8F0] px-2 py-1 text-[11px] font-medium text-[#172033] hover:border-[#16A34A] hover:text-[#16A34A]"
                    >
                      Customer
                    </button>
                    <button
                      type="button"
                      onClick={() => openComplaints(user, 'AIDMATE')}
                      className="rounded-md border border-[#E2E8F0] px-2 py-1 text-[11px] font-medium text-[#172033] hover:border-[#16A34A] hover:text-[#16A34A]"
                    >
                      AIDMATE
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
