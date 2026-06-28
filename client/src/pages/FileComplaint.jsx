import { useState } from 'react';
import { Camera, ImagePlus, Send } from 'lucide-react';
import { DuplicateModal } from '../components/DuplicateModal.jsx';
import { MapPicker } from '../components/MapPicker.jsx';
import { createComplaint } from '../services/complaintService.js';

const initialForm = {
  title: '',
  description: '',
  addressString: '',
  image: null,
  location: null
};

export const FileComplaint = () => {
  const [form, setForm] = useState(initialForm);
  const [previewUrl, setPreviewUrl] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [duplicate, setDuplicate] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const updateField = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  };

  const updateImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setForm((current) => ({ ...current, image: file }));
    setPreviewUrl(URL.createObjectURL(file));
  };

  const updateLocation = (location) => {
    setForm((current) => ({ ...current, location }));
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not available in this browser.');
      return;
    }

    setIsLocating(true);
    setError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateLocation({
          latitude: Number(position.coords.latitude.toFixed(6)),
          longitude: Number(position.coords.longitude.toFixed(6))
        });
        setIsLocating(false);
      },
      () => {
        setError('Location permission was denied. Click the map to place the pin manually.');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const resetForm = () => {
    setForm(initialForm);
    setPreviewUrl('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!form.image) {
      setError('Please upload a clear image of the issue.');
      return;
    }

    if (!form.location) {
      setError('Please select the issue location on the map.');
      return;
    }

    setIsSubmitting(true);

    try {
      const data = await createComplaint({
        title: form.title,
        description: form.description,
        addressString: form.addressString,
        image: form.image,
        longitude: form.location.longitude,
        latitude: form.location.latitude
      });

      if (data.isDuplicate) {
        setDuplicate(data.complaint);
        resetForm();
      } else {
        setSuccess('Complaint submitted. CityFix has started routing it to the right team.');
        resetForm();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to submit this complaint right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="page-surface">
      <div className="page-header">
        <div>
          <span className="eyebrow">File complaint</span>
          <h1>Capture the issue clearly.</h1>
          <p>Submit a photo, description, and exact location so CityFix can route it without extra back-and-forth.</p>
        </div>
      </div>

      <form className="report-layout" onSubmit={handleSubmit}>
        <div className="report-main">
          <section className="workbench-panel report-section">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Step 1</span>
                <h2>Photo evidence</h2>
              </div>
              <Camera size={22} />
            </div>
            <label className="upload-box" htmlFor="image">
              {previewUrl ? (
                <img src={previewUrl} alt="Selected complaint preview" />
              ) : (
                <span>
                  <ImagePlus size={28} />
                  Upload issue image
                </span>
              )}
              <input id="image" name="image" type="file" accept="image/*" onChange={updateImage} />
            </label>
          </section>

          <section className="workbench-panel report-section">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Step 2</span>
                <h2>Issue details</h2>
              </div>
            </div>
            <div className="form-stack">
              <div className="field">
                <label htmlFor="title">Short title</label>
                <input id="title" name="title" value={form.title} onChange={updateField} placeholder="Broken streetlight near park" />
              </div>
              <div className="field">
                <label htmlFor="description">Description</label>
                <textarea id="description" name="description" value={form.description} onChange={updateField} rows="5" placeholder="Describe what is wrong and any immediate safety concern." />
              </div>
              <div className="field">
                <label htmlFor="addressString">Nearby address or landmark</label>
                <input id="addressString" name="addressString" value={form.addressString} onChange={updateField} placeholder="Ward, street, landmark" />
              </div>
            </div>
          </section>
        </div>

        <aside className="report-side">
          <section className="workbench-panel report-section">
            <span className="eyebrow">Step 3</span>
            <h2>Pin location</h2>
            <MapPicker
              value={form.location}
              onChange={updateLocation}
              onDetectLocation={detectLocation}
              isLocating={isLocating}
            />
          </section>

          <section className="workbench-panel submit-panel">
            {error && <div className="form-error">{error}</div>}
            {success && <div className="form-success">{success}</div>}
            <button className="primary-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                'Submitting...'
              ) : (
                <>
                  <Send size={18} />
                  Submit complaint
                </>
              )}
            </button>
            <p>Submissions outside the city boundary will be rejected by the backend geofence.</p>
          </section>
        </aside>
      </form>

      <DuplicateModal
        duplicate={duplicate}
        onConfirm={() => setDuplicate(null)}
        onClose={() => setDuplicate(null)}
      />
    </section>
  );
};
