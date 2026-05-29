
import React, { useEffect, useRef } from 'react';

interface CodeSandboxProps {
  code: string;
  language: string;
  onClose: () => void;
}

export const CodeSandbox: React.FC<CodeSandboxProps> = ({ code, language, onClose }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!iframeRef.current) return;

    let content = '';
    const escapedCode = code
      .replace(/\\/g, '\\\\')
      .replace(/`/g, '\\`')
      .replace(/\$/g, '\\$');

    if (language === 'html' || language === 'xml') {
      content = code;
    } else if (['javascript', 'js', 'typescript', 'ts'].includes(language)) {
      content = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: 'Fira Code', monospace; background: #0f172a; color: #f8fafc; padding: 20px; }
              pre { background: #1e293b; padding: 12px; border-radius: 8px; overflow: auto; border: 1px solid #334155; margin-bottom: 8px; }
            </style>
          </head>
          <body>
            <div id="root"></div>
            <script>
              const root = document.getElementById('root');
              const originalLog = console.log;
              console.log = (...args) => {
                const p = document.createElement('pre');
                p.textContent = args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : a).join(' ');
                root.appendChild(p);
                originalLog(...args);
              };
              try {
                ${code}
              } catch (e) {
                console.log('Error:', e.message);
              }
            </script>
          </body>
        </html>
      `;
    } else if (language === 'python' || language === 'py') {
      content = `
        <!DOCTYPE html>
        <html>
          <head>
            <script src="https://cdn.jsdelivr.net/pyodide/v0.26.1/full/pyodide.js"></script>
            <style>
              body { font-family: 'Fira Code', monospace; background: #0f172a; color: #f8fafc; padding: 20px; font-size: 14px; }
              pre { background: #1e293b; padding: 12px; border-radius: 8px; overflow: auto; border: 1px solid #334155; margin-bottom: 8px; }
              .loading { color: #818cf8; animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
              .error { border-color: #ef444450; color: #f87171; }
              @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
            </style>
          </head>
          <body>
            <div id="output"><p class="loading">Initializing Python (Pyodide WASM)...</p></div>
            <script>
              const output = document.getElementById('output');
              window.printToWeb = (text, isError = false) => {
                if (!text || text === '\\n') return;
                const p = document.createElement('pre');
                if (isError) p.className = 'error';
                p.textContent = text;
                output.appendChild(p);
              };

              async function main() {
                try {
                  const pyodide = await loadPyodide();
                  output.innerHTML = ''; // clear loading
                  
                  // Setup IO redirection
                  pyodide.runPython(\`
import sys
import io
from js import printToWeb

class WebOutput:
    def __init__(self, is_error=False):
        self.is_error = is_error
    def write(self, s):
        printToWeb(s, self.is_error)
    def flush(self):
        pass

sys.stdout = WebOutput()
sys.stderr = WebOutput(is_error=True)
                  \`);

                  await pyodide.runPythonAsync(\`${escapedCode}\`);
                } catch (e) {
                  window.printToWeb('Runtime Error: ' + e.message, true);
                }
              }
              main();
            </script>
          </body>
        </html>
      `;
    } else {
      content = `<html><body style="background: #0f172a; color: #f8fafc; font-family: sans-serif; padding: 20px;">
        <p>Execution for <b>${language}</b> is currently only supported via browser simulations.</p>
        <pre style="background: #1e293b; padding: 10px; border-radius: 8px; border: 1px solid #334155;">${code}</pre>
      </body></html>`;
    }

    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    iframeRef.current.src = url;

    return () => URL.revokeObjectURL(url);
  }, [code, language]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-10 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-slate-900 w-full h-full max-w-6xl rounded-2xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
              <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
            </div>
            <span className="text-sm font-semibold text-slate-300 ml-2 uppercase tracking-widest text-xs">Sandbox Runtime • {language}</span>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 bg-white">
          <iframe 
            ref={iframeRef}
            title="Code Sandbox"
            className="w-full h-full border-none"
            sandbox="allow-scripts"
          />
        </div>
        <div className="px-6 py-3 bg-slate-900 border-t border-slate-800 text-[10px] text-slate-500 uppercase tracking-tighter">
          Aetheris Sandbox • WebAssembly Isolation Active
        </div>
      </div>
    </div>
  );
};
