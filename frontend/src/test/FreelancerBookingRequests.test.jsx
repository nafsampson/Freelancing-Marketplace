import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FreelancerBookingRequests from '../components/FreelancerBookingRequests';
import { getBookings, acceptBooking, rejectBooking, completeBooking } from '../services/bookingService';
vi.mock('../services/bookingService', () => ({
    getBookings: vi.fn(), acceptBooking: vi.fn(), rejectBooking: vi.fn(), completeBooking: vi.fn()
}));
const booking = { _id: 'b1', status: 'Pending', amount: 500,
    gigId: { title: 'Portfolio website' }, clientId: { fullName: 'Demo Client' } };
describe('Freelancer booking decisions', () => {
    beforeEach(() => { vi.resetAllMocks(); getBookings.mockResolvedValue({ data: [{ ...booking }] }); });
    it('shows a loading failure without falsely claiming there are no requests', async () => {
        getBookings.mockRejectedValueOnce(Error('Network unavailable'));
        render(<FreelancerBookingRequests />);
        expect(await screen.findByRole('alert')).toHaveTextContent('Network unavailable');
        expect(screen.queryByText('No booking requests yet')).not.toBeInTheDocument();
    });
    for (const [label, action, status] of [['Accept', acceptBooking, 'Accepted'], ['Reject', rejectBooking, 'Cancelled']]) {
        it(`${label} displays the persisted server status`, async () => {
            action.mockResolvedValueOnce({ data: { booking: { status } } });
            render(<FreelancerBookingRequests />);
            fireEvent.click(await screen.findByRole('button', { name: label }));
            getBookings.mockResolvedValue({ data: [{ ...booking, status }] });
            expect(await screen.findByRole('status')).toHaveTextContent(`Booking ${status.toLowerCase()}.`);
            await waitFor(() => expect(action).toHaveBeenCalledWith('b1'));
            expect(screen.queryByRole('button', { name: label })).not.toBeInTheDocument();
        });
    }
    it('keeps the booking pending when rejection fails', async () => {
        rejectBooking.mockRejectedValueOnce(Error('Unable to save'));
        render(<FreelancerBookingRequests />);
        fireEvent.click(await screen.findByRole('button', { name: 'Reject' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('Unable to save');
        expect(screen.getByText('Pending')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Reject' })).toBeEnabled();
    });
    it('disables competing actions during an in-flight decision', async () => {
        acceptBooking.mockImplementation(() => new Promise(() => {}));
        render(<FreelancerBookingRequests />);
        fireEvent.click(await screen.findByRole('button', { name: 'Accept' }));
        expect(screen.getByRole('button', { name: 'Reject' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Refresh' })).toBeDisabled();
    });
    it('does not invent a status from a malformed success response', async () => {
        acceptBooking.mockResolvedValueOnce({});
        render(<FreelancerBookingRequests />);
        fireEvent.click(await screen.findByRole('button', { name: 'Accept' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('could not be verified');
        expect(screen.getByText('Pending')).toBeInTheDocument();
    });
    it('distinguishes a saved completion from an income refresh failure', async () => {
        getBookings.mockResolvedValue({ data: [{ ...booking, status: 'Accepted' }] });
        completeBooking.mockResolvedValue({ data: { booking: { status: 'Completed' } } });
        const refresh = vi.fn().mockRejectedValue(Error('Income unavailable'));
        render(<FreelancerBookingRequests onBookingCompleted={refresh} />);
        fireEvent.click(await screen.findByRole('button', { name: 'Mark as Completed' }));
        getBookings.mockResolvedValue({ data: [{ ...booking, status: 'Completed' }] });
        expect(await screen.findByRole('alert')).toHaveTextContent('Booking completed, but income could not be refreshed');
        expect(refresh).toHaveBeenCalledOnce();
    });
});
