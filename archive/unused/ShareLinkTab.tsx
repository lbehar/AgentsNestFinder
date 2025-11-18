'use client';

import { useState } from 'react';

interface ShareLinkTabProps {
  agency: any;
}

export default function ShareLinkTab({ agency }: ShareLinkTabProps) {
  const [copied, setCopied] = useState(false);
  const bookingLink = agency?.slug
    ? `nestfinder.uk/${agency.slug}`
    : 'nestfinder.uk/your-agency';

  const fullLink = `https://${bookingLink}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(fullLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openPublicPage = () => {
    window.open(fullLink, '_blank');
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Share Booking Link</h2>

      <div className="bg-white rounded-xl shadow-sm p-8">
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Your Booking Link
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={fullLink}
              readOnly
              className="flex-1 px-4 py-3 border border-slate-300 rounded-xl bg-slate-50 font-mono text-sm"
            />
            <button
              onClick={copyToClipboard}
              className="px-6 py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition"
            >
              {copied ? '✓ Copied' : 'Copy Link'}
            </button>
          </div>
        </div>

        <button
          onClick={openPublicPage}
          className="w-full px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition mb-6"
        >
          Open Public Page
        </button>

        <div className="bg-slate-50 rounded-xl p-6">
          <h3 className="font-semibold text-slate-900 mb-3">
            📝 SpareRoom Listing Snippet
          </h3>
          <p className="text-sm text-slate-600 mb-4">
            Copy and paste this into your SpareRoom property description:
          </p>
          <div className="bg-white border border-slate-200 rounded-lg p-4 font-mono text-sm">
            <p className="text-slate-800">
              📅 <strong>Book a viewing directly:</strong>{' '}
              <a href={fullLink} className="text-primary-600 hover:underline">
                {fullLink}
              </a>
            </p>
          </div>
          <button
            onClick={() => {
              const snippet = `📅 Book a viewing directly: ${fullLink}`;
              navigator.clipboard.writeText(snippet);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="mt-4 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-300 transition"
          >
            Copy Snippet
          </button>
        </div>
      </div>
    </div>
  );
}

