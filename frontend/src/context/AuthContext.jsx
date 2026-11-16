import {
    createContext,
    useContext,
    useEffect,
    useState,
} from "react";

import {
    loginUser,
    registerUser,
    getProfile,
    logoutUser,
} from "../services/authService";

const AuthContext = createContext(null);

const VALID_ROLES = ["Client", "Freelancer", "Admin"];

function normalizeUser(user) {
    if (!user || !VALID_ROLES.includes(user.role)) {
        throw new Error("The server returned an invalid user role.");
    }

    return {
        ...user,
        id: user.id ?? user._id,
    };
}

function getPayload(result) {
    return result?.data ?? result;
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        try {
            if (!localStorage.getItem("token")) {
                localStorage.removeItem("user");
                return null;
            }
            const savedUser = localStorage.getItem("user");
            return savedUser ? JSON.parse(savedUser) : null;
        } catch {
            localStorage.removeItem("user");
            return null;
        }
    });

    const [loading, setLoading] = useState(
        () => Boolean(localStorage.getItem("token"))
    );

    useEffect(() => {
        let active = true;

        async function restoreSession() {
            const token = localStorage.getItem("token");

            if (!token) {
                setLoading(false);
                return;
            }

            try {
                const result = await getProfile();
                const payload = getPayload(result);

                const profile =
                    payload?.user ??
                    payload?.profile ??
                    payload;

                const currentUser = normalizeUser(profile);

                if (active) {
                    localStorage.setItem(
                        "user",
                        JSON.stringify(currentUser)
                    );
                    setUser(currentUser);
                }
            } catch {
                if (active) {
                    localStorage.removeItem("token");
                    localStorage.removeItem("user");
                    setUser(null);
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        restoreSession();

        return () => {
            active = false;
        };
    }, []);

    async function login(email, password) {
        setLoading(true);

        try {
            const result = await loginUser(email, password);
            const payload = getPayload(result);

            const token = payload?.token;
            const currentUser = normalizeUser(payload?.user);

            if (!token) {
                throw new Error(
                    "The server response did not include an authentication token."
                );
            }

            // Save the session only after validating the response.
            localStorage.setItem("token", token);
            localStorage.setItem(
                "user",
                JSON.stringify(currentUser)
            );

            setUser(currentUser);

            return currentUser;
        } finally {
            setLoading(false);
        }
    }

    async function register(details) {
        return registerUser(details);
    }

    async function logout() {
        try {
            await logoutUser();
        } finally {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            setUser(null);
        }
    }

    const value = {
        user,
        loading,
        login,
        register,
        logout,
        isClient: user?.role === "Client",
        isFreelancer: user?.role === "Freelancer",
        isAdmin: user?.role === "Admin",
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

// The hook lives next to its provider on purpose; moving it would touch every importer.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error(
            "useAuth must be used inside AuthProvider."
        );
    }

    return context;
}
