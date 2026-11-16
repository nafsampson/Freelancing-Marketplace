import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
    const { register } = useAuth();

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        role: "Client",
    });

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [submitting, setSubmitting] = useState(false);

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
        setSuccess("");

        const name = formData.name.trim();
        const email = formData.email.trim();

        if (!name || !email || !formData.password) {
            setError("Please complete all required fields.");
            return;
        }

        if (formData.password.length < 8) {
            setError("Your password must contain at least 8 characters.");
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError("Your passwords do not match.");
            return;
        }

        setSubmitting(true);

        try {
            const result = await register({
                name,
                email,
                password: formData.password,
                role: formData.role,
            });

            setSuccess(
                result?.message ||
                "Your account has been created. You can now log in."
            );

            setFormData({
                name: "",
                email: "",
                password: "",
                confirmPassword: "",
                role: "Client",
            });
        } catch (err) {
            setError(
                err.message || "Registration failed. Please try again."
            );
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="auth-page">
            <section className="auth-card">
                <div className="auth-heading">
                    <span className="hero-label">JOIN HUSTLEHUB+</span>
                    <h1>Create your account</h1>
                    <p>
                        Join the marketplace to find services or
                        share your skills with potential clients.
                    </p>
                </div>

                {error && (
                    <div className="form-message form-error" role="alert">
                        {error}
                    </div>
                )}

                {success && (
                    <div
                        className="form-message form-success"
                        role="status"
                    >
                        {success}
                        <div>
                            <Link to="/login">Continue to log in</Link>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-field">
                        <label htmlFor="name">Full name</label>
                        <input
                            id="name"
                            name="name"
                            type="text"
                            placeholder="Enter your full name"
                            autoComplete="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                        />
                    </div>

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
                            placeholder="At least 8 characters"
                            autoComplete="new-password"
                            value={formData.password}
                            onChange={handleChange}
                            minLength={8}
                            required
                        />
                    </div>

                    <div className="form-field">
                        <label htmlFor="confirmPassword">
                            Confirm password
                        </label>
                        <input
                            id="confirmPassword"
                            name="confirmPassword"
                            type="password"
                            placeholder="Enter your password again"
                            autoComplete="new-password"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <fieldset className="role-fieldset">
                        <legend>I want to...</legend>

                        <div className="role-options">
                            <label
                                className={`role-option ${
                                    formData.role === "Client"
                                        ? "selected"
                                        : ""
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="role"
                                    value="Client"
                                    checked={formData.role === "Client"}
                                    onChange={handleChange}
                                />
                                <span className="role-option-icon">⌕</span>
                                <span className="role-option-title">
                                    Hire a freelancer
                                </span>
                                <span className="role-option-description">
                                    Find services for my project.
                                </span>
                            </label>

                            <label
                                className={`role-option ${
                                    formData.role === "Freelancer"
                                        ? "selected"
                                        : ""
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="role"
                                    value="Freelancer"
                                    checked={formData.role === "Freelancer"}
                                    onChange={handleChange}
                                />
                                <span className="role-option-icon">✧</span>
                                <span className="role-option-title">
                                    Offer my skills
                                </span>
                                <span className="role-option-description">
                                    Create gigs and find clients.
                                </span>
                            </label>
                        </div>
                    </fieldset>

                    <button
                        type="submit"
                        className="btn btn-primary auth-submit"
                        disabled={submitting}
                    >
                        {submitting
                            ? "Creating account..."
                            : "Create account"}
                    </button>

                    <p className="auth-switch">
                        Already have an account?{" "}
                        <Link to="/login">Log in</Link>
                    </p>
                </form>
            </section>
        </div>
    );
}