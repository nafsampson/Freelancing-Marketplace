
import { apiRequest } from "./api";

export const createBooking = (gigId) =>
  apiRequest("/bookings", {
    method: "POST",
    body: JSON.stringify({ gigId }),
  });

export const getBookings = () =>
  apiRequest("/bookings");

export const acceptBooking = (bookingId) =>
  apiRequest(`/bookings/${bookingId}/accept`, {
    method: "PATCH",
  });

export const rejectBooking = (bookingId) =>
  apiRequest(`/bookings/${bookingId}/reject`, {
    method: "PATCH",
  });

export const completeBooking = (bookingId) =>
  apiRequest(`/bookings/${bookingId}/complete`, {
    method: "PATCH",
  });
