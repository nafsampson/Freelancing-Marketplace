import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Register from '../pages/Register';
import { AuthProvider } from '../context/AuthContext';

describe('Register Component', () => {
    it('renders all registration fields (name, email, password, confirmPassword, role)', () => {
        render(
            <BrowserRouter>
                <AuthProvider>
                    <Register />
                </AuthProvider>
            </BrowserRouter>
        );

        expect(screen.getByLabelText(/Full name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Email address/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/^Password/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Confirm password/i)).toBeInTheDocument();
        expect(screen.getByText(/I want to.../i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Create account/i })).toBeInTheDocument();
    });

    it('validates password mismatch on frontend submission', async () => {
        render(
            <BrowserRouter>
                <AuthProvider>
                    <Register />
                </AuthProvider>
            </BrowserRouter>
        );

        fireEvent.change(screen.getByLabelText(/Full name/i), { target: { value: 'Alice Smith' } });
        fireEvent.change(screen.getByLabelText(/Email address/i), { target: { value: 'alice@example.com' } });
        fireEvent.change(screen.getByLabelText(/^Password/i), { target: { value: 'Password123!' } });
        fireEvent.change(screen.getByLabelText(/Confirm password/i), { target: { value: 'DifferentPassword123!' } });

        const form = screen.getByRole('button', { name: /Create account/i }).closest('form');
        fireEvent.submit(form);

        expect(await screen.findByText(/Your passwords do not match/i)).toBeInTheDocument();
    });

    it('validates password length under 8 characters', async () => {
        render(
            <BrowserRouter>
                <AuthProvider>
                    <Register />
                </AuthProvider>
            </BrowserRouter>
        );

        fireEvent.change(screen.getByLabelText(/Full name/i), { target: { value: 'Bob' } });
        fireEvent.change(screen.getByLabelText(/Email address/i), { target: { value: 'bob@example.com' } });
        fireEvent.change(screen.getByLabelText(/^Password/i), { target: { value: 'short' } });
        fireEvent.change(screen.getByLabelText(/Confirm password/i), { target: { value: 'short' } });

        const form = screen.getByRole('button', { name: /Create account/i }).closest('form');
        fireEvent.submit(form);

        expect(await screen.findByText(/must contain at least 8 characters/i)).toBeInTheDocument();
    });
});
