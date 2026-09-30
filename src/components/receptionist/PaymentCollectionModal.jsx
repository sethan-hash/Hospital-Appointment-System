import React, { useEffect, useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Select } from '../common/Select';
import { Icon } from '../common/Icon';

const PAYMENT_STATUS_OPTIONS = [
  { value: 'PAID', label: 'Mark as Paid' },
  { value: 'PENDING', label: 'Mark as Pending' },
];

const PAYMENT_METHOD_OPTIONS = [
  { value: '', label: 'Select payment method…' },
  { value: 'CASH', label: 'Cash' },
  { value: 'UPI', label: 'UPI' },
  { value: 'CREDIT_CARD', label: 'Credit Card' },
  { value: 'DEBIT_CARD', label: 'Debit Card' },
  { value: 'NET_BANKING', label: 'Net Banking' },
  { value: 'INSURANCE', label: 'Insurance' },
];

function formatAmount(amount) {
  return `₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

/**
 * PaymentCollectionModal
 * Allows front-desk receptionists to collect payment or reset to Pending.
 * Only PAID / PENDING statuses are available — admin-only transitions are never shown.
 */
export function PaymentCollectionModal({ isOpen, onClose, onConfirm, appointment, loading }) {
  const invoice = appointment?.invoice;

  const [paymentStatus, setPaymentStatus] = useState('PAID');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [validationError, setValidationError] = useState('');

  // Sync state when invoice changes (new appointment selected)
  useEffect(() => {
    if (invoice) {
      setPaymentStatus(invoice.paymentStatus === 'PAID' ? 'PAID' : 'PENDING');
      setPaymentMethod(invoice.paymentMethod || 'CASH');
    } else {
      setPaymentStatus('PAID');
      setPaymentMethod('CASH');
    }
    setValidationError('');
  }, [invoice, isOpen]);

  if (!invoice) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError('');

    if (paymentStatus === 'PAID' && !paymentMethod) {
      setValidationError('Please select a payment method when marking as Paid.');
      return;
    }

    onConfirm({
      invoiceId: invoice.id,
      paymentStatus,
      paymentMethod: paymentStatus === 'PAID' ? paymentMethod : null,
    });
  };

  const isPaid = paymentStatus === 'PAID';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Collect Payment"
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Invoice Summary Card */}
        <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/20 flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs text-on-surface-variant font-medium uppercase tracking-wider">
                Invoice
              </p>
              <p className="font-bold text-on-surface text-base">{invoice.invoiceNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-on-surface-variant">Amount Due</p>
              <p className="text-2xl font-bold text-primary">
                {formatAmount(invoice.totalAmount)}
              </p>
            </div>
          </div>

          <div className="border-t border-outline-variant/20 pt-2 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
              <Icon name="person" className="text-[14px]" />
              <span className="font-medium text-on-surface">
                {appointment.patientName || 'Patient'}
              </span>
            </div>
            {appointment.doctorName && (
              <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                <Icon name="stethoscope" className="text-[14px]" />
                <span>{appointment.doctorName}</span>
                {appointment.doctorDepartment && (
                  <span className="opacity-60">— {appointment.doctorDepartment}</span>
                )}
              </div>
            )}
            <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
              <Icon name="calendar_today" className="text-[14px]" />
              <span>{invoice.issueDate}</span>
            </div>
          </div>

          {/* Current status badge */}
          <div className="pt-1">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                invoice.paymentStatus === 'PAID'
                  ? 'bg-[#e8f5e9] text-[#2e7d32] border border-[#a5d6a7]'
                  : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}
            >
              <Icon
                name={invoice.paymentStatus === 'PAID' ? 'check_circle' : 'pending_actions'}
                className="text-[14px]"
              />
              Current: {invoice.paymentStatus}
              {invoice.paymentMethod && ` · ${invoice.paymentMethod.replace(/_/g, ' ')}`}
            </span>
          </div>
        </div>

        {/* Payment Status Selection */}
        <div>
          <label
            htmlFor="payment-modal-status"
            className="block text-xs font-semibold text-on-surface mb-1.5"
          >
            Update Status
          </label>
          <div className="grid grid-cols-2 gap-2">
            {PAYMENT_STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                id={`payment-status-${opt.value.toLowerCase()}`}
                onClick={() => {
                  setPaymentStatus(opt.value);
                  setValidationError('');
                }}
                className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                  paymentStatus === opt.value
                    ? opt.value === 'PAID'
                      ? 'bg-[#e8f5e9] border-[#a5d6a7] text-[#2e7d32] shadow-sm'
                      : 'bg-amber-50 border-amber-300 text-amber-800 shadow-sm'
                    : 'bg-surface border-outline-variant/30 text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                <Icon
                  name={opt.value === 'PAID' ? 'check_circle' : 'pending_actions'}
                  className="text-base"
                />
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Payment Method (required when marking PAID) */}
        {isPaid && (
          <div>
            <label
              htmlFor="payment-modal-method"
              className="block text-xs font-semibold text-on-surface mb-1.5"
            >
              Payment Method <span className="text-error">*</span>
            </label>
            <Select
              id="payment-modal-method"
              value={paymentMethod}
              onChange={(e) => {
                setPaymentMethod(e.target.value);
                setValidationError('');
              }}
              options={PAYMENT_METHOD_OPTIONS.filter((o) => o.value !== '')}
            />
          </div>
        )}

        {/* Validation error */}
        {validationError && (
          <p className="flex items-center gap-1.5 text-xs text-error">
            <Icon name="error" className="text-sm" />
            {validationError}
          </p>
        )}

        {/* Action buttons */}
        <div className="flex justify-end gap-2 pt-2 border-t border-outline-variant/10">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={loading}
            id="payment-modal-cancel"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={loading}
            id="payment-modal-confirm"
          >
            <Icon name={isPaid ? 'payments' : 'undo'} className="text-base mr-1" />
            {loading ? 'Saving…' : isPaid ? 'Confirm Payment' : 'Reset to Pending'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
