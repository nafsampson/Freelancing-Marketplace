import { Navigate, Route, Routes } from "react-router-dom";

import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Gigs from "./pages/Gigs";
import GigDetails from "./pages/GigDetails";
import ClientDashboard from "./pages/ClientDashboard";
import FreelancerDashboard from "./pages/FreelancerDashboard";
import CreateGig from "./pages/CreateGig";
import EditGig from "./pages/EditGig";
import AdminDashboard from "./pages/AdminDashboard"; // 1. Added import

function NotFound() {
    return (
        <section className="page-container">
            <h1>Page not found</h1>
            <p>The page you're looking for doesn't exist.</p>
        </section>
    );
}

export default function App() {
    return (
        <>
            <a className="skip-link" href="#main-content">Skip to content</a>
            <Navbar />

            <main id="main-content" tabIndex={-1}>
                <Routes>
                    {/* Public pages */}
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/gigs" element={<Gigs />} />
                    <Route
                        path="/gigs/:id"
                        element={<GigDetails />}
                    />

                    {/* Client-only pages */}
                    <Route element={
                        <ProtectedRoute allowedRoles={["Client"]} />
                    }>
                        <Route
                            path="/client/dashboard"
                            element={<ClientDashboard />}
                        />
                    </Route>

                    {/* Freelancer-only pages */}
                    <Route element={
                        <ProtectedRoute allowedRoles={["Freelancer"]} />
                    }>
                        <Route
                            path="/freelancer/dashboard"
                            element={<FreelancerDashboard />}
                        />
                        <Route
                            path="/freelancer/gigs/create"
                            element={<CreateGig />}
                        />
                        <Route
                            path="/freelancer/gigs/:id/edit"
                            element={<EditGig />}
                        />
                    </Route>

                    {/* Admin-only pages */}
                    <Route element={
                        <ProtectedRoute allowedRoles={["Admin"]} />
                    }>
                        <Route
                            path="/admin/dashboard"
                            element={<AdminDashboard />}
                        />
                    </Route>

                    {/* Fallback for unknown URLs */}
                    <Route path="/not-found" element={<NotFound />} />
                    <Route path="*" element={<Navigate to="/not-found" replace />} />
                </Routes>
            </main>
        </>
    );
}
