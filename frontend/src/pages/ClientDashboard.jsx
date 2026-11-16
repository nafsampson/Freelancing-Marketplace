import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getBookings } from "../services/bookingService";
import { useAuth } from "../context/AuthContext";
import Icon from "../components/Icon";

export default function ClientDashboard() {
    const { user } = useAuth();

    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;

        async function loadBookings() {
            try {
                setLoading(true);
                setError("");

                const result = await getBookings();
                const payload = result.data ?? result;

                const items = Array.isArray(payload)
                    ? payload
                    : payload.bookings ?? payload.items;

                if (!Array.isArray(items)) {
                    throw new Error(
                        "The server returned an unexpected bookings response."
                    );
                }

                if (active) {
                    setBookings(items);
                }
            } catch (err) {
                if (active) {
                    setError(
                        err.message || "Unable to load your bookings."
                    );
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        loadBookings();

        return () => {
            active = false;
        };
    }, []);

    const activeBookings = bookings.filter((booking) =>
        ["pending", "accepted", "in progress", "in-progress"].includes(
            String(booking.status ?? "").toLowerCase()
        )
    );

    const completedBookings = bookings.filter(
        (booking) =>
            String(booking.status ?? "").toLowerCase() === "completed"
    );

    function formatStatus(status) {
        if (!status) return "Pending";

        return String(status)
            .replace(/[-_]/g, " ")
            .replace(/\b\w/g, (letter) => letter.toUpperCase());
    }

    function formatDate(value) {
        if (!value) return "Date unavailable";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "Date unavailable";
        }

        return date.toLocaleDateString("en-ZA", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    }

    return (
        <div className="dashboard-page client-dashboard">
            <section className="dashboard-welcome">
                <div>
                    <span className="hero-label">CLIENT WORKSPACE</span>
                    <h1>Welcome back{user?.name ? `, ${user.name}` : ""}.</h1>
                    <p>
                        Keep track of your bookings and find the right
                        freelancers for your next project.
                    </p>
                </div>

                <Link to="/gigs" className="btn btn-primary dashboard-action">
                    Explore services <Icon name="arrow" />
                </Link>
            </section>

            <section className="dashboard-stats">
                <article className="dashboard-stat">
                    <div className="stat-icon"><Icon name="briefcase" /></div>
                    <span>Total bookings</span>
                    <strong>{loading ? "—" : bookings.length}</strong>
                    <p>All your service requests</p>
                </article>

                <article className="dashboard-stat">
                    <div className="stat-icon stat-icon-blue"><Icon name="clock" /></div>
                    <span>In progress</span>
                    <strong>{loading ? "—" : activeBookings.length}</strong>
                    <p>Pending or active bookings</p>
                </article>

                <article className="dashboard-stat">
                    <div className="stat-icon"><Icon name="check" /></div>
                    <span>Completed</span>
                    <strong>{loading ? "—" : completedBookings.length}</strong>
                    <p>Finished services</p>
                </article>
            </section>

            <section className="dashboard-bookings">
                <div className="dashboard-section-heading">
                    <div>
                        <h2>Your bookings</h2>
                        <p>Review the services you've requested.</p>
                    </div>

                    <Link to="/gigs" className="btn btn-outline dashboard-action">
                        Find more services <Icon name="arrow" />
                    </Link>
                </div>

                {loading && (
                    <div className="dashboard-empty">
                        <p>Loading your bookings...</p>
                    </div>
                )}

                {!loading && error && (
                    <div className="dashboard-empty dashboard-error">
                        <h3>Couldn't load your bookings</h3>
                        <p>{error}</p>
                        <button
                            className="btn btn-primary dashboard-action"
                            onClick={() => window.location.reload()}
                        >
                            Try again
                        </button>
                    </div>
                )}

                {!loading && !error && bookings.length === 0 && (
                    <div className="dashboard-empty">
                        <div className="dashboard-empty-icon" aria-hidden="true">
                            ↗
                        </div>
                        <h3>Your next project starts here</h3>
                        <p>
                            You haven't booked a service yet. Browse available
                            gigs to find a freelancer who fits your needs.
                        </p>
                        <Link to="/gigs" className="btn btn-primary dashboard-action">
                            Browse gigs <Icon name="arrow" />
                        </Link>
                    </div>
                )}

                {!loading && !error && bookings.length > 0 && (
                    <div className="booking-list">
                        {bookings.map((booking) => {
                            const gig = booking.gig ?? booking.gigId;
                            const gigObject = gig && typeof gig === "object";
                            const gigId =
                                gigObject
                                    ? gig._id ?? gig.id
                                    : typeof gig === "string" ? gig : null;

                            const gigTitle =
                                booking.gigTitle ||
                                (gigObject ? gig.title : "") ||
                                "Freelance service";

                            const bookingPrice =
                                booking.amount ??
                                booking.price ??
                                (gigObject ? gig.price : null);

                            const status = String(
                                booking.status ?? "Pending"
                            ).toLowerCase();

                            return (
                                <article
                                    className="booking-row"
                                    key={booking._id ?? booking.id}
                                >
                                    <div className="booking-row-main">
                                        <span className="booking-row-category">
                                            SERVICE BOOKING
                                        </span>
                                        <h3>{gigTitle}</h3>
                                        <p>
                                            Requested:{" "}
                                            {formatDate(
                                                booking.createdAt ??
                                                    booking.bookingDate
                                            )}
                                        </p>
                                    </div>

                                    <div className="booking-row-meta">
                                        <span
                                            className={`booking-status status-${status.replace(
                                                /[^a-z0-9]+/g,
                                                "-"
                                            )}`}
                                        >
                                            {formatStatus(booking.status)}
                                        </span>

                                        <strong className="booking-row-price">
                                            {bookingPrice != null ? Number(bookingPrice).toLocaleString("en-ZA", { style: "currency", currency: "ZAR" }) : "—"}
                                        </strong>

                                        {gigId && (
                                            <Link
                                                to={`/gigs/${gigId}`}
                                                className="btn btn-outline dashboard-action"
                                            >
                                                View gig <Icon name="arrow" />
                                            </Link>
                                        )}
                                        {!gigId && <span className="booking-service-unavailable">Service unavailable</span>}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
}
