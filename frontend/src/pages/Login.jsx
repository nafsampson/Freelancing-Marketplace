import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
    const { login, user, loading } = useAuth();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });

    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    function getDashboardPath(role) {
        switch (role) {
            case "Client":
                return "/client/dashboard";
            case "Freelancer":
                return "/freelancer/dashboard";
            case "Admin":
                return "/admin/dashboard"; // Updated path for Admin
            default:
                return "/";
        }
    }

    function handleChange(event) {
        const { name, value } = event.target;

        setFormData((current) => ({
            ...current,
            [name]: value,
        }));
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");

        const email = formData.email.trim();

        if (!email || !formData.password) {
            setError("Please enter your email address and password.");
            return;
        }

        setSubmitting(true);

        try {
            const loggedInUser = await login(email, formData.password);

            if (!["Client", "Freelancer", "Admin"].includes(loggedInUser.role)) {
                setError("Your account has an unrecognised role.");
                return;
            }

            navigate(getDashboardPath(loggedInUser.role), {
                replace: true,
            });
        } catch (err) {
            setError(
                err.message || "Login failed. Please check your details."
            );
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) {
        return (
            <div className="page-container">
                <p>Checking your session...</p>
            </div>
        );
    }

    if (user) {
        return (
            <div className="page-container">
                <h1>You're already logged in</h1>
                <p>
                    Continue to your account or use the navigation
                    menu to browse HustleHub+.
                </p>
                <button
                    className="btn btn-primary"
                    onClick={() =>
                        navigate(getDashboardPath(user.role), {
                            replace: true,
                        })
                    }
                >
                    Continue to dashboard
                </button>
            </div>
        );
    }

    return (
        <div className="auth-page">
            <section className="auth-card">
                <div className="auth-heading">
                    <span className="hero-label">WELCOME BACK</span>
                    <h1>Log in to HustleHub+</h1>
                    <p>
                        Sign in to manage your work, discover opportunities
                        and continue where you left off.
                    </p>
                </div>

                {error && (
                    <div className="form-message form-error" role="alert">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-field">
                        <label htmlFor="email">Email address</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="you@example.com"
                            autoComplete="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-field">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            placeholder="Enter your password"
                            autoComplete="current-password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary auth-submit"
                        disabled={submitting}
                    >
                        {submitting ? "Signing in..." : "Log in"}
                    </button>

                    <p className="auth-switch">
                        Don't have an account?{" "}
                        <Link to="/register">Create one</Link>
                    </p>
                </form>
            </section>
        </div>
    );
}