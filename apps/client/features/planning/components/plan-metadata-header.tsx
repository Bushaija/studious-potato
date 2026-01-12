import React from 'react';
import { PlanMetadata, PlanStatus } from '../types';
import { toTitleCase } from "@/components/reports/report-header"

const StatusBadge = ({ status }: { status: PlanStatus | undefined }) => {
  const baseClasses = "inline-block px-2 py-1 text-xs rounded-full";
  const statusClasses: Record<PlanStatus, string> = {
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    pending: 'bg-yellow-100 text-yellow-800',
    draft: 'bg-gray-100 text-gray-800',
  };

  return (
    <span className={`${baseClasses} ${statusClasses[status || 'draft']}`}>
      {status}
    </span>
  );
};

export function PlanMetadataHeader({
  program = "No Program Selected",
  facilityName = "Facility",
  facilityType = "Type",
  // district = "District",
  // province = "Province",
  // period = "Current Period",
  // status = "draft",
  // createdBy = "Not specified",
}: PlanMetadata) {
  return (
    <div className="px-4 py-2 border-b">
        <div className="flex justify-between items-start">
            <div>
                <h2 className="text-md font-semibold mb-2 capitalize">{program.toUpperCase()} NSP detailed plan of action</h2>
                <div className="space-y-0 text-sm text-gray-600">
                    <div className="flex">
                        {/* <span className="font-semibold w-20">Facility:</span> */}
                        <span>{toTitleCase(facilityName)} {toTitleCase(facilityType)}</span>
                    </div>
                    {/* <div className="flex">
                        <span className="font-semibold w-20">District:</span>
                        <span>{district}, {province}</span>
                    </div>
                    <div className="flex">
                        <span className="font-semibold w-20">Period:</span>
                        <span>{period}</span>
                    </div> */}
                </div>
            </div>
            <div className="text-right">
                {/* <div className="space-y-1 text-sm">
                    <div className="flex items-center justify-end">
                        <span className="font-semibold w-24 text-left">Status:</span>
                        <span className="capitalize">
                            <StatusBadge status={status} />
                        </span>
                    </div>
                    <div className="flex items-center justify-end">
                        <span className="font-semibold w-24 text-left">Created by:</span>
                        <span>{createdBy}</span>
                    </div>
                </div> */}
            </div>
        </div>
    </div>
  );
} 