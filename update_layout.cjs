const fs = require('fs');
let code = fs.readFileSync('src/components/Layout.tsx', 'utf8');

const targetStr = `                  <div className="p-3 sm:p-4 rounded-xl border border-slate-200/80 flex flex-wrap justify-between items-center bg-white shadow-xs mb-4 sm:mb-6 gap-3">
                    <div className="flex items-center space-x-2">`;
const replacementStr = `                  <div className="p-3 sm:p-4 rounded-xl border border-slate-200/80 flex flex-wrap justify-between items-center bg-white shadow-xs mb-4 sm:mb-6 gap-3 relative">
                    <div className="flex items-center space-x-2 z-10">`;
code = code.replace(targetStr, replacementStr);

const targetStr2 = `                      </span>
                    </div>

                    {/* Employee Profile Header */}`;
const replacementStr2 = `                      </span>
                    </div>

                    {/* Dashboard Slogan */}
                    <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 items-center text-[15px] font-black italic tracking-tight drop-shadow-sm z-0">
                      <span className="text-indigo-600">Work&nbsp;</span>
                      <span className="text-emerald-500">Smarter,</span>
                      <span className="text-slate-400 mx-1.5 font-semibold">Not</span>
                      <span className="text-rose-500">Harder</span>
                    </div>

                    {/* Employee Profile Header */}`;
code = code.replace(targetStr2, replacementStr2);

const targetStr3 = `                    {/* Employee Profile Header */}
                    <div className="relative" ref={profileMenuRef}>`;
const replacementStr3 = `                    {/* Employee Profile Header */}
                    <div className="relative z-10" ref={profileMenuRef}>`;
code = code.replace(targetStr3, replacementStr3);

fs.writeFileSync('src/components/Layout.tsx', code);
