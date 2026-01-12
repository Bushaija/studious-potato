import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { VersionComparison } from "../version-comparison";

// Mock the hooks
vi.mock("@/hooks/queries/financial-reports/use-report-versions", () => ({
  useReportVersions: vi.fn(() => ({
    data: {
      reportId: 1,
      currentVersion: "1.1",
      versions: [
        {
          id: 1,
          reportId: 1,
          versionNumber: "1.0",
          snapshotTimestamp: "2025-01-01T00:00:00Z",
          createdBy: 1,
          createdAt: "2025-01-01T00:00:00Z",
          changesSummary: "Initial version",
        },
        {
          id: 2,
          reportId: 1,
          versionNumber: "1.1",
          snapshotTimestamp: "2025-01-15T00:00:00Z",
          createdBy: 1,
          createdAt: "2025-01-15T00:00:00Z",
          changesSummary: "Updated values",
        },
      ],
    },
    isLoading: false,
  })),
}));

vi.mock("@/hooks/queries/financial-reports/use-version-comparison", () => ({
  useVersionComparison: vi.fn(() => ({
    data: undefined,
    isLoading: false,
  })),
}));

describe("VersionComparison", () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  it("renders version selectors", () => {
    render(<VersionComparison reportId={1} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText("Version 1 (Base)")).toBeInTheDocument();
    expect(screen.getByText("Version 2 (Compare)")).toBeInTheDocument();
  });

  it("displays prompt when no versions are selected", () => {
    render(<VersionComparison reportId={1} />, {
      wrapper: createWrapper(),
    });

    expect(
      screen.getByText("Select two versions above to compare their differences.")
    ).toBeInTheDocument();
  });

  it("renders with default versions", () => {
    render(
      <VersionComparison
        reportId={1}
        defaultVersion1="1.0"
        defaultVersion2="1.1"
      />,
      {
        wrapper: createWrapper(),
      }
    );

    expect(screen.getByText("Version 1 (Base)")).toBeInTheDocument();
    expect(screen.getByText("Version 2 (Compare)")).toBeInTheDocument();
  });
});
