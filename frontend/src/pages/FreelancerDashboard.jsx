import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getGigs, deleteGig } from "../services/gigService";
import { getFreelancerIncome } from "../services/transactionService";
import { useAuth } from "../context/AuthContext";
import FreelancerBookingRequests from "../components/FreelancerBookingRequests";

export default function FreelancerDashboard() {
    const { user } = useAuth();

    const [gigs, setGigs] = useState([]);
    const [income, setIncome] = useState(null);
    const [loadingGigs, setLoadingGigs] = useState(true);
    const [loadingIncome, setLoadingIncome] = useState(true);
    const [gigError, setGigError] = useState("");
    const [incomeError, setIncomeError] = useState("");
    
    const [deletingId, setDeletingId] = useState(null);
    const [deleteMessage, setDeleteMessage] = useState("");
    const [deleteError, setDeleteError] = useState("");

    useEffect(() => {
        let active = true;

        async function loadDashboard() {
            try {
                const result = await getGigs();
                const payload = result.data ?? result;

                const items = Array.isArray(payload)
                    ? payload
                    : payload.gigs ?? payload.items;

                if (!Array.isArray(items)) {
                    throw new Error("Unexpected gigs response from the server.");
                }

                const userId = String(user?.id ?? user?._id ?? "");

                const ownGigs = items.filter((gig) => {
                    const owner =
                        gig.freelancer ??
                        gig.user ??
                        gig.freelancerId ??
                        gig.userId;

                    const ownerId =
                        typeof owner === "object" && owner !== null
                            ? owner._id ?? owner.id
                            : owner;

                    return userId && String(ownerId ?? "") === userId;
                });

                if (active) {
                    setGigs(ownGigs);
                    setGigError("");
                }
            } catch (err) {
                if (active) {
                    setGigError(
                        err.message || "Unable to load your published gigs."
                    );
                }
            } finally {
                if (active) setLoadingGigs(false);
            }

            try {
                const result = await getFreelancerIncome();

                // The API returns { data: { ...financial information } }.
                const payload = result.data ?? result;

                if (active) {
                    setIncome(payload);
                    setIncomeError("");
                }
            } catch (err) {
                if (active) {
                    setIncomeError(
                        err.message || "Unable to load your financial summary."
                    );
                }
            } finally {
                if (active) setLoadingIncome(false);
            }
        }

        loadDashboard();

        return () => {
            active = false;
        };
    }, [user]);
    
// Refresh the financial dashboard after a booking is completed
async function refreshIncome() {
    try {
        const result = await getFreelancerIncome();
        const payload = result.data ?? result;

        setIncome(payload);
        setIncomeError("");
    } catch (err) {
        setIncomeError(
            err.message || "Unable to load your financial summary."
        );
    }
}
    async function handleDeleteGig(gigId) {
        const confirmed = window.confirm(
            "Are you sure you want to delete this gig? This action cannot be undone."
        );

        if (!confirmed) return;

        setDeletingId(gigId);
        setDeleteMessage("");
        setDeleteError("");

        try {
            await deleteGig(gigId);

            setGigs((currentGigs) =>
                currentGigs.filter(
                    (gig) => (gig._id ?? gig.id) !== gigId
                )
            );

            setDeleteMessage("Gig deleted successfully.");
        } catch (error) {
            setDeleteError(
                error.message || "Unable to delete this gig. Please try again."
            );
        } finally {
            setDeletingId(null);
        }
    }

    function formatMoney(value) {
        const amount = Number(value);

        if (!Number.isFinite(amount)) return "Unavailable";

        return new Intl.NumberFormat("en-ZA", {
            style: "currency",
            currency: "ZAR",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    }

    function getGigStatus(gig) {
        const status = gig.status ?? gig.isActive;

        if (typeof status === "boolean") {
            return status ? "Active" : "Inactive";
        }

        if (typeof status === "string" && status.trim()) {
            return status
                .replace(/[-_]/g, " ")
                .replace(/\b\w/g, (letter) => letter.toUpperCase());
        }

        return "Published";
    }

    const totalIncome = Number(income?.totalIncome ?? 0);
    const estimatedTax = Number(income?.estimatedTax ?? 0);
    const incomeAfterTax = Number(income?.incomeAfterTax ?? 0);
    const transactionCount = Number(income?.transactionCount ?? 0);

    const hasFinancialData = transactionCount > 0;

    const taxPercentage = totalIncome > 0
        ? Math.min(100, (estimatedTax / totalIncome) * 100)
        : 0;

    const afterTaxPercentage = totalIncome > 0
        ? Math.max(0, 100 - taxPercentage)
        : 0;

    const taxYear = income?.taxYear ?? 2027;

    return (
        <div className="dashboard-page freelancer-dashboard">
            <section className="dashboard-welcome">
                <div>
                    <span className="hero-label">FREELANCER WORKSPACE</span>
                    <h1>
                        Welcome back{user?.name ? `, ${user.name}` : ""}.
                    </h1>
                    <p>
                        Manage your services, keep track of your listings,
                        and monitor your earnings in one place.
                    </p>
                </div>

                <Link
                    to="/freelancer/gigs/create"
                    className="btn btn-primary"
                >
                    + Create a gig
                </Link>
            </section>

            <section className="dashboard-stats">
                <article className="dashboard-stat">
                    <span>Published gigs</span>
                    <strong>
                        {loadingGigs ? "—" : gigError ? "—" : gigs.length}
                    </strong>
                    <p>Your services on HustleHub+</p>
                </article>

                <article className="dashboard-stat">
                    <span>Total earnings</span>
                    <strong className="income-stat-value">
                        {loadingIncome
                            ? "—"
                            : incomeError
                                ? "—"
                                : formatMoney(totalIncome)}
                    </strong>
                    <p>Completed transactions only</p>
                </article>

                <article className="dashboard-stat">
                    <span>Account type</span>
                    <strong className="account-type-value">Freelancer</strong>
                    <p>Manage and grow your services</p>
                </article>
            </section>

            <section className="dashboard-bookings freelancer-gigs-section">
                <div className="dashboard-section-heading">
                    <div>
                        <h2>Your published gigs</h2>
                        <p>Review and manage the services you've listed.</p>
                    </div>

                    <Link
                        to="/freelancer/gigs/create"
                        className="btn btn-outline"
                    >
                        Create a new gig →
                    </Link>
                </div>

                {deleteMessage && (
                    <p
                        className="delete-feedback delete-feedback-success"
                        role="status"
                    >
                        {deleteMessage}
                    </p>
                )}

                {deleteError && (
                    <p
                        className="delete-feedback delete-feedback-error"
                        role="alert"
                    >
                        {deleteError}
                    </p>
                )}

                {loadingGigs && (
                    <div className="dashboard-empty">
                        <p>Loading your gigs...</p>
                    </div>
                )}

                {!loadingGigs && gigError && (
                    <div className="dashboard-empty dashboard-error">
                        <h3>Couldn't load your gigs</h3>
                        <p>{gigError}</p>
                    </div>
                )}

                {!loadingGigs && !gigError && gigs.length === 0 && (
                    <div className="dashboard-empty">
                        <div className="dashboard-empty-icon" aria-hidden="true">
                            +
                        </div>
                        <h3>Your freelance journey starts here</h3>
                        <p>
                            You haven't published any gigs yet. Create your
                            first listing so clients can discover your services.
                        </p>
                        <Link
                            to="/freelancer/gigs/create"
                            className="btn btn-primary"
                        >
                            Create your first gig
                        </Link>
                    </div>
                )}

                {!loadingGigs && !gigError && gigs.length > 0 && (
                    <div className="freelancer-gig-list">
                        {gigs.map((gig) => {
                            const id = gig._id ?? gig.id;

                            return (
                                <article
                                    className="freelancer-gig-row"
                                    key={id ?? gig.title}
                                >
                                    <div className="freelancer-gig-info">
                                        <span className="gig-category">
                                            {gig.category || "Freelance service"}
                                        </span>
                                        <h3>{gig.title || "Untitled gig"}</h3>
                                        <p>
                                            {gig.description ||
                                                "No description provided."}
                                        </p>
                                    </div>

                                    <div className="freelancer-gig-actions">
                                        <span className="freelancer-gig-price">
                                            {gig.price != null
                                                ? formatMoney(gig.price)
                                                : "Price not set"}
                                        </span>

                                        <span className="freelancer-gig-status">
                                            {getGigStatus(gig)}
                                        </span>

                                        {id && (
                                            <div className="freelancer-gig-links">
                                                <Link to={`/gigs/${id}`} className="btn btn-outline gig-action">
                                                    View
                                                </Link>
                                                <Link
                                                    to={`/freelancer/gigs/${id}/edit`}
                                                    className="btn btn-outline gig-action"
                                                >
                                                    Edit
                                                </Link>
                                                <button
                                                    type="button"
                                                    className="btn gig-delete-button gig-action"
                                                    onClick={() => handleDeleteGig(id)}
                                                    disabled={deletingId === id}
                                                >
                                                    {deletingId === id
                                                        ? "Deleting..."
                                                        : "Delete"}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* Booking Requests Component */}
            <FreelancerBookingRequests onBookingCompleted={refreshIncome} />

            {/* Financial dashboard */}
            <section className="financial-dashboard">
                <div className="financial-heading">
                    <div>
                        <span className="hero-label">FINANCIAL OVERVIEW</span>
                        <h2>Your income and tax summary</h2>
                        <p>
                            Track your completed earnings and estimated
                            South African income tax for tax year {taxYear}.
                        </p>
                    </div>

                    <span className="financial-year-badge">
                        Tax year {taxYear}
                    </span>
                </div>

                {loadingIncome && (
                    <div className="financial-empty">
                        Loading your financial information...
                    </div>
                )}

                {!loadingIncome && incomeError && (
                    <div className="financial-empty financial-error" role="alert">
                        <h3>Unable to load financial information</h3>
                        <p>{incomeError}</p>
                    </div>
                )}

                {!loadingIncome && !incomeError && (
                    <>
                        <div className="financial-metrics">
                            <article className="financial-metric">
                                <span>Total completed income</span>
                                <strong>{formatMoney(totalIncome)}</strong>
                                <small>
                                    {transactionCount} completed{" "}
                                    {transactionCount === 1
                                        ? "transaction"
                                        : "transactions"}
                                </small>
                            </article>

                            <article className="financial-metric financial-tax">
                                <span>Estimated income tax</span>
                                <strong>{formatMoney(estimatedTax)}</strong>
                                <small>After primary tax rebate</small>
                            </article>

                            <article className="financial-metric financial-after-tax">
                                <span>Estimated income after tax</span>
                                <strong>{formatMoney(incomeAfterTax)}</strong>
                                <small>Income less estimated tax</small>
                            </article>
                        </div>

                        <div className="financial-chart-card">
                            <div className="financial-chart-heading">
                                <div>
                                    <h3>Income breakdown</h3>
                                    <p>
                                        How your completed income is divided
                                        between estimated tax and after-tax income.
                                    </p>
                                </div>
                            </div>

                            {!hasFinancialData ? (
                                <div className="financial-chart-empty">
                                    <div className="financial-empty-icon">
                                        R
                                    </div>
                                    <h3>No completed transactions yet</h3>
                                    <p>
                                        Your financial chart will appear once
                                        you complete your first transaction.
                                        Pending and cancelled transactions are
                                        not included in this calculation.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <svg className="financial-chart" viewBox="0 0 100 32" preserveAspectRatio="none"
                                        role="img" aria-label={`Income breakdown: ${formatMoney(incomeAfterTax)} after tax and ${formatMoney(estimatedTax)} estimated tax.`}>
                                        <rect className="financial-chart-after-tax" x="0" width={afterTaxPercentage} height="32" />
                                        <rect className="financial-chart-tax" x={afterTaxPercentage} width={taxPercentage} height="32" />
                                    </svg>

                                    <div className="financial-chart-legend">
                                        <div>
                                            <span className="legend-dot legend-after-tax" />
                                            <span>Income after tax</span>
                                            <strong>
                                                {formatMoney(incomeAfterTax)}
                                            </strong>
                                        </div>

                                        <div>
                                            <span className="legend-dot legend-tax" />
                                            <span>Estimated tax</span>
                                            <strong>
                                                {formatMoney(estimatedTax)}
                                            </strong>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="financial-disclaimer">
                            {Number(income?.missingCompletionDateCount || 0) > 0 && (
                                <p role="alert">{income.missingCompletionDateCount} older completed record(s) have no completion date and are excluded from these totals until reviewed.</p>
                            )}
                            <strong>Important tax information</strong>
                            <p>
                                {income?.disclaimer ||
                                    "This is an estimate based on completed HustleHub+ transactions, not a SARS assessment or professional tax advice."}
                            </p>
                            <p>
                                This estimate assumes you are under 65,
                                applies the primary rebate only, and does
                                not account for other income, deductions or
                                additional tax credits. It is not an estimate
                                of your complete personal tax liability.
                            </p>
                        </div>
                    </>
                )}
            </section>
        </div>
    );
}
