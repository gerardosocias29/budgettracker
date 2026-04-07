import { useState } from 'react';
import { X, Download, FileText, ZoomIn, ZoomOut } from 'lucide-react';

export default function ProofModal({ url, onClose }) {
  const [zoom, setZoom] = useState(1);

  if (!url) return null;

  const isPdf = url.toLowerCase().endsWith('.pdf');

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex flex-col" onClick={onClose}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0" onClick={e => e.stopPropagation()}>
        <p className="text-white/70 text-sm font-medium">Proof</p>
        <div className="flex items-center gap-2">
          {!isPdf && (
            <>
              <button onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition">
                <ZoomOut size={16} className="text-white" />
              </button>
              <button onClick={() => setZoom(z => Math.min(3, z + 0.25))} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition">
                <ZoomIn size={16} className="text-white" />
              </button>
            </>
          )}
          <a href={url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition" onClick={e => e.stopPropagation()}>
            <Download size={16} className="text-white" />
          </a>
          <button onClick={onClose} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition">
            <X size={16} className="text-white" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
        {isPdf ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4">
            <FileText size={48} className="text-white/40" />
            <p className="text-white/60 text-sm">PDF Document</p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition"
            >
              Open PDF
            </a>
          </div>
        ) : (
          <img
            src={url}
            alt="Proof"
            className="max-w-full max-h-full object-contain rounded-lg transition-transform duration-200"
            style={{ transform: `scale(${zoom})` }}
            draggable={false}
          />
        )}
      </div>
    </div>
  );
}
