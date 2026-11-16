import { describe, it, expect, beforeEach, vi } from "vitest";
import {
    render,
    screen,
    waitFor,
    within,
    fireEvent
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import FreelancerDashboard from "../pages/FreelancerDashboard";
import { useAuth } from "../context/AuthContext";
import { getGigs, deleteGig } from "../services/gigService";
import { getFreelancerIncome } from "../services/transactionService";

vi.mock("../context/AuthContext", () => ({
    useAuth: vi.fn()
}));

vi.mock("../services/gigService", () => ({
    getGigs: vi.fn(),
    deleteGig: vi.fn()
}));

vi.mock("../services/transactionService", () => ({
    getFreelancerIncome: vi.fn()
}));

// Booking requests are tested separately from the financial dashboard.
vi.mock("../components/FreelancerBookingRequests", () => ({
    default: ({ onBookingCompleted }) => (
        <button type="button" onClick={onBookingCompleted}>
            Simulate booking completion
        </button>
    )
}));

const defaultIncome = {
    freelancerId: "freelancer-1",
    taxYear: 2027,
    totalIncome: 100000,
    estimatedTax: 180,
    incomeAfterTax: 99820,
    transactionCount: 2,
    transactions: [],
    disclaimer:
        "This is an estimate, not a SARS assessment or professional tax advice."
};

function renderDashboard() {
    return render(
        <MemoryRouter>
            <FreelancerDashboard />
        </MemoryRouter>
    );
}

function getMetric(label) {
    const labelElement = screen.getByText(label);
    const metric = labelElement.closest("article");

    return metric.querySelector("strong");
}

describe("Freelancer financial dashboard", () => {
    beforeEach(() => {
        vi.clearAllMocks();

        useAuth.mockReturnValue({
            user: {
                id: "freelancer-1",
                name: "Test Freelancer"
            }
        });

        getGigs.mockResolvedValue({
            data: []
        });

        getFreelancerIncome.mockResolvedValue({
            data: { ...defaultIncome }
        });
    });

    // ── Existing dashboard behaviour (from Thomas/Testing) ──────────────

    it("renders the freelancer workspace heading and the freelancer's own gigs", async () => {
        getGigs.mockResolvedValue({
            data: [
                {
                    id: "gig-1",
                    title: "Full Stack Development",
                    description: "Modern Node and React web solutions.",
                    category: "Web Development",
                    price: 2500,
                    freelancer: { id: "freelancer-1" }
                }
            ]
        });

        renderDashboard();

        expect(
            screen.getByText(/FREELANCER WORKSPACE/i)
        ).toBeInTheDocument();

        expect(
            await screen.findByText("Full Stack Development")
        ).toBeInTheDocument();
    });

    it("handles gig deletion after confirmation", async () => {
        vi.spyOn(window, "confirm").mockReturnValue(true);
        deleteGig.mockResolvedValue({ success: true });
        getGigs.mockResolvedValue({
            data: [
                {
                    id: "gig-to-delete",
                    title: "Temporary Gig",
                    description: "This gig will be removed by test.",
                    category: "Other",
                    price: 300,
                    freelancer: { id: "freelancer-1" }
                }
            ]
        });

        renderDashboard();

        expect(
            await screen.findByText("Temporary Gig")
        ).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: /Delete/i }));

        await waitFor(() => {
            expect(deleteGig).toHaveBeenCalledWith("gig-to-delete");
            expect(
                screen.getByText(/Gig deleted successfully/i)
            ).toBeInTheDocument();
            expect(
                screen.queryByText("Temporary Gig")
            ).not.toBeInTheDocument();
        });
    });

    // ── Financial dashboard behaviour (from Tax-Nafees) ─────────────────

    it("displays total earnings from the income API", async () => {
        renderDashboard();

        const totalIncome = await screen.findByText(
            "Total completed income"
        );

        const metric = within(
            totalIncome.closest("article")
        ).getByRole("strong");

        expect(metric).toHaveTextContent("100");
    });

    it("displays estimated tax from the income API", async () => {
        renderDashboard();

        const taxLabel = await screen.findByText(
            "Estimated income tax"
        );

        const metric = within(
            taxLabel.closest("article")
        ).getByRole("strong");

        expect(metric).toHaveTextContent("180");
    });

    it("displays estimated income after tax", async () => {
        renderDashboard();

        const afterTaxLabel = await screen.findByText(
            "Estimated income after tax"
        );

        const metric = within(
            afterTaxLabel.closest("article")
        ).getByRole("strong");

        expect(metric).toHaveTextContent("99");
    });

    it("displays the correct transaction count", async () => {
        renderDashboard();

        expect(
            await screen.findByText("2 completed transactions")
        ).toBeInTheDocument();
    });

    it("refreshes income after a booking is completed", async () => {
    getFreelancerIncome
        .mockResolvedValueOnce({
            data: {
                ...defaultIncome,
                totalIncome: 0,
                estimatedTax: 0,
                incomeAfterTax: 0,
                transactionCount: 0
            }
        })
        .mockResolvedValueOnce({
            data: {
                ...defaultIncome,
                totalIncome: 700,
                estimatedTax: 0,
                incomeAfterTax: 700,
                transactionCount: 1
            }
        });

    renderDashboard();

    await screen.findByText("No completed transactions yet");

    fireEvent.click(
        screen.getByRole("button", {
            name: "Simulate booking completion"
        })
    );

    await waitFor(() => {
        expect(getMetric("Total completed income"))
            .toHaveTextContent("700");

        expect(screen.getByText("1 completed transaction"))
            .toBeInTheDocument();

        expect(getFreelancerIncome).toHaveBeenCalledTimes(2);
    });
});

    it("displays the selected tax year", async () => {
        renderDashboard();

        expect(
            await screen.findByText("Tax year 2027")
        ).toBeInTheDocument();
    });

    it("shows the income breakdown chart when financial data exists", async () => {
        renderDashboard();

        const chart = await screen.findByRole("img", {
            name: /Income breakdown/
        });

        expect(chart).toBeInTheDocument();
    });

    it("uses the correct proportions for the income chart", async () => {
        const { container } = renderDashboard();

        await screen.findByRole("img", {
            name: /Income breakdown/
        });

        const afterTaxBar = container.querySelector(
            ".financial-chart-after-tax"
        );

        const taxBar = container.querySelector(
            ".financial-chart-tax"
        );

        // R99,820 / R100,000 = 99.82%
        expect(afterTaxBar.getAttribute("width")).toBe("99.82");

        // R180 / R100,000 = 0.18%
        expect(taxBar.getAttribute("width")).toBe("0.18");
    });

    it("shows the empty financial state when there are no transactions", async () => {
        getFreelancerIncome.mockResolvedValue({
            data: {
                ...defaultIncome,
                totalIncome: 0,
                estimatedTax: 0,
                incomeAfterTax: 0,
                transactionCount: 0
            }
        });

        renderDashboard();

        expect(
            await screen.findByText("No completed transactions yet")
        ).toBeInTheDocument();

        expect(
            screen.queryByRole("img", {
                name: /Income breakdown/
            })
        ).not.toBeInTheDocument();
    });

    it("displays the tax estimate disclaimer", async () => {
        renderDashboard();

        expect(
            await screen.findByText(defaultIncome.disclaimer)
        ).toBeInTheDocument();

        expect(
            screen.getByText(/not an estimate of your complete personal tax liability/i)
        ).toBeInTheDocument();
    });

    it("displays an error when the income API request fails", async () => {
        getFreelancerIncome.mockRejectedValue(
            new Error("Income service unavailable")
        );

        renderDashboard();

        expect(
            await screen.findByText("Unable to load financial information")
        ).toBeInTheDocument();

        expect(
            screen.getByText("Income service unavailable")
        ).toBeInTheDocument();
    });

    it("updates the financial figures when a new authenticated user's API response loads", async () => {
        getFreelancerIncome
            .mockResolvedValueOnce({
                data: {
                    ...defaultIncome,
                    totalIncome: 100000,
                    estimatedTax: 180,
                    incomeAfterTax: 99820
                }
            })
            .mockResolvedValueOnce({
                data: {
                    ...defaultIncome,
                    freelancerId: "freelancer-2",
                    totalIncome: 200000,
                    estimatedTax: 18180,
                    incomeAfterTax: 181820,
                    transactionCount: 4
                }
            });

        const { rerender } = render(
            <MemoryRouter>
                <FreelancerDashboard />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(getMetric("Total completed income")).toHaveTextContent("100");
        });

        useAuth.mockReturnValue({
            user: {
                id: "freelancer-2",
                name: "Another Freelancer"
            }
        });

        rerender(
            <MemoryRouter>
                <FreelancerDashboard />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(getMetric("Total completed income")).toHaveTextContent("200");
        });

        expect(getFreelancerIncome).toHaveBeenCalledTimes(2);
    });
});