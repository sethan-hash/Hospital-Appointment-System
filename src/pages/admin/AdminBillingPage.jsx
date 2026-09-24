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

const STATUS_OPTIONS = [
  { label: 'All Statuses', value: '' },
  { label: 'Paid', value: 'PAID' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Partially Paid', value: 'PARTIALLY_PAID' },
  { label: 'Cancelled', value: 'CANCELLED' },
  { label: 'Refunded', value: 'REFUNDED' },
];

const METHOD_OPTIONS = [
  { label: 'All Payment Methods', value: '' },
  { label: 'Insurance', value: 'INSURANCE' },
  { label: 'UPI', value: 'UPI' },
  { label: 'Credit Card', value: 'CREDIT_CARD' },
  { label: 'Debit Card', value: 'DEBIT_CARD' },
  { label: 'Net Banking', value: 'NET_BANKING' },
  { label: 'Cash', value: 'CASH' },
];

function statusVariant(status) {
  switch (status) {
    case 'PAID':
      return 'completed';
    case 'PENDING':
      return 'pending';
    case 'CANCELLED':
      return 'cancelled';
    case 'REFUNDED':
    case 'PARTIALLY_PAID':
      return 'scheduled';
    default:
      return 'default';
  }
}

function methodBadge(method) {
  if (!method) return <span className="text-xs text-on-surface-variant italic">Unassigned</span>;

  const isInsurance = method === 'INSURANCE';
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
        isInsurance
          ? 'bg-blue-100 text-blue-800 border border-blue-200'
          : 'bg-surface-container-high text-on-surface'
      }`}
    >
      <Icon name={isInsurance ? 'health_and_safety' : 'payments'} className="text-sm" />
      {method.replace(/_/g, ' ')}
    </span>
  );
}

function UpdateInvoiceModal({ isOpen, onClose, onConfirm, invoice, loading }) {
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('');

  useEffect(() => {
    if (invoice) {
      setSelectedStatus(invoice.paymentStatus || 'PENDING');
      setSelectedMethod(invoice.paymentMethod || '');
    }
  }, [invoice]);

  if (!invoice) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm({
      paymentStatus: selectedStatus,
      paymentMethod: selectedMethod || null,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Update Invoice Payment" maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="p-3.5 rounded-xl bg-surface-container border border-outline-variant/20 flex flex-col gap-1 text-sm">
          <div className="flex justify-between items-center">
            <span className="font-bold text-on-surface">{invoice.invoiceNumber}</span>
            <span className="font-bold text-primary text-base">
              ₹{invoice.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-xs text-on-surface-variant">Patient: {invoice.patient?.fullName}</p>
        </div>

        <div>
          <label htmlFor="invoice-modal-status" className="block text-xs font-semibold text-on-surface mb-1">
            Payment Status
          </label>
          <Select
            id="invoice-modal-status"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            options={STATUS_OPTIONS.filter((o) => o.value !== '')}
          />
        </div>

        <div>
          <label htmlFor="invoice-modal-method" className="block text-xs font-semibold text-on-surface mb-1">
            Payment Method
          </label>
          <Select
            id="invoice-modal-method"
            value={selectedMethod}
            onChange={(e) => setSelectedMethod(e.target.value)}
            options={METHOD_OPTIONS}
          />
          <p className="text-[11px] text-on-surface-variant mt-1">
            Select &quot;Insurance&quot; for medical insurance coverage claims.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-outline-variant/10">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function AdminBillingPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');

  // Modal & Status State
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [bannerMsg, setBannerMsg] = useState(null);

  const debounceTimer = useRef(null);

  const fetchInvoices = useCallback(async ({ searchVal = search, statusVal = statusFilter, methodVal = methodFilter } = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.getInvoices({
        search: searchVal,
        status: statusVal,
        paymentMethod: methodVal,
      });
      setInvoices(data.invoices || []);
      setSummary(data.summary || null);
    } catch (err) {
      setError(err.message || 'Failed to load invoices.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, methodFilter]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      fetchInvoices({ searchVal: val });
    }, 350);
  };

  const handleStatusChange = (e) => {
    const val = e.target.value;
    setStatusFilter(val);
    fetchInvoices({ statusVal: val });
  };

  const handleMethodChange = (e) => {
    const val = e.target.value;
    setMethodFilter(val);
    fetchInvoices({ methodVal: val });
  };

  const handleOpenModal = (inv) => {
    setSelectedInvoice(inv);
    setModalOpen(true);
  };

  const handleConfirmUpdate = async ({ paymentStatus, paymentMethod }) => {
    if (!selectedInvoice) return;
    setModalLoading(true);
    try {
      const updated = await adminService.updateInvoiceStatus(selectedInvoice.id, {
        paymentStatus,
        paymentMethod,
      });
      setBannerMsg({ type: 'success', text: `Invoice ${updated.invoiceNumber} updated successfully.` });
      setInvoices((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setModalOpen(false);
      // Re-fetch summary in background
      fetchInvoices();
    } catch (err) {
      setBannerMsg({ type: 'error', text: err.message || 'Failed to update invoice.' });
    } finally {
      setModalLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col">
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
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <nav className="flex items-center gap-1.5 text-xs text-on-surface-variant mb-1">
              <Link to="/admin/dashboard" className="hover:text-primary transition-colors">
                Dashboard
              </Link>
              <Icon name="chevron_right" className="text-base opacity-50" />
              <span className="text-on-surface font-medium">Billing & Invoices</span>
            </nav>
            <h1 className="text-2xl font-bold text-on-surface flex items-center gap-2">
              <Icon name="receipt_long" className="text-primary text-2xl" />
              <span>Billing & Invoices</span>
            </h1>
            <p className="text-sm text-on-surface-variant mt-0.5">
              Review financial records, consultation fees, and insurance claims.
            </p>
          </div>

          <Button variant="outline" size="sm" onClick={() => fetchInvoices()} disabled={loading}>
            <Icon name="refresh" className={`text-base mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Notifications Banner */}
        {bannerMsg && (
          <div
            className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm ${
              bannerMsg.type === 'success'
                ? 'bg-[#e8f5e9] border-[#a5d6a7] text-[#2e7d32]'
                : 'bg-error-container/20 border-error/30 text-error'
            }`}
          >
            <div className="flex items-center gap-2">
              <Icon name={bannerMsg.type === 'success' ? 'check_circle' : 'error'} className="text-lg shrink-0" />
              <span>{bannerMsg.text}</span>
            </div>
            <button
              onClick={() => setBannerMsg(null)}
              className="text-on-surface-variant hover:text-on-surface p-1"
              aria-label="Dismiss message"
            >
              <Icon name="close" className="text-base" />
            </button>
          </div>
        )}

        {/* Financial KPI Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/20 flex flex-col gap-1">
              <div className="flex items-center justify-between text-on-surface-variant">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Invoices</span>
                <Icon name="receipt" className="text-primary text-xl" />
              </div>
              <p className="text-2xl font-bold text-on-surface">{summary.totalInvoices}</p>
              <span className="text-xs text-on-surface-variant">
                ₹{summary.totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })} Total Value
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/20 flex flex-col gap-1">
              <div className="flex items-center justify-between text-on-surface-variant">
                <span className="text-xs font-semibold uppercase tracking-wider">Paid Revenue</span>
                <Icon name="payments" className="text-secondary text-xl" />
              </div>
              <p className="text-2xl font-bold text-secondary">
                ₹{summary.paidRevenue.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
              </p>
              <span className="text-xs text-secondary font-medium">
                {summary.paidCount} settled invoices
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/20 flex flex-col gap-1">
              <div className="flex items-center justify-between text-on-surface-variant">
                <span className="text-xs font-semibold uppercase tracking-wider">Pending Balance</span>
                <Icon name="pending_actions" className="text-tertiary text-xl" />
              </div>
              <p className="text-2xl font-bold text-tertiary">
                ₹{summary.pendingRevenue.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
              </p>
              <span className="text-xs text-on-surface-variant">
                {summary.pendingCount} awaiting payment
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/20 flex flex-col gap-1">
              <div className="flex items-center justify-between text-on-surface-variant">
                <span className="text-xs font-semibold uppercase tracking-wider">Insurance Coverage</span>
                <Icon name="health_and_safety" className="text-blue-600 text-xl" />
              </div>
              <p className="text-2xl font-bold text-blue-700">
                ₹{summary.insuranceRevenue.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
              </p>
              <span className="text-xs text-blue-600 font-medium">
                {summary.insuranceCount} insurance billed
              </span>
            </div>
          </div>
        )}

        {/* Filter Toolbar */}
        <div className="bg-surface-container-low rounded-2xl border border-outline-variant/20 p-4 flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <Input
              id="admin-invoice-search"
              placeholder="Search by invoice #, patient name, email..."
              iconLeading="search"
              value={search}
              onChange={handleSearchChange}
            />
          </div>
          <div className="w-full md:w-52">
            <Select
              id="admin-invoice-status"
              value={statusFilter}
              onChange={handleStatusChange}
              options={STATUS_OPTIONS}
            />
          </div>
          <div className="w-full md:w-56">
            <Select
              id="admin-invoice-method"
              value={methodFilter}
              onChange={handleMethodChange}
              options={METHOD_OPTIONS}
            />
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant gap-3">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="font-body-md">Loading hospital invoices...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="bg-error-container/20 border border-error/30 rounded-2xl p-8 text-center flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-error/10 text-error flex items-center justify-center">
              <Icon name="error" className="text-2xl" />
            </div>
            <h3 className="text-lg font-bold text-on-surface">Unable to Load Invoices</h3>
            <p className="text-on-surface-variant max-w-md">{error}</p>
            <Button variant="primary" size="sm" onClick={() => fetchInvoices()}>
              Retry
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && invoices.length === 0 && (
          <div className="bg-surface-container-low rounded-2xl border border-outline-variant/20 p-12 text-center flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center">
              <Icon name="receipt" className="text-2xl opacity-60" />
            </div>
            <h3 className="text-lg font-bold text-on-surface">No Invoices Found</h3>
            <p className="text-sm text-on-surface-variant max-w-md">
              {search || statusFilter || methodFilter
                ? 'No invoices match your current search and filter criteria.'
                : 'There are no billing records registered in the system.'}
            </p>
          </div>
        )}

        {/* Invoices List / Table */}
        {!loading && !error && invoices.length > 0 && (
          <div className="bg-surface-container-low rounded-2xl border border-outline-variant/20 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-outline-variant/20 bg-surface-container text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                    <th className="py-3.5 px-4">Invoice #</th>
                    <th className="py-3.5 px-4">Patient</th>
                    <th className="py-3.5 px-4">Consultation</th>
                    <th className="py-3.5 px-4">Breakdown</th>
                    <th className="py-3.5 px-4">Total</th>
                    <th className="py-3.5 px-4">Method</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10 text-on-surface">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-surface-container/50 transition-colors">
                      <td className="py-4 px-4 font-mono font-medium text-xs">
                        <div className="font-bold text-on-surface">{inv.invoiceNumber}</div>
                        <div className="text-[11px] text-on-surface-variant">
                          {new Date(inv.issueDate).toLocaleDateString('en-IN', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-semibold text-on-surface">{inv.patient?.fullName}</div>
                        <div className="text-xs text-on-surface-variant">{inv.patient?.email}</div>
                      </td>
                      <td className="py-4 px-4">
                        {inv.appointment ? (
                          <>
                            <div className="font-medium text-xs text-on-surface">
                              Dr. {inv.appointment.doctorName}
                            </div>
                            <div className="text-[11px] text-on-surface-variant">
                              {inv.appointment.department}
                            </div>
                          </>
                        ) : (
                          <span className="text-xs text-on-surface-variant italic">Direct Bill</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-xs text-on-surface-variant">
                        <div>Fee: ₹{inv.consultationFee.toLocaleString('en-IN')}</div>
                        {inv.procedureFee > 0 && <div>Proc: ₹{inv.procedureFee.toLocaleString('en-IN')}</div>}
                        {inv.medicineFee > 0 && <div>Med: ₹{inv.medicineFee.toLocaleString('en-IN')}</div>}
                      </td>
                      <td className="py-4 px-4 font-bold text-on-surface">
                        ₹{inv.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-4">{methodBadge(inv.paymentMethod)}</td>
                      <td className="py-4 px-4">
                        <Badge variant={statusVariant(inv.paymentStatus)}>{inv.paymentStatus}</Badge>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenModal(inv)}
                          className="text-xs py-1 px-3"
                        >
                          <Icon name="edit" className="text-sm mr-1" />
                          Update
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <UpdateInvoiceModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirmUpdate}
        invoice={selectedInvoice}
        loading={modalLoading}
      />
    </div>
  );
}

export default AdminBillingPage;
