
import { apiRequest } from "./api";

export const loginUser = (email, password) =>
    apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
    });

export const registerUser = (details) =>
    apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify(details),
    });

export const getProfile = () =>
    apiRequest("/auth/profile");

export const logoutUser = () =>
    apiRequest("/auth/logout", {
        method: "POST"
    });