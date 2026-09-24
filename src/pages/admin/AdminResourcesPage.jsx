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

const TYPE_OPTIONS = [
  { label: 'All Resource Types', value: '' },
  { label: 'ICU Bed', value: 'ICU_BED' },
  { label: 'General Bed', value: 'GENERAL_BED' },
  { label: 'Ventilator', value: 'VENTILATOR' },
  { label: 'Oxygen Cylinder', value: 'OXYGEN_CYLINDER' },
  { label: 'Ambulance', value: 'AMBULANCE' },
  { label: 'Operation Theatre', value: 'OPERATION_THEATRE' },
];

const STATUS_OPTIONS = [
  { label: 'All Statuses', value: '' },
  { label: 'Available', value: 'AVAILABLE' },
  { label: 'Occupied', value: 'OCCUPIED' },
  { label: 'Under Maintenance', value: 'UNDER_MAINTENANCE' },
  { label: 'Reserved', value: 'RESERVED' },
];

function formatResourceName(type) {
  if (!type) return '';
  return type
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

function resourceIcon(type) {
  switch (type) {
    case 'ICU_BED':
    case 'GENERAL_BED':
      return 'bed';
    case 'VENTILATOR':
      return 'mode_fan';
    case 'OXYGEN_CYLINDER':
      return 'propane_tank';
    case 'AMBULANCE':
      return 'airport_shuttle';
    case 'OPERATION_THEATRE':
      return 'local_hospital';
    default:
      return 'inventory_2';
  }
}

function resourceStatusVariant(status) {
  switch (status) {
    case 'AVAILABLE':
      return 'completed';
    case 'OCCUPIED':
      return 'cancelled';
    case 'UNDER_MAINTENANCE':
      return 'pending';
    case 'RESERVED':
      return 'scheduled';
    default:
      return 'default';
  }
}

function UpdateResourceModal({ isOpen, onClose, onConfirm, resource, loading }) {
  const [selectedStatus, setSelectedStatus] = useState('');
  const [patientIdInput, setPatientIdInput] = useState('');

  useEffect(() => {
    if (resource) {
      setSelectedStatus(resource.status || 'AVAILABLE');
      setPatientIdInput(resource.allocatedPatientId ? String(resource.allocatedPatientId) : '');
    }
  }, [resource]);

  if (!resource) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm({
      status: selectedStatus,
      allocatedPatientId:
        selectedStatus === 'OCCUPIED' || selectedStatus === 'RESERVED'
          ? patientIdInput.trim() ? Number(patientIdInput.trim()) : null
          : null,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Update Resource Status" maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="p-3.5 rounded-xl bg-surface-container border border-outline-variant/20 flex flex-col gap-1 text-sm">
          <div className="flex items-center gap-2">
            <Icon name={resourceIcon(resource.resourceType)} className="text-primary text-xl" />
            <span className="font-bold text-on-surface">{resource.resourceCode}</span>
          </div>
          <p className="text-xs text-on-surface-variant">
            {formatResourceName(resource.resourceType)} • {resource.locationWard}
          </p>
        </div>

        <div>
          <label htmlFor="resource-modal-status" className="block text-xs font-semibold text-on-surface mb-1">
            Resource Status
          </label>
          <Select
            id="resource-modal-status"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            options={STATUS_OPTIONS.filter((o) => o.value !== '')}
          />
        </div>

        {(selectedStatus === 'OCCUPIED' || selectedStatus === 'RESERVED') && (
          <div>
            <label htmlFor="resource-modal-patient-id" className="block text-xs font-semibold text-on-surface mb-1">
              Allocated Patient ID (Optional)
            </label>
            <Input
              id="resource-modal-patient-id"
              type="number"
              placeholder="e.g. 1, 2, 3..."
              value={patientIdInput}
              onChange={(e) => setPatientIdInput(e.target.value)}
            />
            <p className="text-[11px] text-on-surface-variant mt-1">
              Leave blank if unassigned or enter the patient profile ID.
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-outline-variant/10">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={loading}>
            {loading ? 'Updating...' : 'Update Status'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function AdminResourcesPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [resources, setResources] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal & Status State
  const [selectedResource, setSelectedResource] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [bannerMsg, setBannerMsg] = useState(null);

  const debounceTimer = useRef(null);

  const fetchResources = useCallback(async ({ searchVal = search, typeVal = typeFilter, statusVal = statusFilter } = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.getResources({
        search: searchVal,
        type: typeVal,
        status: statusVal,
      });
      setResources(data.resources || []);
      setSummary(data.summary || null);
    } catch (err) {
      setError(err.message || 'Failed to load resources.');
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, statusFilter]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      fetchResources({ searchVal: val });
    }, 350);
  };

  const handleTypeChange = (e) => {
    const val = e.target.value;
    setTypeFilter(val);
    fetchResources({ typeVal: val });
  };

  const handleStatusChange = (e) => {
    const val = e.target.value;
    setStatusFilter(val);
    fetchResources({ statusVal: val });
  };

  const handleOpenModal = (res) => {
    setSelectedResource(res);
    setModalOpen(true);
  };

  const handleConfirmUpdate = async ({ status, allocatedPatientId }) => {
    if (!selectedResource) return;
    setModalLoading(true);
    try {
      const updated = await adminService.updateResourceStatus(selectedResource.id, {
        status,
        allocatedPatientId,
      });
      setBannerMsg({ type: 'success', text: `Resource ${updated.resourceCode} updated to ${updated.status}.` });
      setResources((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setModalOpen(false);
      // Refresh summary metrics
      fetchResources();
    } catch (err) {
      setBannerMsg({ type: 'error', text: err.message || 'Failed to update resource status.' });
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
              <span className="text-on-surface font-medium">Hospital Infrastructure</span>
            </nav>
            <h1 className="text-2xl font-bold text-on-surface flex items-center gap-2">
              <Icon name="inventory_2" className="text-primary text-2xl" />
              <span>Hospital Infrastructure & Resources</span>
            </h1>
            <p className="text-sm text-on-surface-variant mt-0.5">
              Monitor ICU units, ventilators, wards, and ambulance readiness in real time.
            </p>
          </div>

          <Button variant="outline" size="sm" onClick={() => fetchResources()} disabled={loading}>
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

        {/* Summary Metric Cards */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/20 flex flex-col gap-1">
              <div className="flex items-center justify-between text-on-surface-variant">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Equipment</span>
                <Icon name="inventory" className="text-primary text-xl" />
              </div>
              <p className="text-2xl font-bold text-on-surface">{summary.total}</p>
              <span className="text-xs text-on-surface-variant">Registered hospital assets</span>
            </div>

            <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/20 flex flex-col gap-1">
              <div className="flex items-center justify-between text-on-surface-variant">
                <span className="text-xs font-semibold uppercase tracking-wider">Available Units</span>
                <Icon name="check_circle" className="text-secondary text-xl" />
              </div>
              <p className="text-2xl font-bold text-secondary">{summary.available}</p>
              <span className="text-xs text-secondary font-medium">Ready for immediate allocation</span>
            </div>

            <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/20 flex flex-col gap-1">
              <div className="flex items-center justify-between text-on-surface-variant">
                <span className="text-xs font-semibold uppercase tracking-wider">Occupied Units</span>
                <Icon name="airline_seat_flat" className="text-error text-xl" />
              </div>
              <p className="text-2xl font-bold text-error">{summary.occupied}</p>
              <span className="text-xs text-error font-medium">Currently in patient use</span>
            </div>

            <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/20 flex flex-col gap-1">
              <div className="flex items-center justify-between text-on-surface-variant">
                <span className="text-xs font-semibold uppercase tracking-wider">Maintenance / Reserved</span>
                <Icon name="build" className="text-tertiary text-xl" />
              </div>
              <p className="text-2xl font-bold text-tertiary">
                {summary.underMaintenance + summary.reserved}
              </p>
              <span className="text-xs text-on-surface-variant">
                {summary.underMaintenance} servicing • {summary.reserved} on hold
              </span>
            </div>
          </div>
        )}

        {/* Filter Toolbar */}
        <div className="bg-surface-container-low rounded-2xl border border-outline-variant/20 p-4 flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <Input
              id="admin-resource-search"
              placeholder="Search by code, ward location, hospital name..."
              iconLeading="search"
              value={search}
              onChange={handleSearchChange}
            />
          </div>
          <div className="w-full md:w-56">
            <Select
              id="admin-resource-type"
              value={typeFilter}
              onChange={handleTypeChange}
              options={TYPE_OPTIONS}
            />
          </div>
          <div className="w-full md:w-52">
            <Select
              id="admin-resource-status"
              value={statusFilter}
              onChange={handleStatusChange}
              options={STATUS_OPTIONS}
            />
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant gap-3">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="font-body-md">Loading hospital infrastructure data...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="bg-error-container/20 border border-error/30 rounded-2xl p-8 text-center flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-error/10 text-error flex items-center justify-center">
              <Icon name="error" className="text-2xl" />
            </div>
            <h3 className="text-lg font-bold text-on-surface">Unable to Load Resources</h3>
            <p className="text-on-surface-variant max-w-md">{error}</p>
            <Button variant="primary" size="sm" onClick={() => fetchResources()}>
              Retry
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && resources.length === 0 && (
          <div className="bg-surface-container-low rounded-2xl border border-outline-variant/20 p-12 text-center flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center">
              <Icon name="inventory" className="text-2xl opacity-60" />
            </div>
            <h3 className="text-lg font-bold text-on-surface">No Resources Found</h3>
            <p className="text-sm text-on-surface-variant max-w-md">
              {search || typeFilter || statusFilter
                ? 'No infrastructure records match your current filter settings.'
                : 'No resources have been registered yet.'}
            </p>
          </div>
        )}

        {/* Resources Cards Grid */}
        {!loading && !error && resources.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {resources.map((res) => (
              <div
                key={res.id}
                className="bg-surface-container-low rounded-2xl p-5 border border-outline-variant/20 flex flex-col justify-between gap-4 shadow-sm hover:border-outline-variant/50 transition-all"
              >
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Icon name={resourceIcon(res.resourceType)} className="text-xl" />
                      </div>
                      <div>
                        <h2 className="font-bold text-base text-on-surface leading-tight">
                          {res.resourceCode}
                        </h2>
                        <span className="text-xs text-on-surface-variant font-medium">
                          {formatResourceName(res.resourceType)}
                        </span>
                      </div>
                    </div>
                    <Badge variant={resourceStatusVariant(res.status)}>{res.status}</Badge>
                  </div>

                  <div className="text-xs text-on-surface-variant flex flex-col gap-1 mt-1">
                    <div className="flex items-center gap-1.5">
                      <Icon name="apartment" className="text-sm opacity-70" />
                      <span className="truncate">{res.locationWard}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Icon name="local_hospital" className="text-sm opacity-70" />
                      <span className="truncate">{res.hospitalName}</span>
                    </div>
                  </div>

                  {res.allocatedPatient && (
                    <div className="p-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-xs">
                      <span className="font-semibold text-error text-[11px] block uppercase tracking-wider mb-0.5">
                        Patient Allocated
                      </span>
                      <p className="font-bold text-on-surface">{res.allocatedPatient.fullName}</p>
                      <p className="text-[11px] text-on-surface-variant">{res.allocatedPatient.phone}</p>
                    </div>
                  )}

                  {res.lastInspectedAt && (
                    <p className="text-[11px] text-on-surface-variant/70 mt-1">
                      Inspected: {new Date(res.lastInspectedAt).toLocaleString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-outline-variant/10 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenModal(res)}
                    className="w-full justify-center text-xs"
                  >
                    <Icon name="tune" className="text-sm mr-1" />
                    Manage Status
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <UpdateResourceModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirmUpdate}
        resource={selectedResource}
        loading={modalLoading}
      />
    </div>
  );
}

export default AdminResourcesPage;
