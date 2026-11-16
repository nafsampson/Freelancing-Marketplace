import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import {
    getAdminStats,
    getAdminUsers,
    getAdminGigs,
} from "../services/adminService";

function extractData(result) {
    return result?.data ?? result;
}

function extractList(result, key) {
    const payload = extractData(result);

    if (Array.isArray(payload)) {
        return payload;
    }

    if (Array.isArray(payload?.[key])) {
        return payload[key];
    }

    if (Array.isArray(payload?.items)) {
        return payload.items;
    }

    return [];
}

function formatPrice(price) {
    const amount = Number(price);

    if (!Number.isFinite(amount)) {
        return "Price not available";
    }

    return new Intl.NumberFormat("en-ZA", {
        style: "currency",
        currency: "ZAR",
    }).format(amount);
}

function getId(item) {
    return item?._id ?? item?.id ?? item?.email ?? item?.title;
}

export default function AdminDashboard() {
    const { user } = useAuth();

    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [gigs, setGigs] = useState([]);

    const [loading, setLoading] = useState({
        stats: true,
        users: true,
        gigs: true,
    });

    const [errors, setErrors] = useState({
        stats: "",
        users: "",
        gigs: "",
    });

    useEffect(() => {
        let active = true;

        async function loadStats() {
            try {
                const result = await getAdminStats();
                const payload = extractData(result);
                const data = payload?.stats ?? payload;

                if (active) {
                    setStats(data);
                }
            } catch (error) {
                if (active) {
                    setErrors((current) => ({
                        ...current,
                        stats: error.message || "Unable to load statistics.",
                    }));
                }
            } finally {
                if (active) {
                    setLoading((current) => ({
                        ...current,
                        stats: false,
                    }));
                }
            }
        }

        async function loadUsers() {
            try {
                const result = await getAdminUsers();

                if (active) {
                    setUsers(extractList(result, "users"));
                }
            } catch (error) {
                if (active) {
                    setErrors((current) => ({
                        ...current,
                        users: error.message || "Unable to load users.",
                    }));
                }
            } finally {
                if (active) {
                    setLoading((current) => ({
                        ...current,
                        users: false,
                    }));
                }
            }
        }

        async function loadGigs() {
            try {
                const result = await getAdminGigs();

                if (active) {
                    setGigs(extractList(result, "gigs"));
                }
            } catch (error) {
                if (active) {
                    setErrors((current) => ({
                        ...current,
                        gigs: error.message || "Unable to load gigs.",
                    }));
                }
            } finally {
                if (active) {
                    setLoading((current) => ({
                        ...current,
                        gigs: false,
                    }));
                }
            }
        }

        loadStats();
        loadUsers();
        loadGigs();

        return () => {
            active = false;
        };
    }, []);

    const statCards = [
        {
            label: "Total users",
            value: stats?.totalUsers,
            icon: "♙",
        },
        {
            label: "Clients",
            value: stats?.clientUsers,
            icon: "◎",
        },
        {
            label: "Freelancers",
            value: stats?.freelancerUsers,
            icon: "✧",
        },
        {
            label: "Total gigs",
            value: stats?.totalGigs,
            icon: "▤",
        },
        {
            label: "Total bookings",
            value: stats?.totalBookings,
            icon: "◷",
        },
    ];

    return (
        <div className="admin-page">
            <section className="admin-header">
                <div>
                    <span className="hero-label">ADMINISTRATION</span>
                    <h1>Admin Dashboard</h1>
                    <p>
                        Welcome, {user?.name || "Administrator"}.
                        Monitor the HustleHub+ marketplace.
                    </p>
                </div>

                <span className="admin-role-badge">
                    <span className="admin-status-dot" />
                    Administrator
                </span>
            </section>

            <section className="admin-section">
                <div className="admin-section-heading">
                    <h2>Marketplace overview</h2>
                    <p>Statistics retrieved from the admin API.</p>
                </div>

                {errors.stats && (
                    <p className="admin-error" role="alert">
                        Could not load statistics: {errors.stats}
                    </p>
                )}

                <div className="admin-stats">
                    {statCards.map((stat) => (
                        <article
                            className="admin-stat-card"
                            key={stat.label}
                        >
                            <span className="admin-stat-icon">
                                {stat.icon}
                            </span>

                            <p className="admin-stat-label">
                                {stat.label}
                            </p>

                            <h2 className="admin-stat-value">
                                {loading.stats
                                    ? "Loading..."
                                    : errors.stats
                                        ? "Unavailable"
                                        : typeof stat.value === "number"
                                            ? stat.value.toLocaleString("en-ZA")
                                            : "—"}
                            </h2>
                        </article>
                    ))}
                </div>
            </section>

            <section className="admin-section admin-data-section">
                <div className="admin-section-heading">
                    <h2>Registered users</h2>
                    <p>Accounts returned by the admin API.</p>
                </div>

                {errors.users && (
                    <p className="admin-error" role="alert">
                        Could not load users: {errors.users}
                    </p>
                )}

                {loading.users ? (
                    <p>Loading users...</p>
                ) : !errors.users && users.length === 0 ? (
                    <p>No users were returned by the API.</p>
                ) : (
                    <div className="admin-table-wrapper">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((account, index) => (
                                    <tr
                                        key={getId(account) ?? index}
                                    >
                                        <td>
                                            {account.name ||
                                                account.fullName ||
                                                "Name unavailable"}
                                        </td>
                                        <td>
                                            {account.email ||
                                                "Email unavailable"}
                                        </td>
                                        <td>
                                            <span className="admin-user-role">
                                                {account.role ||
                                                    "Unspecified"}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <section className="admin-section admin-data-section">
                <div className="admin-section-heading">
                    <h2>Marketplace gigs</h2>
                    <p>Listings returned by the admin API.</p>
                </div>

                {errors.gigs && (
                    <p className="admin-error" role="alert">
                        Could not load gigs: {errors.gigs}
                    </p>
                )}

                {loading.gigs ? (
                    <p>Loading gigs...</p>
                ) : !errors.gigs && gigs.length === 0 ? (
                    <p>No gigs were returned by the API.</p>
                ) : (
                    <div className="admin-table-wrapper">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Gig</th>
                                    <th>Category</th>
                                    <th>Price</th>
                                </tr>
                            </thead>
                            <tbody>
                                {gigs.map((gig, index) => (
                                    <tr key={getId(gig) ?? index}>
                                        <td>
                                            {gig.title ||
                                                "Untitled gig"}
                                        </td>
                                        <td>
                                            {gig.category ||
                                                "Uncategorised"}
                                        </td>
                                        <td>
                                            {formatPrice(gig.price)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <Link
                    to="/gigs"
                    className="admin-card-link"
                >
                    View public marketplace →
                </Link>
            </section>
        </div>
    );
}