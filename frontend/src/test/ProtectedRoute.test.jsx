import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import * as AuthContextModule from '../context/AuthContext';

describe('ProtectedRoute Component', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('displays loading state when session is being verified', () => {
        vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
            user: null,
            loading: true,
        });

        render(
            <MemoryRouter initialEntries={['/protected']}>
                <Routes>
                    <Route element={<ProtectedRoute allowedRoles={['Client']} />}>
                        <Route path="/protected" element={<div>Protected Secret Area</div>} />
                    </Route>
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByText(/Checking your session.../i)).toBeInTheDocument();
        expect(screen.queryByText(/Protected Secret Area/i)).not.toBeInTheDocument();
    });

    it('redirects unauthenticated visitor to login route', () => {
        vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
            user: null,
            loading: false,
        });

        render(
            <MemoryRouter initialEntries={['/protected']}>
                <Routes>
                    <Route path="/login" element={<div>Login Page Route</div>} />
                    <Route element={<ProtectedRoute allowedRoles={['Client']} />}>
                        <Route path="/protected" element={<div>Protected Secret Area</div>} />
                    </Route>
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByText('Login Page Route')).toBeInTheDocument();
        expect(screen.queryByText(/Protected Secret Area/i)).not.toBeInTheDocument();
    });

    it('redirects user with unauthorized role to root route', () => {
        vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
            user: { id: '1', role: 'Freelancer', fullName: 'Jane Dev' },
            loading: false,
        });

        render(
            <MemoryRouter initialEntries={['/client-only']}>
                <Routes>
                    <Route path="/" element={<div>Home Landing Page</div>} />
                    <Route element={<ProtectedRoute allowedRoles={['Client']} />}>
                        <Route path="/client-only" element={<div>Client Secret Area</div>} />
                    </Route>
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByText('Home Landing Page')).toBeInTheDocument();
        expect(screen.queryByText(/Client Secret Area/i)).not.toBeInTheDocument();
    });

    it('renders protected child component when user possesses allowed role', () => {
        vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
            user: { id: '2', role: 'Freelancer', fullName: 'Bob Builder' },
            loading: false,
        });

        render(
            <MemoryRouter initialEntries={['/freelancer-only']}>
                <Routes>
                    <Route element={<ProtectedRoute allowedRoles={['Freelancer']} />}>
                        <Route path="/freelancer-only" element={<div>Freelancer Portal Content</div>} />
                    </Route>
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByText('Freelancer Portal Content')).toBeInTheDocument();
    });
});
