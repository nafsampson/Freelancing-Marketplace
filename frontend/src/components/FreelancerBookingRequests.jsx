
import { useEffect, useState, useRef } from "react";
import {
  getBookings,
  acceptBooking,
  rejectBooking,
  completeBooking,
} from "../services/bookingService";

function FreelancerBookingRequests({ onBookingCompleted }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingId, setProcessingId] = useState(null);
  const inFlight = useRef(false);
  const [notice, setNotice] = useState("");

  const loadBookings = async () => {
    try {
      setError("");
      const response = await getBookings();

      const bookingList = response?.data?.data ?? response?.data ?? [];
      setBookings(Array.isArray(bookingList) ? bookingList : []);
    } catch (err) {
      setError(err.message || "Could not load booking requests.");
    } finally {
      setLoading(false);
    }
  };

  // Load bookings when the component first mounts.
  useEffect(() => {
    let isMounted = true;

    getBookings()
      .then((response) => {
        if (!isMounted) return;

        const bookingList = response?.data?.data ?? response?.data ?? [];
        setBookings(Array.isArray(bookingList) ? bookingList : []);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || "Could not load booking requests.");
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const updateStatus = async (bookingId, action) => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      setProcessingId(bookingId);
      setError("");
      setNotice("");

      let response;

      if (action === "accept") {
        response = await acceptBooking(bookingId);
      } else if (action === "reject") {
        response = await rejectBooking(bookingId);
      } else if (action === "complete") {
        response = await completeBooking(bookingId);
      }

      const updatedBooking =
        response?.data?.booking ?? response?.data?.data?.booking;

      const newStatus =
        updatedBooking?.status;
      if (!["Accepted", "Cancelled", "Completed"].includes(newStatus)) {
        await loadBookings();
        throw new Error("The response could not be verified. Refresh to check the booking status.");
      }

      setBookings((current) =>
        current.map((booking) =>
          (booking._id ?? booking.id) === bookingId
            ? { ...booking, status: newStatus }
            : booking
        )
      );

      // Reload to ensure displayed data matches the backend.
      setNotice(`Booking ${newStatus.toLowerCase()}.`);
      await loadBookings();
      if (action === "complete") {
    try { await onBookingCompleted?.(); }
    catch { setError("Booking completed, but income could not be refreshed. Refresh the dashboard to check totals."); }
}
    } catch (err) {
      setError(err.message || "Could not update the booking.");
    } finally {
      inFlight.current = false;
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <section className="booking-requests">
        <h2>Booking Requests</h2>
        <p>Loading booking requests...</p>
      </section>
    );
  }

  return (
    <section className="booking-requests">
      <div className="booking-requests-header">
        <div>
          <h2>Booking Requests</h2>
          <p>Manage requests from clients and track your work.</p>
        </div>

        <button
          type="button"
          className="booking-refresh-button"
          onClick={loadBookings}
          disabled={processingId !== null}
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="booking-error" role="alert">
          {error}
        </div>
      )}
      {notice && <p role="status">{notice}</p>}

      {bookings.length === 0 && !error ? (
        <div className="booking-empty">
          <h3>No booking requests yet</h3>
          <p>When a client books one of your gigs, it will appear here.</p>
        </div>
      ) : (
        <div className="booking-list">
          {bookings.map((booking) => {
            const bookingId = booking._id ?? booking.id;
            const gig = booking.gigId;
            const client = booking.clientId;
            const status = booking.status;

            return (
              <article className="booking-card" key={bookingId}>
                <div className="booking-card-top">
                  <div>
                    <h3>{gig?.title || "Gig booking"}</h3>
                    <p className="booking-category">
                      {gig?.category || "General"}
                    </p>
                  </div>

                  <span
                    className={`booking-status booking-status-${status?.toLowerCase()}`}
                  >
                    {status}
                  </span>
                </div>

                <div className="booking-details">
                  <p>
                    <strong>Client:</strong>{" "}
                    {client?.fullName || "Unknown client"}
                  </p>

                  {client?.email && (
                    <p>
                      <strong>Email:</strong> {client.email}
                    </p>
                  )}

                  <p>
                    <strong>Amount:</strong>{" "}
                    R{Number(booking.amount || 0).toFixed(2)}
                  </p>

                  <p>
                    <strong>Requested:</strong>{" "}
                    {booking.createdAt
                      ? new Date(booking.createdAt).toLocaleDateString()
                      : "Not available"}
                  </p>
                </div>

                <div className="booking-actions">
                  {status === "Pending" && (
                    <>
                      <button
                        type="button"
                        className="booking-accept-button"
                        disabled={processingId !== null}
                        onClick={() => updateStatus(bookingId, "accept")}
                      >
                        {processingId === bookingId
                          ? "Processing..."
                          : "Accept"}
                      </button>

                      <button
                        type="button"
                        className="booking-reject-button"
                        disabled={processingId !== null}
                        onClick={() => updateStatus(bookingId, "reject")}
                      >
                        Reject
                      </button>
                    </>
                  )}

                  {status === "Accepted" && (
                    <button
                      type="button"
                      className="booking-complete-button"
                      disabled={processingId !== null}
                      onClick={() => updateStatus(bookingId, "complete")}
                    >
                      {processingId === bookingId
                        ? "Processing..."
                        : "Mark as Completed"}
                    </button>
                  )}

                  {status === "Completed" && (
                    <span className="booking-completed-message">
                      Work completed
                    </span>
                  )}

                  {status === "Cancelled" && (
                    <span className="booking-cancelled-message">
                      Booking rejected
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default FreelancerBookingRequests;
