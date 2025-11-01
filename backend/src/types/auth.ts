export interface User {
    id: string;
    email: string;
    role: string;
}

export interface JWTPayload {
    userId: string;
    email: string;
    role: string;
}

