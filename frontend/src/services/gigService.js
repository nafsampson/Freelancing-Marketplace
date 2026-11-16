
import { apiRequest } from "./api";

export const getGigs = () =>
    apiRequest("/gigs");

export const getGigById = (id) =>
    apiRequest(`/gigs/${id}`);

export const createGig = (gig) =>
    apiRequest("/gigs", {
        method: "POST",
        body: JSON.stringify(gig),
    });

export const updateGig = (id, gig) =>
    apiRequest(`/gigs/${id}`, {
        method: "PUT",
        body: JSON.stringify(gig),
    });

export const deleteGig = (id) =>
    apiRequest(`/gigs/${id}`, {
        method: "DELETE",
    });
