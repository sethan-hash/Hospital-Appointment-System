import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../common/Button';
import { Icon } from '../common/Icon';
import { Input } from '../common/Input';
import { TextArea } from '../common/TextArea';
import { Badge } from '../common/Badge';
import { doctorService } from '../../services/doctorService';

/**
 * Doctor Clinical Record Section
 * Read/Write editor for diagnosis, treatment plan, doctor notes, vitals, and prescribed medications.
 *
 * @param {Object} props
 * @param {number|string} props.appointmentId - Target appointment
 */
export function DoctorClinicalRecordSection({ appointmentId }) {
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Form states
  const [recordId, setRecordId] = useState(null);
  const [clinicalForm, setClinicalForm] = useState({
    diagnosis: '',
    treatmentPlan: '',
    doctorNotes: '',
  });

  const [vitalsForm, setVitalsForm] = useState({
    bloodPressureSystolic: '',
    bloodPressureDiastolic: '',
    heartRateBpm: '',
    respiratoryRateBpm: '',
    temperatureCelsius: '',
    spo2Percentage: '',
    weightKg: '',
    heightCm: '',
    bmi: '',
    notes: '',
  });

  const [medications, setMedications] = useState([]);
  const [newMed, setNewMed] = useState({
    medicineName: '',
    dosage: '',
    frequency: '',
    duration: '',
    instructions: '',
  });
  const [showAddMedForm, setShowAddMedForm] = useState(false);

  // In-flight operation states
  const [savingNotes, setSavingNotes] = useState(false);
  const [savingVitals, setSavingVitals] = useState(false);
  const [addingMed, setAddingMed] = useState(false);
  const [deletingMedId, setDeletingMedId] = useState(null);

  const loadData = useCallback(() => {
    if (!appointmentId) return;
    setLoading(true);
    setFetchError(null);

    doctorService
      .getClinicalRecord(appointmentId)
      .then((data) => {
        setLoading(false);
        if (data.record) {
          setRecordId(data.record.id);
          setClinicalForm({
            diagnosis: data.record.diagnosis || '',
            treatmentPlan: data.record.treatmentPlan || '',
            doctorNotes: data.record.doctorNotes || '',
          });
        } else {
          setRecordId(null);
          setClinicalForm({ diagnosis: '', treatmentPlan: '', doctorNotes: '' });
        }

        if (data.vitals) {
          setVitalsForm({
            bloodPressureSystolic: data.vitals.bloodPressureSystolic ?? '',
            bloodPressureDiastolic: data.vitals.bloodPressureDiastolic ?? '',
            heartRateBpm: data.vitals.heartRateBpm ?? '',
            respiratoryRateBpm: data.vitals.respiratoryRateBpm ?? '',
            temperatureCelsius: data.vitals.temperatureCelsius ?? '',
            spo2Percentage: data.vitals.spo2Percentage ?? '',
            weightKg: data.vitals.weightKg ?? '',
            heightCm: data.vitals.heightCm ?? '',
            bmi: data.vitals.bmi ?? '',
            notes: data.vitals.notes ?? '',
          });
        } else {
          setVitalsForm({
            bloodPressureSystolic: '',
            bloodPressureDiastolic: '',
            heartRateBpm: '',
            respiratoryRateBpm: '',
            temperatureCelsius: '',
            spo2Percentage: '',
            weightKg: '',
            heightCm: '',
            bmi: '',
            notes: '',
          });
        }

        setMedications(data.medications || []);
      })
      .catch((err) => {
        setLoading(false);
        setFetchError(err.message || 'Failed to load clinical record.');
      });
  }, [appointmentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Temporary feedback helper
  const showFeedback = (type, text) => {
    setFeedback({ type, text });
    setTimeout(() => {
      setFeedback(null);
    }, 4000);
  };

  // ── Save Clinical Notes ───────────────────────────────────────────────────
  const handleSaveNotes = async (e) => {
    e.preventDefault();
    if (!clinicalForm.diagnosis.trim()) {
      showFeedback('error', 'Diagnosis is required.');
      return;
    }

    setSavingNotes(true);
    try {
      const res = await doctorService.saveClinicalRecord(appointmentId, clinicalForm);
      if (res.record) {
        setRecordId(res.record.id);
      }
      showFeedback('success', 'Clinical notes saved successfully.');
    } catch (err) {
      showFeedback('error', err.message || 'Failed to save clinical notes.');
    } finally {
      setSavingNotes(false);
    }
  };

  // ── Save Vitals ───────────────────────────────────────────────────────────
  const handleSaveVitals = async (e) => {
    e.preventDefault();
    setSavingVitals(true);
    try {
      const payload = {
        bloodPressureSystolic: vitalsForm.bloodPressureSystolic ? Number(vitalsForm.bloodPressureSystolic) : null,
        bloodPressureDiastolic: vitalsForm.bloodPressureDiastolic ? Number(vitalsForm.bloodPressureDiastolic) : null,
        heartRateBpm: vitalsForm.heartRateBpm ? Number(vitalsForm.heartRateBpm) : null,
        respiratoryRateBpm: vitalsForm.respiratoryRateBpm ? Number(vitalsForm.respiratoryRateBpm) : null,
        temperatureCelsius: vitalsForm.temperatureCelsius ? Number(vitalsForm.temperatureCelsius) : null,
        spo2Percentage: vitalsForm.spo2Percentage ? Number(vitalsForm.spo2Percentage) : null,
        weightKg: vitalsForm.weightKg ? Number(vitalsForm.weightKg) : null,
        heightCm: vitalsForm.heightCm ? Number(vitalsForm.heightCm) : null,
        bmi: vitalsForm.bmi ? Number(vitalsForm.bmi) : null,
        notes: vitalsForm.notes.trim() || null,
      };

      const res = await doctorService.saveVitals(appointmentId, payload);
      if (res.vitals && res.vitals.bmi) {
        setVitalsForm((prev) => ({ ...prev, bmi: res.vitals.bmi }));
      }
      showFeedback('success', 'Vitals recorded successfully.');
    } catch (err) {
      showFeedback('error', err.message || 'Failed to save vitals.');
    } finally {
      setSavingVitals(false);
    }
  };

  // ── Add Medication ────────────────────────────────────────────────────────
  const handleAddMedication = async (e) => {
    e.preventDefault();
    if (!recordId) {
      // Need a clinical record first before adding medication
      if (!clinicalForm.diagnosis.trim()) {
        showFeedback('error', 'Please save a clinical diagnosis before prescribing medication.');
        return;
      }
      try {
        setAddingMed(true);
        const saved = await doctorService.saveClinicalRecord(appointmentId, clinicalForm);
        setRecordId(saved.record.id);
        const res = await doctorService.addMedication(saved.record.id, newMed);
        setMedications((prev) => [...prev, res.medication]);
        setNewMed({ medicineName: '', dosage: '', frequency: '', duration: '', instructions: '' });
        setShowAddMedForm(false);
        showFeedback('success', 'Medication added successfully.');
      } catch (err) {
        showFeedback('error', err.message || 'Failed to add medication.');
      } finally {
        setAddingMed(false);
      }
      return;
    }

    setAddingMed(true);
    try {
      const res = await doctorService.addMedication(recordId, newMed);
      setMedications((prev) => [...prev, res.medication]);
      setNewMed({ medicineName: '', dosage: '', frequency: '', duration: '', instructions: '' });
      setShowAddMedForm(false);
      showFeedback('success', 'Medication added successfully.');
    } catch (err) {
      showFeedback('error', err.message || 'Failed to add medication.');
    } finally {
      setAddingMed(false);
    }
  };

  // ── Delete Medication ─────────────────────────────────────────────────────
  const handleDeleteMedication = async (medId) => {
    setDeletingMedId(medId);
    try {
      await doctorService.deleteMedication(medId);
      setMedications((prev) => prev.filter((m) => m.id !== medId));
      showFeedback('success', 'Medication removed.');
    } catch (err) {
      showFeedback('error', err.message || 'Failed to remove medication.');
    } finally {
      setDeletingMedId(null);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-on-surface-variant">
        <Icon name="progress_activity" className="text-3xl text-primary animate-spin" />
        <p className="font-body-md text-sm">Loading clinical records...</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="p-4 bg-error-container/40 rounded-xl border border-error/20 text-center space-y-2">
        <p className="font-body-md text-sm text-on-error-container">{fetchError}</p>
        <Button variant="outline" size="sm" onClick={loadData}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-primary-container text-on-primary-container'
              : 'bg-error-container text-on-error-container'
          }`}
        >
          <Icon name={feedback.type === 'success' ? 'check_circle' : 'error'} className="text-base" />
          <span>{feedback.text}</span>
        </div>
      )}

      {/* 1. Clinical Notes Form */}
      <form onSubmit={handleSaveNotes} className="p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/30 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="medical_services" className="text-primary text-lg" />
            <h4 className="font-label-lg font-bold text-on-surface">Consultation Notes &amp; Diagnosis</h4>
          </div>
          {recordId ? (
            <Badge variant="completed">Active Record</Badge>
          ) : (
            <Badge variant="pending">New Consultation</Badge>
          )}
        </div>

        <TextArea
          label="Clinical Diagnosis"
          id="diagnosis"
          placeholder="e.g. Stage 1 Hypertension; Mild dyslipidemia"
          required
          rows={2}
          value={clinicalForm.diagnosis}
          onChange={(e) => setClinicalForm((prev) => ({ ...prev, diagnosis: e.target.value }))}
        />

        <TextArea
          label="Treatment Plan"
          id="treatmentPlan"
          placeholder="e.g. Lifestyle modification, low sodium diet, daily 30 min walk..."
          rows={2}
          value={clinicalForm.treatmentPlan}
          onChange={(e) => setClinicalForm((prev) => ({ ...prev, treatmentPlan: e.target.value }))}
        />

        <TextArea
          label="Physician Notes &amp; Recommendations"
          id="doctorNotes"
          placeholder="e.g. Regular BP monitoring advised. Review in 4 weeks."
          rows={2}
          value={clinicalForm.doctorNotes}
          onChange={(e) => setClinicalForm((prev) => ({ ...prev, doctorNotes: e.target.value }))}
        />

        <div className="flex justify-end pt-1">
          <Button variant="primary" size="sm" type="submit" disabled={savingNotes}>
            {savingNotes ? 'Saving Notes...' : 'Save Clinical Notes'}
          </Button>
        </div>
      </form>

      {/* 2. Physiological Vitals Form */}
      <form onSubmit={handleSaveVitals} className="p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/30 space-y-3">
        <div className="flex items-center gap-2">
          <Icon name="monitor_heart" className="text-primary text-lg" />
          <h4 className="font-label-lg font-bold text-on-surface">Physiological Vitals</h4>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <Input
            label="BP Systolic (mmHg)"
            id="bpSys"
            type="number"
            placeholder="120"
            value={vitalsForm.bloodPressureSystolic}
            onChange={(e) => setVitalsForm((prev) => ({ ...prev, bloodPressureSystolic: e.target.value }))}
          />
          <Input
            label="BP Diastolic (mmHg)"
            id="bpDia"
            type="number"
            placeholder="80"
            value={vitalsForm.bloodPressureDiastolic}
            onChange={(e) => setVitalsForm((prev) => ({ ...prev, bloodPressureDiastolic: e.target.value }))}
          />
          <Input
            label="Heart Rate (bpm)"
            id="hr"
            type="number"
            placeholder="72"
            value={vitalsForm.heartRateBpm}
            onChange={(e) => setVitalsForm((prev) => ({ ...prev, heartRateBpm: e.target.value }))}
          />
          <Input
            label="Resp. Rate (bpm)"
            id="rr"
            type="number"
            placeholder="16"
            value={vitalsForm.respiratoryRateBpm}
            onChange={(e) => setVitalsForm((prev) => ({ ...prev, respiratoryRateBpm: e.target.value }))}
          />
          <Input
            label="Temp (°C)"
            id="temp"
            type="number"
            step="0.1"
            placeholder="36.8"
            value={vitalsForm.temperatureCelsius}
            onChange={(e) => setVitalsForm((prev) => ({ ...prev, temperatureCelsius: e.target.value }))}
          />
          <Input
            label="SpO2 (%)"
            id="spo2"
            type="number"
            step="0.1"
            placeholder="98"
            value={vitalsForm.spo2Percentage}
            onChange={(e) => setVitalsForm((prev) => ({ ...prev, spo2Percentage: e.target.value }))}
          />
          <Input
            label="Weight (kg)"
            id="weight"
            type="number"
            step="0.1"
            placeholder="70.0"
            value={vitalsForm.weightKg}
            onChange={(e) => setVitalsForm((prev) => ({ ...prev, weightKg: e.target.value }))}
          />
          <Input
            label="Height (cm)"
            id="height"
            type="number"
            step="0.1"
            placeholder="175.0"
            value={vitalsForm.heightCm}
            onChange={(e) => setVitalsForm((prev) => ({ ...prev, heightCm: e.target.value }))}
          />
        </div>

        {vitalsForm.bmi && (
          <div className="text-xs text-on-surface-variant">
            <span>Calculated BMI: </span>
            <span className="font-semibold text-on-surface">{vitalsForm.bmi}</span>
          </div>
        )}

        <Input
          label="Vitals Observation Notes"
          id="vitalsNotes"
          placeholder="e.g. Resting BP taken after 5 mins seated"
          value={vitalsForm.notes}
          onChange={(e) => setVitalsForm((prev) => ({ ...prev, notes: e.target.value }))}
        />

        <div className="flex justify-end pt-1">
          <Button variant="primary" size="sm" type="submit" disabled={savingVitals}>
            {savingVitals ? 'Saving Vitals...' : 'Save Vitals'}
          </Button>
        </div>
      </form>

      {/* 3. Prescriptions & Medications */}
      <div className="p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/30 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="medication" className="text-primary text-lg" />
            <h4 className="font-label-lg font-bold text-on-surface">Prescriptions &amp; Medications</h4>
          </div>
          {!showAddMedForm && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddMedForm(true)}
            >
              + Prescribe Medication
            </Button>
          )}
        </div>

        {/* Medication List */}
        {medications.length === 0 ? (
          <p className="text-xs text-on-surface-variant italic py-2">No medications prescribed for this consultation.</p>
        ) : (
          <div className="space-y-2">
            {medications.map((med) => (
              <div
                key={med.id}
                className="flex items-center justify-between p-3 rounded-lg bg-surface-container-low border border-outline-variant/20 text-xs"
              >
                <div className="space-y-0.5">
                  <span className="font-semibold text-on-surface text-sm">{med.medicineName}</span>
                  <div className="text-on-surface-variant">
                    {med.dosage} · {med.frequency} · Duration: {med.duration}
                  </div>
                  {med.instructions && (
                    <div className="text-on-surface-variant italic">Note: {med.instructions}</div>
                  )}
                </div>

                <button
                  type="button"
                  disabled={deletingMedId === med.id}
                  onClick={() => handleDeleteMedication(med.id)}
                  className="p-1.5 text-error hover:bg-error-container/40 rounded-lg transition-colors"
                  title="Remove medication"
                  aria-label="Remove medication"
                >
                  <Icon name="delete" className="text-lg" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add Medication Form */}
        {showAddMedForm && (
          <form onSubmit={handleAddMedication} className="p-3 bg-surface-container-low rounded-lg border border-primary/20 space-y-3 mt-3">
            <h5 className="font-label-md font-semibold text-primary">New Medication</h5>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <Input
                label="Medicine Name & Strength"
                id="medName"
                placeholder="e.g. Telmisartan 40mg"
                required
                value={newMed.medicineName}
                onChange={(e) => setNewMed((prev) => ({ ...prev, medicineName: e.target.value }))}
              />
              <Input
                label="Dosage"
                id="medDosage"
                placeholder="e.g. 1 Tablet / 5 ml"
                required
                value={newMed.dosage}
                onChange={(e) => setNewMed((prev) => ({ ...prev, dosage: e.target.value }))}
              />
              <Input
                label="Frequency"
                id="medFreq"
                placeholder="e.g. Once daily in morning"
                required
                value={newMed.frequency}
                onChange={(e) => setNewMed((prev) => ({ ...prev, frequency: e.target.value }))}
              />
              <Input
                label="Duration"
                id="medDur"
                placeholder="e.g. 30 days"
                required
                value={newMed.duration}
                onChange={(e) => setNewMed((prev) => ({ ...prev, duration: e.target.value }))}
              />
            </div>

            <Input
              label="Instructions (Optional)"
              id="medInst"
              placeholder="e.g. Take after breakfast with water"
              value={newMed.instructions}
              onChange={(e) => setNewMed((prev) => ({ ...prev, instructions: e.target.value }))}
            />

            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setShowAddMedForm(false)}
              >
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit" disabled={addingMed}>
                {addingMed ? 'Adding...' : 'Add Prescription'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
