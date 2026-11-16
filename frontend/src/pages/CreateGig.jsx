import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { createGig } from "../services/gigService";

const initialForm = {
    title: "",
    description: "",
    category: "",
    price: "",
    skills: "",
};

const categories = [
    "Web Development",
    "Mobile App Development",
    "UI/UX Design",
    "Graphic Design",
    "Writing & Translation",
    "Digital Marketing",
    "Video & Animation",
    "Data & Analytics",
    "Other",
];

export default function CreateGig() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState(initialForm);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [submitting, setSubmitting] = useState(false);

    function handleChange(event) {
        const { name, value } = event.target;

        setFormData((current) => ({
            ...current,
            [name]: value,
        }));

        setError("");
        setSuccess("");
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");
        setSuccess("");

        const title = formData.title.trim();
        const description = formData.description.trim();
        const category = formData.category;
        const price = Number(formData.price);

        if (!title || !description || !category || formData.price === "") {
            setError("Please complete all required fields.");
            return;
        }

        if (!Number.isFinite(price) || price <= 0) {
            setError("Enter a price greater than zero.");
            return;
        }

        if (title.length < 5) {
            setError("The gig title must contain at least 5 characters.");
            return;
        }

        if (description.length < 20) {
            setError("The description must contain at least 20 characters.");
            return;
        }

        const skills = [
            ...new Set(
                formData.skills
                    .split(",")
                    .map((skill) => skill.trim())
                    .filter(Boolean)
            ),
        ];

        setSubmitting(true);

        try {
            await createGig({
                title,
                description,
                category,
                price,
                skills,
            });

            setSuccess("Your gig has been submitted successfully.");

            // Allow the success message to be seen before navigating.
            window.setTimeout(() => {
                navigate("/freelancer/dashboard", { replace: true });
            }, 1000);
        } catch (err) {
            setError(
                err.message ||
                    "We couldn't create your gig. Please try again."
            );
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="create-gig-page">
            <div className="create-gig-container">
                <Link
                    to="/freelancer/dashboard"
                    className="create-gig-back"
                >
                    ← Back to dashboard
                </Link>

                <section className="create-gig-heading">
                    <span className="hero-label">GROW YOUR BUSINESS</span>
                    <h1>Create a new gig</h1>
                    <p>
                        Tell clients what you offer, what it costs, and
                        why your service is right for their project.
                    </p>
                </section>

                <section className="create-gig-card">
                    <div className="create-gig-card-heading">
                        <h2>Service details</h2>
                        <p>
                            Fields marked with * are required.
                        </p>
                    </div>

                    {error && (
                        <div className="gig-form-message gig-form-error"
                            role="alert"
                        >
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="gig-form-message gig-form-success"
                            role="status"
                        >
                            {success} Redirecting to your dashboard...
                        </div>
                    )}

                    <form
                        className="create-gig-form"
                        onSubmit={handleSubmit}
                    >
                        <div className="gig-form-field">
                            <label htmlFor="title">Gig title *</label>
                            <input
                                id="title"
                                name="title"
                                type="text"
                                placeholder="e.g. I will build a responsive website"
                                value={formData.title}
                                onChange={handleChange}
                                minLength={5}
                                maxLength={100}
                                required
                            />
                            <span>
                                Use a clear title that describes your service.
                            </span>
                        </div>

                        <div className="gig-form-field">
                            <label htmlFor="description">
                                Description *
                            </label>
                            <textarea
                                id="description"
                                name="description"
                                placeholder="Describe your service, what clients can expect, and what you will deliver..."
                                value={formData.description}
                                onChange={handleChange}
                                minLength={20}
                                maxLength={2000}
                                rows={7}
                                required
                            />
                            <span>
                                {formData.description.length}/2000 characters
                            </span>
                        </div>

                        <div className="gig-form-grid">
                            <div className="gig-form-field">
                                <label htmlFor="category">
                                    Category *
                                </label>
                                <select
                                    id="category"
                                    name="category"
                                    value={formData.category}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="">
                                        Select a category
                                    </option>

                                    {categories.map((category) => (
                                        <option
                                            key={category}
                                            value={category}
                                        >
                                            {category}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="gig-form-field">
                                <label htmlFor="price">
                                    Price (ZAR) *
                                </label>
                                <div className="gig-price-input">
                                    <span>R</span>
                                    <input
                                        id="price"
                                        name="price"
                                        type="number"
                                        placeholder="500.00"
                                        value={formData.price}
                                        onChange={handleChange}
                                        min="1"
                                        max="10000000"
                                        step="0.01"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="gig-form-field">
                            <label htmlFor="skills">
                                Skills and expertise
                            </label>
                            <input
                                id="skills"
                                name="skills"
                                type="text"
                                placeholder="e.g. React, CSS, Responsive Design"
                                value={formData.skills}
                                onChange={handleChange}
                            />
                            <span>
                                Separate each skill with a comma. This field
                                is optional.
                            </span>
                        </div>

                        <div className="create-gig-actions">
                            <Link
                                to="/freelancer/dashboard"
                                className="btn btn-outline"
                            >
                                Cancel
                            </Link>

                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={submitting || Boolean(success)}
                            >
                                {submitting
                                    ? "Publishing..."
                                    : success
                                        ? "Published"
                                        : "Publish gig"}
                            </button>
                        </div>
                    </form>
                </section>
            </div>
        </div>
    );
}