import { useEffect, useState, useRef } from "react";
import { Link, useParams } from "react-router-dom";

import { getGigById } from "../services/gigService";
import { createBooking } from "../services/bookingService";
import { useAuth } from "../context/AuthContext";

export default function GigDetails() {
    const { id } = useParams();
    const { user } = useAuth();

    const [gig, setGig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [booking, setBooking] = useState(false);
    const [bookingMessage, setBookingMessage] = useState("");
    const [bookingError, setBookingError] = useState("");
    const bookingInFlight = useRef(false);

    useEffect(() => {
        let active = true;

        async function loadGig() {
            try {
                setLoading(true);
                setError("");

                const result = await getGigById(id);
                const payload = result.data ?? result;
                const item = payload.gig ?? payload;

                if (!item || typeof item !== "object") {
                    throw new Error("The server returned an invalid gig.");
                }

                if (active) {
                    setGig(item);
                }
            } catch (err) {
                if (active) {
                    setError(
                        err.message || "Unable to load this gig."
                    );
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        loadGig();

        return () => {
            active = false;
        };
    }, [id]);

    async function handleBooking() {
        if (bookingInFlight.current || bookingMessage) return;
        setBookingMessage("");
        setBookingError("");

        if (!user) {
            setBookingError("Please log in as a Client to book this service.");
            return;
        }

        if (user.role !== "Client") {
            setBookingError("Only Client accounts can book services.");
            return;
        }

        bookingInFlight.current = true;
        setBooking(true);

        try {
            await createBooking(id);

            setBookingMessage(
                "Your booking request was submitted successfully."
            );
        } catch (err) {
            setBookingError(
                err.message || "Unable to submit your booking."
            );
        } finally {
            bookingInFlight.current = false;
            setBooking(false);
        }
    }

    if (loading) {
        return (
            <div className="page-container">
                <p>Loading gig details...</p>
            </div>
        );
    }

    if (error || !gig) {
        return (
            <div className="gig-details-page">
                <section className="gig-details-message">
                    <h1>Unable to load this gig</h1>
                    <p>{error || "This gig could not be found."}</p>
                    <Link className="btn btn-primary" to="/gigs">
                        Back to Browse Gigs
                    </Link>
                </section>
            </div>
        );
    }

    const price = gig.price;
    const freelancerName =
        gig.freelancer?.name ||
        gig.user?.name ||
        gig.freelancerName ||
        "Independent freelancer";

    return (
        <div className="gig-details-page">
            <div className="gig-details-container">
                <Link to="/gigs" className="back-to-gigs">
                    ← Back to Browse Gigs
                </Link>

                <div className="gig-details-layout">
                    <section className="gig-details-main">
                        <span className="gig-category">
                            {gig.category || "Freelance service"}
                        </span>

                        <h1>{gig.title || "Untitled gig"}</h1>

                        <div className="gig-details-provider">
                            <span className="provider-avatar" aria-hidden="true">
                                {freelancerName.charAt(0).toUpperCase()}
                            </span>
                            <div>
                                <span className="provider-caption">
                                    Offered by
                                </span>
                                <strong>{freelancerName}</strong>
                            </div>
                        </div>

                        <div className="gig-detail-section">
                            <h2>About this service</h2>
                            <p className="gig-full-description">
                                {gig.description ||
                                    "No description has been provided yet."}
                            </p>
                        </div>

                        {Array.isArray(gig.skills) &&
                            gig.skills.length > 0 && (
                                <div className="gig-detail-section">
                                    <h2>Skills and expertise</h2>
                                    <div className="gig-skills">
                                        {gig.skills.map((skill, index) => (
                                            <span key={`${skill}-${index}`}>
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                    </section>

                    <aside className="gig-booking-card">
                        <span className="booking-card-label">
                            SERVICE PRICE
                        </span>

                        <p className="gig-detail-price">
                            {price != null
                                ? `R${Number(price).toLocaleString("en-ZA")}`
                                : "Price on request"}
                        </p>

                        <p className="booking-card-description">
                            Review the service details before proceeding
                            with a booking.
                        </p>

                        {user?.role === "Client" && (
                            <button
                                type="button"
                                className="btn btn-primary booking-button"
                                onClick={handleBooking}
                                disabled={booking || Boolean(bookingMessage)}
                            >
                                {booking
                                    ? "Submitting booking..."
                                    : bookingMessage ? "Booking requested" : "Book this service"}
                            </button>
                        )}

                        {!user && (
                            <Link
                                to="/login"
                                className="btn btn-primary booking-button"
                            >
                                Log in to book
                            </Link>
                        )}

                        {user?.role === "Freelancer" && (
                            <p className="booking-note">
                                You are viewing this gig as a Freelancer.
                                Booking is available to Client accounts.
                            </p>
                        )}

                        {user?.role === "Admin" && (
                            <p className="booking-note">
                                Admin accounts can review listings but cannot
                                book services through this page.
                            </p>
                        )}

                        {bookingMessage && (
                            <p
                                className="booking-feedback booking-success"
                                role="status"
                            >
                                {bookingMessage}
                            </p>
                        )}

                        {bookingError && (
                            <p
                                className="booking-feedback booking-failure"
                                role="alert"
                            >
                                {bookingError}
                            </p>
                        )}
                        {bookingMessage && <Link to="/client/dashboard">View your bookings</Link>}

                        {user?.role === "Client" && (
                            <p className="booking-note">
                                Your booking is subject to the marketplace's
                                booking rules and the freelancer's availability.
                            </p>
                        )}
                    </aside>
                </div>
            </div>
        </div>
    );
}
