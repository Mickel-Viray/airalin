import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function SubjectLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Back button skeleton */}
      <div className="flex items-center w-fit text-slate-300">
        <ArrowLeft className="h-4 w-4 mr-1" />
        <div className="h-4 w-32 bg-slate-200 rounded"></div>
      </div>
      
      {/* Header skeleton */}
      <div className="border-b pb-4 mt-2">
        <div className="h-8 w-64 bg-slate-200 rounded mb-3"></div>
        <div className="h-4 w-96 bg-slate-200 rounded"></div>
      </div>

      {/* Two-column layout skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="h-6 w-32 bg-slate-200 rounded mb-4"></div>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 bg-slate-100 rounded-xl border border-slate-200"></div>
            ))}
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="h-6 w-24 bg-slate-200 rounded mb-4"></div>
          <div className="h-64 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl"></div>
        </div>
      </div>
    </div>
  );
}