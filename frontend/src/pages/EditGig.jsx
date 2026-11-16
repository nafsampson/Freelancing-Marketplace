import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { getGigById, updateGig } from "../services/gigService";

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

export default function EditGig() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        title: "",
        description: "",
        category: "",
        price: "",
        skills: "",
    });

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => {
        let active = true;

        async function loadGig() {
            try {
                setLoading(true);
                setError("");

                const result = await getGigById(id);
                const payload = result.data ?? result;
                const gig = payload.gig ?? payload;

                if (!gig || typeof gig !== "object") {
                    throw new Error("The gig could not be found.");
                }

                if (active) {
                    setFormData({
                        title: gig.title ?? "",
                        description: gig.description ?? "",
                        category: gig.category ?? "",
                        price: gig.price != null
                            ? String(gig.price)
                            : "",
                        skills: Array.isArray(gig.skills)
                            ? gig.skills.join(", ")
                            : "",
                    });
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
        const price = Number(formData.price);

        if (
            !title ||
            !description ||
            !formData.category ||
            formData.price === ""
        ) {
            setError("Please complete all required fields.");
            return;
        }

        if (title.length < 5 || title.length > 100) {
            setError("The title must contain between 5 and 100 characters.");
            return;
        }

        if (description.length < 20 || description.length > 2000) {
            setError(
                "The description must contain between 20 and 2000 characters."
            );
            return;
        }

        if (
            !Number.isFinite(price) ||
            price <= 0 ||
            price > 10000000
        ) {
            setError("Enter a valid price greater than zero.");
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
            await updateGig(id, {
                title,
                description,
                category: formData.category,
                price,
                skills,
            });

            setSuccess("Your gig has been updated successfully.");
        } catch (err) {
            setError(
                err.message || "Unable to update your gig. Please try again."
            );
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) {
        return (
            <div className="page-container">
                <p>Loading gig details...</p>
            </div>
        );
    }

    if (error && !formData.title && !formData.description) {
        return (
            <div className="create-gig-page">
                <section className="gig-details-message">
                    <h1>Unable to open this gig</h1>
                    <p>{error}</p>
                    <Link
                        to="/freelancer/dashboard"
                        className="btn btn-primary"
                    >
                        Back to dashboard
                    </Link>
                </section>
            </div>
        );
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
                    <span className="hero-label">MANAGE YOUR LISTING</span>
                    <h1>Edit your gig</h1>
                    <p>
                        Update your service details to keep your listing
                        accurate and useful for potential clients.
                    </p>
                </section>

                <section className="create-gig-card">
                    <div className="create-gig-card-heading">
                        <h2>Update service details</h2>
                        <p>
                            Make your changes below and save when you're ready.
                        </p>
                    </div>

                    {error && (
                        <div
                            className="gig-form-message gig-form-error"
                            role="alert"
                        >
                            {error}
                        </div>
                    )}

                    {success && (
                        <div
                            className="gig-form-message gig-form-success"
                            role="status"
                        >
                            {success}
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
                                value={formData.title}
                                onChange={handleChange}
                                minLength={5}
                                maxLength={100}
                                required
                            />
                        </div>

                        <div className="gig-form-field">
                            <label htmlFor="description">
                                Description *
                            </label>
                            <textarea
                                id="description"
                                name="description"
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

                                    {formData.category &&
                                        !categories.includes(formData.category) && (
                                            <option value={formData.category}>
                                                {formData.category}
                                            </option>
                                        )}

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
                                <label htmlFor="price">Price (ZAR) *</label>
                                <div className="gig-price-input">
                                    <span>R</span>
                                    <input
                                        id="price"
                                        name="price"
                                        type="number"
                                        min="1"
                                        max="10000000"
                                        step="0.01"
                                        value={formData.price}
                                        onChange={handleChange}
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
                                value={formData.skills}
                                onChange={handleChange}
                                placeholder="e.g. React, CSS, Responsive Design"
                            />
                            <span>
                                Separate skills with commas.
                            </span>
                        </div>

                        <div className="create-gig-actions">
                            <Link
                                to="/freelancer/dashboard"
                                className="btn btn-outline"
                            >
                                Cancel
                            </Link>

                            {success ? (
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={() =>
                                        navigate(
                                            "/freelancer/dashboard",
                                            { replace: true }
                                        )
                                    }
                                >
                                    Back to dashboard
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={submitting}
                                >
                                    {submitting
                                        ? "Saving changes..."
                                        : "Save changes"}
                                </button>
                            )}
                        </div>
                    </form>
                </section>
            </div>
        </div>
    );
}