import React, { useState } from 'react';
import { 
  X, Database, Check, Copy, Terminal, ExternalLink, 
  Layers, Cloud, ShieldCheck, Zap 
} from 'lucide-react';

interface R2DeploymentGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface R2DeploymentGuideModalContentProps {
  onClose: () => void;
}

const R2DeploymentGuideModalContent: React.FC<R2DeploymentGuideModalContentProps> = ({
  onClose
}) => {
  const [copiedStep, setCopiedStep] = useState<number | null>(null);

  const copyText = (text: string, stepId: number) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(stepId);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  const wranglerConfig = `name = "spidey-jersey-store"
compatibility_date = "2026-03-01"
assets = { directory = "./dist", binding = "ASSETS" }

[[r2_buckets]]
binding = "MY_BUCKET"
bucket_name = "spidey-jersey-images"`;

  return (
    <div
      id="r2-guide-modal-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto"
    >
      <div
        id="r2-guide-modal-content"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl rounded-3xl glass-panel bg-slate-950/95 border border-white/20 shadow-2xl p-6 sm:p-8 my-8 max-h-[90vh] overflow-y-auto space-y-6"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white font-mono">
                Cloudflare Workers & R2 Storage Architecture
              </h2>
              <p className="text-xs text-slate-400">
                Binding: <code className="text-cyan-300">MY_BUCKET</code> • Bucket: <code className="text-cyan-300">spidey-jersey-images</code>
              </p>
            </div>
          </div>
          <button
            id="close-r2-guide-btn"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Architecture Specs Highlight */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-white/10 space-y-1">
            <div className="text-[11px] font-mono text-slate-400">1. Edge Object Store</div>
            <div className="text-sm font-bold text-white">Cloudflare R2</div>
            <p className="text-[10px] text-slate-500">Zero egress fees, multi-region asset caching.</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-white/10 space-y-1">
            <div className="text-[11px] font-mono text-slate-400">2. Serverless API</div>
            <div className="text-sm font-bold text-white">Worker / Pages</div>
            <p className="text-[10px] text-slate-500">Direct streaming via <code className="text-cyan-300">env.MY_BUCKET</code>.</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-white/10 space-y-1">
            <div className="text-[11px] font-mono text-slate-400">3. Frontend Assets</div>
            <div className="text-sm font-bold text-white">Vite SPA Dist</div>
            <p className="text-[10px] text-slate-500">Served lightning-fast from Cloudflare global edge.</p>
          </div>
        </div>

        {/* Root wrangler.toml inspection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span className="font-mono flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span>/wrangler.toml (Root Template)</span>
            </span>
            <button
              id="copy-wrangler-modal-btn"
              onClick={() => copyText(wranglerConfig, 1)}
              className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-[11px]"
            >
              {copiedStep === 1 ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedStep === 1 ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <pre className="p-4 rounded-2xl bg-slate-900 border border-white/10 text-xs font-mono text-cyan-300 overflow-x-auto">
            {wranglerConfig}
          </pre>
        </div>

        {/* 3 Step Deployment Instructions */}
        <div className="space-y-4 pt-2">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
            Deploy to Cloudflare Pages in 3 Commands:
          </h3>

          {/* Step 1 */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">
                Step 1: Create the Cloudflare R2 Bucket
              </span>
              <button
                onClick={() => copyText('npx wrangler r2 bucket create spidey-jersey-images', 2)}
                className="text-xs text-slate-400 hover:text-cyan-300 flex items-center gap-1"
              >
                {copiedStep === 2 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedStep === 2 ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <code className="block p-2.5 rounded-xl bg-slate-950 text-cyan-300 font-mono text-xs overflow-x-auto">
              npx wrangler r2 bucket create spidey-jersey-images
            </code>
          </div>

          {/* Step 2 */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">
                Step 2: Build the Production Frontend
              </span>
              <button
                onClick={() => copyText('npm run build', 3)}
                className="text-xs text-slate-400 hover:text-cyan-300 flex items-center gap-1"
              >
                {copiedStep === 3 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedStep === 3 ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <code className="block p-2.5 rounded-xl bg-slate-950 text-cyan-300 font-mono text-xs overflow-x-auto">
              npm run build
            </code>
          </div>

          {/* Step 3 */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">
                Step 3: Deploy to Cloudflare Workers (Backend + R2 + Frontend SPA)
              </span>
              <button
                onClick={() => copyText('npx wrangler deploy', 4)}
                className="text-xs text-slate-400 hover:text-cyan-300 flex items-center gap-1"
              >
                {copiedStep === 4 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedStep === 4 ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <code className="block p-2.5 rounded-xl bg-slate-950 text-cyan-300 font-mono text-xs overflow-x-auto">
              npx wrangler deploy
            </code>
            <p className="text-[11px] text-slate-400">
              এটি <code>worker.ts</code> এবং <code>./dist</code> ফ্রন্টএন্ড অ্যাসেট একসাথে ডেপ্লয় করবে এবং <code>spidey.&lt;user&gt;.workers.dev</code> লিংক তৈরি করবে (404-ফ্রি SPA রাউটিং সহ)।
            </p>
          </div>
        </div>

        <div className="pt-2 text-right">
          <button
            id="close-guide-done-btn"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export const R2DeploymentGuideModal: React.FC<R2DeploymentGuideModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return <R2DeploymentGuideModalContent onClose={onClose} />;
};
