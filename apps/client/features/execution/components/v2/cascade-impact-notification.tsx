"use client"

import React from 'react';
import { Info, CheckCircle, Clock, ExternalLink } from 'lucide-react';
import type { CascadeImpact, Quarter } from '@/features/execution/types/quarterly-rollover';

/**
 * Cascade Impact Notification Component
 * 
 * Displays a notification when a quarter update affects subsequent quarters.
 * Shows which quarters were immediately recalculated vs. queued for background processing.
 * 
 * Requirements: 8.5
 */

interface CascadeImpactNotificationProps {
  /** Cascade impact metadata from API response */
  cascadeImpact: CascadeImpact | null | undefined;
  /** Current quarter that was updated */
  currentQuarter: Quarter;
  /** Callback to navigate to a specific quarter */
  onViewQuarter?: (quarter: Quarter) => void;
  /** Whether to show the notification (can be dismissed) */
  isVisible?: boolean;
  /** Callback when notification is dismissed */
  onDismiss?: () => void;
}

export function CascadeImpactNotification({
  cascadeImpact,
  currentQuarter,
  onViewQuarter,
  isVisible = true,
  onDismiss,
}: CascadeImpactNotificationProps) {
  // Don't show if no cascade impact or not visible
  if (!cascadeImpact || !isVisible || cascadeImpact.status === 'none') {
    return null;
  }

  const hasImmediateRecalc = cascadeImpact.immediatelyRecalculated.length > 0;
  const hasQueuedRecalc = cascadeImpact.queuedForRecalculation.length > 0;

  return (
    <div className="bg-blue-50 border border-blue-300 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-900 mb-1">
                Quarter Update Complete
              </h3>
              <p className="text-sm text-blue-800 mb-3">
                {currentQuarter} has been updated successfully. This update affects subsequent quarters.
              </p>

              {/* Immediately Recalculated Quarters */}
              {hasImmediateRecalc && (
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-xs font-semibold text-blue-900 uppercase tracking-wide">
                      Recalculated
                    </span>
                  </div>
                  <p className="text-xs text-blue-700 mb-2">
                    The following quarters have been updated with new opening balances:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {cascadeImpact.immediatelyRecalculated.map((quarter) => (
                      <button
                        key={quarter}
                        onClick={() => onViewQuarter?.(quarter)}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 hover:bg-green-200 text-green-800 text-xs font-medium rounded transition-colors"
                      >
                        {quarter}
                        {onViewQuarter && <ExternalLink className="h-3 w-3" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Queued for Background Recalculation */}
              {hasQueuedRecalc && (
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="text-xs font-semibold text-blue-900 uppercase tracking-wide">
                      Processing
                    </span>
                  </div>
                  <p className="text-xs text-blue-700 mb-2">
                    The following quarters are being updated in the background:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {cascadeImpact.queuedForRecalculation.map((quarter) => (
                      <button
                        key={quarter}
                        onClick={() => onViewQuarter?.(quarter)}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 text-xs font-medium rounded transition-colors"
                      >
                        {quarter}
                        {onViewQuarter && <ExternalLink className="h-3 w-3" />}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-blue-600 mt-2 italic">
                    You'll be notified when the background recalculation is complete.
                  </p>
                </div>
              )}

              {/* Status Summary */}
              <div className="text-xs text-blue-700 pt-2 border-t border-blue-200">
                <strong>Impact Summary:</strong> {cascadeImpact.affectedQuarters.length}{' '}
                {cascadeImpact.affectedQuarters.length === 1 ? 'quarter' : 'quarters'} affected
                {cascadeImpact.status === 'partial_complete' && ' (partially complete)'}
                {cascadeImpact.status === 'complete' && ' (complete)'}
              </div>
            </div>

            {onDismiss && (
              <button
                onClick={onDismiss}
                className="ml-4 p-1 hover:bg-blue-100 rounded transition-colors text-blue-700 hover:text-blue-900"
                aria-label="Dismiss notification"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
