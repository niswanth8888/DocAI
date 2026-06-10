import React from 'react';
import { FileText, Award, Layers, Download } from 'lucide-react';
import { SourceCitation } from '../types/api';
import { formatPercent } from '../utils/formatters';
import { API_BASE_URL } from '../api/client';

interface SourceCardProps {
  source: SourceCitation;
}

const SourceCard: React.FC<SourceCardProps> = ({ source }) => {
  const downloadBase = API_BASE_URL;
  const downloadUrl = source.download_url 
    ? (source.download_url.startsWith('http') ? source.download_url : `${downloadBase}${source.download_url}`)
    : `${downloadBase}/documents/${source.document_id}/download`;

  return (
    <div className="glass-panel hover:border-[#333333] transition-all duration-300 rounded-xl p-5 border border-slate-800/80 hover:shadow-xl relative overflow-hidden group">
      {/* Subtle indicator bar */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#2A2A2A] group-hover:bg-[#333333] transition-all duration-300" />
      
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#181818] text-slate-450 border border-[#2a2a2a]">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-100 group-hover:text-cyan-400 transition-colors duration-200">
              {source.document}
            </h4>
            <span className="text-slate-400 text-xs font-medium">
              Page {source.page}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-800/50 text-[10px] text-slate-400 border border-slate-700/40">
            <Layers className="w-3 h-3 text-violet-400" />
            <code className="text-violet-300">{source.chunk_id}</code>
          </div>
          {source.citation_relevance_score !== undefined && source.citation_relevance_score !== null && (
            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">
              <span>Citation Relevance: {formatPercent(source.citation_relevance_score)}</span>
            </div>
          )}
          <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-bold">
            <Award className="w-3.5 h-3.5" />
            <span>Evidence Match: {formatPercent(source.similarity_score)}</span>
          </div>
        </div>
      </div>

      <div className="relative mt-3 p-3 rounded-lg bg-slate-950/40 border border-slate-900 text-xs leading-relaxed text-slate-300">
        <div className="absolute -top-1 left-2 px-1 bg-[#090e1a] text-[9px] text-slate-500 uppercase tracking-widest font-semibold border-x border-slate-900">
          Relevant Evidence
        </div>
        <p className="italic pt-1">
          "{source.evidence}"
        </p>
      </div>

      {source.citation_support_summary && (
        <div className="mt-3 p-3 rounded-lg bg-[#141414] border border-[#222222] text-xs leading-relaxed text-slate-300">
          <div className="text-[10px] text-emerald-400 font-semibold mb-1 uppercase tracking-wider">
            Why this supports the answer
          </div>
          <p className="text-slate-200">
            {source.citation_support_summary}
          </p>
        </div>
      )}

      <div className="mt-3 flex justify-end">
        <a
          href={downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          download
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#181818] hover:bg-[#222222] border border-[#2A2A2A] rounded-lg text-xs font-bold text-[#F5F5F5] transition-all duration-300"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download Original</span>
        </a>
      </div>
    </div>
  );
};

export default SourceCard;
