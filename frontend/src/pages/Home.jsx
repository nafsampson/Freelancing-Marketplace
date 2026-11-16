
import { Link } from "react-router-dom";
import Icon from "../components/Icon";

export default function Home() {
    return (
        <div className="home-page">
            <section className="hero-section">
                <div className="hero-content">
                    <span className="hero-label">
                        YOUR NEXT OPPORTUNITY STARTS HERE
                    </span>

                    <h1>
                        Great work starts
                        <span className="hero-highlight">
                            {" "}with the right connection.
                        </span>
                    </h1>

                    <p className="hero-description">
                        HustleHub+ connects clients with talented
                        freelancers. Find the skills you need, showcase
                        your expertise and turn ideas into real results.
                    </p>

                    <div className="hero-actions">
                        <Link to="/gigs" className="btn btn-primary">
                            Explore gigs
                        </Link>

                        <Link to="/register" className="btn btn-outline">
                            Join HustleHub+
                        </Link>
                    </div>

                    <div className="hero-benefits">
                        <span>Discover skilled freelancers</span>
                        <span>Showcase your services</span>
                        <span>Manage your work in one place</span>
                    </div>
                </div>

                <div className="hero-visual">
                    <div className="visual-card visual-card-main">
                        <div className="visual-card-icon"><Icon name="layers" /></div>
                        <p className="visual-eyebrow">YOUR NEXT PROJECT</p>
                        <h2>Ideas into impact.</h2>
                        <p>
                            Connect with the people who can bring
                            your next big idea to life.
                        </p>
                        <div className="visual-tags">
                            <span>Development</span>
                            <span>Design</span>
                            <span>Marketing</span>
                        </div>
                    </div>

                    <div className="floating-card">
                        <span className="floating-icon"><Icon name="check" /></span>
                        <div>
                            <strong>Make it happen</strong>
                            <p>One connection at a time.</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="home-features">
                <div className="section-heading">
                    <span className="hero-label">HOW IT WORKS</span>
                    <h2>A better way to get work done.</h2>
                    <p>
                        Whether you're hiring or offering your skills,
                        HustleHub+ gives you a place to get started.
                    </p>
                </div>

                <div className="feature-grid">
                    <article className="feature-card">
                        <div className="feature-icon"><Icon name="search" /></div>
                        <h3>Find the right talent</h3>
                        <p>
                            Browse available gigs and discover services
                            that fit your project and budget.
                        </p>
                        <Link to="/gigs">Browse gigs →</Link>
                    </article>

                    <article className="feature-card">
                        <div className="feature-icon"><Icon name="briefcase" /></div>
                        <h3>Showcase your skills</h3>
                        <p>
                            Create gigs that highlight your services
                            and help potential clients find you.
                        </p>
                        <Link to="/register">Join as a freelancer →</Link>
                    </article>

                    <article className="feature-card">
                        <div className="feature-icon"><Icon name="check" /></div>
                        <h3>Keep everything organised</h3>
                        <p>
                            Use your dashboard to keep track of your
                            marketplace activity and work.
                        </p>
                        <Link to="/register">Get started →</Link>
                    </article>
                </div>
            </section>

            <section className="home-cta">
                <div>
                    <h2>Ready to make your next move?</h2>
                    <p>
                        Create your account and discover what you can
                        accomplish with HustleHub+.
                    </p>
                </div>

                <Link to="/register" className="btn btn-primary">
                    Get started today
                </Link>
            </section>
        </div>
    );
}
