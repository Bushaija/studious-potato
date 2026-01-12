/**
 * Tests for PeriodLockBadge Component
 * 
 * This test file verifies the visual rendering and behavior
 * of the PeriodLockBadge component as per task 13 requirements.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PeriodLockBadge } from "../period-lock-badge";

describe("PeriodLockBadge - Visual Rendering", () => {
  it("renders nothing when period is not locked", () => {
    const { container } = render(<PeriodLockBadge isLocked={false} />);
    
    expect(container.firstChild).toBeNull();
  });

  it("renders Period Locked badge when period is locked", () => {
    render(<PeriodLockBadge isLocked={true} />);
    
    expect(screen.getByText("Period Locked")).toBeInTheDocument();
  });

  it("displays lock icon in the badge", () => {
    const { container } = render(<PeriodLockBadge isLocked={true} />);
    
    // Check for Lock icon (svg element)
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("renders with full lock details", () => {
    render(
      <PeriodLockBadge 
        isLocked={true}
        lockedAt="2025-01-15T14:30:00Z"
        lockedBy="John Doe"
        lockedReason="Report fully approved"
      />
    );
    
    expect(screen.getByText("Period Locked")).toBeInTheDocument();
  });

  it("renders with minimal details (only isLocked)", () => {
    render(<PeriodLockBadge isLocked={true} />);
    
    expect(screen.getByText("Period Locked")).toBeInTheDocument();
  });

  it("applies correct destructive styling classes", () => {
    const { container } = render(<PeriodLockBadge isLocked={true} />);
    
    const badge = container.querySelector('[data-slot="badge"]');
    expect(badge?.className).toContain("bg-red-100");
    expect(badge?.className).toContain("text-red-800");
  });

  it("renders as a tooltip trigger", () => {
    const { container } = render(<PeriodLockBadge isLocked={true} />);
    
    const tooltipTrigger = container.querySelector('[data-slot="tooltip-trigger"]');
    expect(tooltipTrigger).toBeTruthy();
  });

  it("does not render when isLocked is false even with other props", () => {
    const { container } = render(
      <PeriodLockBadge 
        isLocked={false}
        lockedAt="2025-01-15T14:30:00Z"
        lockedBy="John Doe"
        lockedReason="Report fully approved"
      />
    );
    
    expect(container.firstChild).toBeNull();
  });
});
