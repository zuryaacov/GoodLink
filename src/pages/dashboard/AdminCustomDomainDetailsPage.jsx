import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const isLikelyTimestamp = (key) => /(_at|_time|timestamp)$/i.test(key);

const formatValue = (key, value) => {
  if (value === null || value === undefined || value === '') return '-';
  if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
    return JSON.stringify(value, null, 2);
  }
  if (typeof value === 'string' && isLikelyTimestamp(key)) {
    const dt = new Date(value);
    if (!Number.isNaN(dt.getTime())) return dt.toLocaleString();
  }
  return String(value);
};

const AdminCustomDomainDetailsPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [domainRow, setDomainRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDomain = async () => {
      setLoading(true);
      setError('');
      try {
        const { data, error: fetchError } = await supabase
          .from('custom_domains')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (fetchError) throw fetchError;
        if (!data) {
          setError('Domain details not found.');
          setDomainRow(null);
          return;
        }
        setDomainRow(data);
      } catch (err) {
        console.error('Error fetching domain details:', err);
        setError(err?.message || 'Failed to load domain details.');
        setDomainRow(null);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchDomain();
  }, [id]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-[#1b1b1b]">Custom Domain Details</h1>
        <button
          type="button"
          onClick={() => navigate('/dashboard/admin?view=custom-domains')}
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-[#1b1b1b] hover:bg-slate-100"
        >
          Back to Custom Domains
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
        {loading ? (
          <p className="text-slate-500 text-base font-medium">Loading...</p>
        ) : error ? (
          <p className="text-red-600 text-base font-medium">{error}</p>
        ) : !domainRow ? (
          <p className="text-slate-500 text-base font-medium">No data found.</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(domainRow).map(([key, value]) => {
              const formatted = formatValue(key, value);
              const isComplex = typeof value === 'object' && value !== null;

              return (
                <div key={key} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 sm:p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">{key}</p>
                  {isComplex ? (
                    <pre className="text-sm text-slate-800 whitespace-pre-wrap break-all">
                      {formatted}
                    </pre>
                  ) : (
                    <p className="text-sm sm:text-base font-medium text-[#1b1b1b] break-all">{formatted}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCustomDomainDetailsPage;
