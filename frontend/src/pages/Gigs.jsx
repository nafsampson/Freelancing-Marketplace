import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getGigs } from "../services/gigService";

export default function Gigs() {
    const [gigs, setGigs] = useState([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;

        async function loadGigs() {
            try {
                setLoading(true);
                setError("");

                const result = await getGigs();

                // Support common API response formats.
                const payload = result.data ?? result;
                const items = Array.isArray(payload)
                    ? payload
                    : payload.gigs ?? payload.items;

                if (!Array.isArray(items)) {
                    throw new Error(
                        "The server returned an unexpected gigs response."
                    );
                }

                if (active) {
                    setGigs(items);
                }
            } catch (err) {
                if (active) {
                    setError(
                        err.message ||
                        "Unable to load gigs. Please try again later."
                    );
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        loadGigs();

        return () => {
            active = false;
        };
    }, []);

    const filteredGigs = useMemo(() => {
        const query = search.trim().toLowerCase();

        if (!query) return gigs;

        return gigs.filter((gig) =>
            [
                gig.title,
                gig.description,
                gig.category,
            ].some((value) =>
                String(value ?? "").toLowerCase().includes(query)
            )
        );
    }, [gigs, search]);

    return (
        <div className="gigs-page">
            <section className="gigs-hero">
                <span className="hero-label">FIND YOUR NEXT OPPORTUNITY</span>
                <h1>Discover work that moves you forward.</h1>
                <p>
                    Explore services offered by freelancers and find
                    the right person for your next project.
                </p>

                <div className="gig-search">
                    <span aria-hidden="true">⌕</span>
                    <input
                        type="search"
                        aria-label="Search gigs"
                        placeholder="Search by title, description or category..."
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                </div>
            </section>

            <section className="gigs-content">
                <div className="gigs-section-heading">
                    <div>
                        <h2>Explore freelance services</h2>
                        <p>
                            {loading
                                ? "Loading available gigs..."
                                : `${filteredGigs.length} ${
                                    filteredGigs.length === 1
                                        ? "service"
                                        : "services"
                                } found`}
                        </p>
                    </div>
                </div>

                {loading && (
                    <div className="gigs-message">
                        <p>Finding available gigs for you...</p>
                    </div>
                )}

                {!loading && error && (
                    <div className="gigs-message gigs-error" role="alert">
                        <h3>We couldn't load the gigs</h3>
                        <p>{error}</p>
                        <button
                            className="btn btn-primary"
                            onClick={() => window.location.reload()}
                        >
                            Try again
                        </button>
                    </div>
                )}

                {!loading && !error && filteredGigs.length === 0 && (
                    <div className="gigs-message">
                        <h3>
                            {search
                                ? "No matching gigs found"
                                : "No gigs available yet"}
                        </h3>
                        <p>
                            {search
                                ? "Try another search term."
                                : "Freelancer services will appear here once they have been published."}
                        </p>
                    </div>
                )}

                {!loading && !error && filteredGigs.length > 0 && (
                    <div className="gigs-grid">
                        {filteredGigs.map((gig) => {
                            const id = gig._id ?? gig.id;

                            return (
                                <article className="gig-card" key={id ?? gig.title}>
                                    <div className="gig-card-top">
                                        <span className="gig-category">
                                            {gig.category || "Freelance service"}
                                        </span>
                                        <span className="gig-price">
                                            {gig.price != null
                                                ? `R${Number(gig.price).toLocaleString(
                                                    "en-ZA"
                                                )}`
                                                : "Price on request"}
                                        </span>
                                    </div>

                                    <h3>{gig.title || "Untitled gig"}</h3>

                                    <p className="gig-description">
                                        {gig.description ||
                                            "Contact the freelancer for more information about this service."}
                                    </p>

                                    <div className="gig-card-footer">
                                        <span className="gig-provider">
                                            {gig.freelancer?.name ||
                                                gig.user?.name ||
                                                gig.freelancerName ||
                                                "Independent freelancer"}
                                        </span>

                                        {id ? (
                                            <Link
                                                className="gig-view-link"
                                                to={`/gigs/${id}`}
                                            >
                                                View details →
                                            </Link>
                                        ) : (
                                            <span className="gig-view-link">
                                                Details unavailable
                                            </span>
                                        )}
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