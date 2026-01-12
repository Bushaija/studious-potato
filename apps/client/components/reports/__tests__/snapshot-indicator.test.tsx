/**
 * Tests for SnapshotIndicator Component
 * 
 * This test file verifies the visual rendering and behavior
 * of the SnapshotIndicator component as per task 12 requirements.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SnapshotIndicator } from "../snapshot-indicator";

describe("SnapshotIndicator - Visual Rendering", () => {
  it("renders Live Data badge for draft reports", () => {
    render(<SnapshotIndicator isSnapshot={false} />);
    
    expect(screen.getByText("Live Data")).toBeInTheDocument();
  });

  it("renders Snapshot badge for submitted/approved reports", () => {
    render(
      <SnapshotIndicator 
        isSnapshot={true} 
        snapshotTimestamp="2025-01-15T14:30:00Z" 
      />
    );
    
    expect(screen.getByText("Snapshot")).toBeInTheDocument();
  });

  it("displays snapshot timestamp when provided", () => {
    render(
      <SnapshotIndicator 
        isSnapshot={true} 
        snapshotTimestamp="2025-01-15T14:30:00Z" 
      />
    );
    
    expect(screen.getByText(/Captured:/)).toBeInTheDocument();
  });

  it("renders outdated warning badge when source data changed", () => {
    render(
      <SnapshotIndicator 
        isSnapshot={true} 
        snapshotTimestamp="2025-01-15T14:30:00Z"
        isOutdated={true}
      />
    );
    
    expect(screen.getByText("Source data changed")).toBeInTheDocument();
  });

  it("does not render outdated badge for live data", () => {
    render(
      <SnapshotIndicator 
        isSnapshot={false}
        isOutdated={true}
      />
    );
    
    expect(screen.queryByText("Source data changed")).not.toBeInTheDocument();
  });

  it("includes appropriate icons for each state", () => {
    const { container, rerender } = render(
      <SnapshotIndicator isSnapshot={false} />
    );
    
    // Live data should have Activity icon
    expect(container.querySelector("svg")).toBeTruthy();
    
    // Snapshot should have Camera icon
    rerender(
      <SnapshotIndicator 
        isSnapshot={true} 
        snapshotTimestamp="2025-01-15T14:30:00Z" 
      />
    );
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("applies correct styling classes for Live Data badge", () => {
    const { container } = render(<SnapshotIndicator isSnapshot={false} />);
    
    const badge = container.querySelector('[data-slot="badge"]');
    expect(badge?.className).toContain("bg-blue-50");
  });

  it("applies correct styling classes for Snapshot badge", () => {
    const { container } = render(
      <SnapshotIndicator 
        isSnapshot={true} 
        snapshotTimestamp="2025-01-15T14:30:00Z" 
      />
    );
    
    const badge = container.querySelector('[data-slot="badge"]');
    expect(badge?.className).toContain("bg-gray-100");
  });
});
