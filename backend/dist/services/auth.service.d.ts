import { User } from '@prisma/client';
interface RegisterInput {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
}
interface LoginInput {
    email: string;
    password: string;
}
interface AuthResponse {
    user: Omit<User, 'passwordHash'>;
    token: string;
}
export declare class AuthService {
    /**
     * Register a new user
     */
    register(input: RegisterInput): Promise<AuthResponse>;
    /**
     * Login user
     */
    login(input: LoginInput): Promise<AuthResponse>;
    /**
     * Get user by ID
     */
    getUserById(userId: string): Promise<Omit<User, 'passwordHash'> | null>;
    /**
     * Generate JWT token
     */
    generateToken(userId: string): string;
    /**
     * Verify JWT token
     */
    verifyToken(token: string): {
        userId: string;
        type: string;
    };
}
export declare const authService: AuthService;
export {};
//# sourceMappingURL=auth.service.d.ts.map