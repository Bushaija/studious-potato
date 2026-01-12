/**
 * Version History Component Tests
 * 
 * Tests for the VersionHistory component that displays report version history.
 * Requirements: 5.3, 5.4, 8.1, 8.2
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { VersionHistory } from "../version-history";
import { useReportVersions } from "@/hooks/queries/financial-reports/use-report-versions";

// Mock the useReportVersions hook
vi.mock("@/hooks/queries/financial-reports/use-report-versions");

const mockUseReportVersions = useReportVersions as ReturnType<typeof vi.fn>;

// Test data
const mockVersionsData = {
  reportId: 123,
  currentVersion: "1.2",
  versions: [
    {
      id: 3,
      reportId: 123,
      versionNumber: "1.2",
      snapshotData: {} as any,
      snapshotChecksum: "checksum3",
      snapshotTimestamp: "2025-01-15T14:30:00Z",
      createdBy: 1,
      createdAt: "2025-01-15T14:30:00Z",
      changesSummary: "Updated amounts",
      creator: {
        id: 1,
        name: "John Doe",
        email: "john@example.com",
      },
    },
    {
      id: 2,
      reportId: 123,
      versionNumber: "1.1",
      snapshotData: {} as any,
      snapshotChecksum: "checksum2",
      snapshotTimestamp: "2025-01-10T09:00:00Z",
      createdBy: 2,
      createdAt: "2025-01-10T09:00:00Z",
      changesSummary: "Fixed calculation errors",
      creator: {
        id: 2,
        name: "Jane Smith",
        email: "jane@example.com",
      },
    },
    {
      id: 1,
      reportId: 123,
      versionNumber: "1.0",
      snapshotData: {} as any,
      snapshotChecksum: "checksum1",
      snapshotTimestamp: "2025-01-05T15:45:00Z",
      createdBy: 1,
      createdAt: "2025-01-05T15:45:00Z",
      changesSummary: null,
      creator: {
        id: 1,
        name: "John Doe",
        email: "john@example.com",
      },
    },
  ],
};

// Helper to render with QueryClient
function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe("VersionHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Loading State", () => {
    it("should display loading skeletons while fetching data", () => {
      mockUseReportVersions.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      } as any);

      renderWithQueryClient(<VersionHistory reportId={123} />);

      expect(screen.getByText("Version History")).toBeInTheDocument();
      // Skeletons are rendered but don't have accessible text
    });
  });

  describe("Error State", () => {
    it("should display error message when data fetching fails", () => {
      const error = new Error("Failed to fetch versions");
      mockUseReportVersions.mockReturnValue({
        data: undefined,
        isLoading: false,
        error,
      } as any);

      renderWithQueryClient(<VersionHistory reportId={123} />);

      expect(screen.getByText("Failed to load version history.")).toBeInTheDocument();
      expect(screen.getByText("Failed to fetch versions")).toBeInTheDocument();
    });
  });

  describe("Empty State", () => {
    it("should display empty state when no versions exist", () => {
      mockUseReportVersions.mockReturnValue({
        data: {
          reportId: 123,
          currentVersion: "1.0",
          versions: [],
        },
        isLoading: false,
        error: null,
      } as any);

      renderWithQueryClient(<VersionHistory reportId={123} />);

      expect(screen.getByText("No version history available.")).toBeInTheDocument();
      expect(
        screen.getByText("Versions are created when a report is submitted or resubmitted.")
      ).toBeInTheDocument();
    });
  });

  describe("Version List Display", () => {
    beforeEach(() => {
      mockUseReportVersions.mockReturnValue({
        data: mockVersionsData,
        isLoading: false,
        error: null,
      } as any);
    });

    it("should display all versions in the list", () => {
      renderWithQueryClient(<VersionHistory reportId={123} />);

      expect(screen.getByText("1.2")).toBeInTheDocument();
      expect(screen.getByText("1.1")).toBeInTheDocument();
      expect(screen.getByText("1.0")).toBeInTheDocument();
    });

    it("should display current version badge", () => {
      renderWithQueryClient(<VersionHistory reportId={123} />);

      expect(screen.getByText("Current: 1.2")).toBeInTheDocument();
      expect(screen.getByText("Current")).toBeInTheDocument();
    });

    it("should display creator names", () => {
      renderWithQueryClient(<VersionHistory reportId={123} />);

      expect(screen.getAllByText("John Doe")).toHaveLength(2);
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    });

    it("should display changes summaries", () => {
      renderWithQueryClient(<VersionHistory reportId={123} />);

      expect(screen.getByText("Updated amounts")).toBeInTheDocument();
      expect(screen.getByText("Fixed calculation errors")).toBeInTheDocument();
      expect(screen.getByText("Initial version")).toBeInTheDocument();
    });

    it("should display formatted timestamps", () => {
      renderWithQueryClient(<VersionHistory reportId={123} />);

      // Timestamps are formatted, so we check for partial matches
      expect(screen.getByText(/Jan 15/)).toBeInTheDocument();
      expect(screen.getByText(/Jan 10/)).toBeInTheDocument();
      expect(screen.getByText(/Jan 5/)).toBeInTheDocument();
    });

    it("should display total versions count", () => {
      renderWithQueryClient(<VersionHistory reportId={123} />);

      expect(screen.getByText(/Total versions:/)).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();
    });
  });

  describe("Action Buttons", () => {
    beforeEach(() => {
      mockUseReportVersions.mockReturnValue({
        data: mockVersionsData,
        isLoading: false,
        error: null,
      } as any);
    });

    it("should display View button for all versions", () => {
      renderWithQueryClient(<VersionHistory reportId={123} />);

      const viewButtons = screen.getAllByRole("button", { name: /View/i });
      expect(viewButtons).toHaveLength(3);
    });

    it("should display Compare button for non-current versions only", () => {
      renderWithQueryClient(<VersionHistory reportId={123} />);

      const compareButtons = screen.getAllByRole("button", { name: /Compare/i });
      // Only 2 compare buttons (for versions 1.1 and 1.0, not for current 1.2)
      expect(compareButtons).toHaveLength(2);
    });

    it("should call onViewVersion when View button is clicked", async () => {
      const user = userEvent.setup();
      const handleViewVersion = vi.fn();

      renderWithQueryClient(
        <VersionHistory reportId={123} onViewVersion={handleViewVersion} />
      );

      const viewButtons = screen.getAllByRole("button", { name: /View/i });
      await user.click(viewButtons[1]); // Click on version 1.1

      expect(handleViewVersion).toHaveBeenCalledWith("1.1");
    });

    it("should call onCompareVersion when Compare button is clicked", async () => {
      const user = userEvent.setup();
      const handleCompareVersion = vi.fn();

      renderWithQueryClient(
        <VersionHistory reportId={123} onCompareVersion={handleCompareVersion} />
      );

      const compareButtons = screen.getAllByRole("button", { name: /Compare/i });
      await user.click(compareButtons[0]); // Click on first compare button

      expect(handleCompareVersion).toHaveBeenCalledWith("1.1");
    });
  });

  describe("Current Version Highlighting", () => {
    beforeEach(() => {
      mockUseReportVersions.mockReturnValue({
        data: mockVersionsData,
        isLoading: false,
        error: null,
      } as any);
    });

    it("should highlight current version with special badge", () => {
      renderWithQueryClient(<VersionHistory reportId={123} />);

      // Current version should have "Current" badge
      expect(screen.getByText("Current")).toBeInTheDocument();
    });

    it("should not show Compare button for current version", () => {
      renderWithQueryClient(<VersionHistory reportId={123} />);

      const compareButtons = screen.getAllByRole("button", { name: /Compare/i });
      // Should only have 2 compare buttons (not 3)
      expect(compareButtons).toHaveLength(2);
    });
  });

  describe("Accessibility", () => {
    beforeEach(() => {
      mockUseReportVersions.mockReturnValue({
        data: mockVersionsData,
        isLoading: false,
        error: null,
      } as any);
    });

    it("should have proper table structure", () => {
      renderWithQueryClient(<VersionHistory reportId={123} />);

      expect(screen.getByRole("table")).toBeInTheDocument();
      expect(screen.getAllByRole("columnheader")).toHaveLength(5);
      expect(screen.getAllByRole("row")).toHaveLength(4); // 1 header + 3 data rows
    });

    it("should have accessible button labels", () => {
      renderWithQueryClient(<VersionHistory reportId={123} />);

      const viewButtons = screen.getAllByRole("button", { name: /View/i });
      const compareButtons = screen.getAllByRole("button", { name: /Compare/i });

      expect(viewButtons.length).toBeGreaterThan(0);
      expect(compareButtons.length).toBeGreaterThan(0);
    });
  });

  describe("Edge Cases", () => {
    it("should handle missing creator information", () => {
      const dataWithoutCreator = {
        ...mockVersionsData,
        versions: [
          {
            ...mockVersionsData.versions[0],
            creator: undefined,
          },
        ],
      };

      mockUseReportVersions.mockReturnValue({
        data: dataWithoutCreator,
        isLoading: false,
        error: null,
      } as any);

      renderWithQueryClient(<VersionHistory reportId={123} />);

      expect(screen.getByText("Unknown")).toBeInTheDocument();
    });

    it("should handle null changes summary", () => {
      renderWithQueryClient(<VersionHistory reportId={123} />);

      // Version 1.0 has null changesSummary, should show "Initial version"
      expect(screen.getByText("Initial version")).toBeInTheDocument();
    });

    it("should handle single version", () => {
      const singleVersionData = {
        reportId: 123,
        currentVersion: "1.0",
        versions: [mockVersionsData.versions[2]],
      };

      mockUseReportVersions.mockReturnValue({
        data: singleVersionData,
        isLoading: false,
        error: null,
      } as any);

      renderWithQueryClient(<VersionHistory reportId={123} />);

      expect(screen.getByText("1.0")).toBeInTheDocument();
      expect(screen.getByText("Total versions:")).toBeInTheDocument();
      expect(screen.getByText("1")).toBeInTheDocument();
    });
  });

  describe("Integration", () => {
    it("should work without callback handlers", () => {
      mockUseReportVersions.mockReturnValue({
        data: mockVersionsData,
        isLoading: false,
        error: null,
      } as any);

      // Should not throw error when callbacks are not provided
      expect(() => {
        renderWithQueryClient(<VersionHistory reportId={123} />);
      }).not.toThrow();
    });

    it("should handle undefined reportId gracefully", () => {
      mockUseReportVersions.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
      } as any);

      renderWithQueryClient(<VersionHistory reportId={undefined as any} />);

      // Should render without crashing
      expect(screen.getByText("Version History")).toBeInTheDocument();
    });
  });
});
