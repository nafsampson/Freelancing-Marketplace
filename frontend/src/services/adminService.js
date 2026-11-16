
import { apiRequest } from "./api";

export const getAdminStats = () =>
    apiRequest("/admin/stats");

export const getAdminUsers = () =>
    apiRequest("/admin/users");

export const getAdminGigs = () =>
    apiRequest("/admin/gigs");
