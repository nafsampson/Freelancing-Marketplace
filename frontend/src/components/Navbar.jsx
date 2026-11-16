import { NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
    const {
        user,
        logout,
        isClient,
        isFreelancer,
        isAdmin,
    } = useAuth();

    const navigate = useNavigate();
    const [logoutNotice, setLogoutNotice] = useState("");
    const [loggingOut, setLoggingOut] = useState(false);

    async function handleLogout() {
        setLoggingOut(true);
        setLogoutNotice("");
        try{
            await logout();
        }catch{
            setLogoutNotice("Signed out on this device. Server sign-out could not be confirmed.");
        }finally{
            navigate("/", { replace: true });
            setLoggingOut(false);
        }
        
        
    }

    const linkClass = ({ isActive }) =>
        `nav-link${isActive ? " active" : ""}`;

    return (
        <header className="site-header">
            <nav className="navbar">
                <NavLink to="/" className="brand">
                    HustleHub<span>+</span>
                </NavLink>

                <div className="nav-links">
                    <NavLink to="/" end className={linkClass}>
                        Home
                    </NavLink>

                    <NavLink to="/gigs" className={linkClass}>
                        Browse Gigs
                    </NavLink>

                    {isClient && (
                        <NavLink
                            to="/client/dashboard"
                            className={linkClass}
                        >
                            My Dashboard
                        </NavLink>
                    )}

                    {isFreelancer && (
                        <>
                            <NavLink
                                to="/freelancer/dashboard"
                                className={linkClass}
                            >
                                My Dashboard
                            </NavLink>

                            <NavLink
                                to="/freelancer/gigs/create"
                                className={linkClass}
                            >
                                Create Gig
                            </NavLink>
                        </>
                    )}

                    {isAdmin && (
                        <NavLink
                            to="/admin/dashboard"
                            className={linkClass}
                        >
                            Admin Dashboard
                        </NavLink>
                    )}
                </div>

                <div className="nav-account">
                    {user ? (
                        <>
                            <span className="welcome-user">
                                Hi, {user.name || user.email}
                            </span>

                            <button
                                type="button"
                                className="btn btn-outline"
                                onClick={handleLogout}
                                disabled={loggingOut}
                            >
                                Log out
                            </button>
                        </>
                    ) : (
                        <>
                            <NavLink
                                to="/login"
                                className={linkClass}
                            >
                                Log in
                            </NavLink>

                            <NavLink
                                to="/register"
                                className="btn btn-primary"
                            >
                                Get started
                            </NavLink>
                        </>
                    )}
                </div>
            </nav>
            {logoutNotice && <p className="logout-notice" role="status">{logoutNotice}</p>}
        </header>
    );
}
