import { createContext, useContext, useState, useEffect } from "react";
import { authApi } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        try {
            const stored = localStorage.getItem("dawat_user");
            return stored ? JSON.parse(stored) : null;
        }
        catch {
            return null;
        }
    });

    useEffect(() => {
        if (user) {
            localStorage.setItem("dawat_user", JSON.stringify(user));
        }
        else {
            localStorage.removeItem("dawat_user");
            localStorage.removeItem("dawat_token");
        }
    }, [user]);

    const login = async (username, password) => {
        try {
            const response = await authApi.login(username, password);
            localStorage.setItem("dawat_token", response.token);
            setUser({
                id: response._id,
                name: response.name,
                role: response.role,
                initials: response.initials,
                mustChangePassword: response.mustChangePassword,
            });
            return true;
        } catch (error) {
            console.error("Login failed:", error);
            return false;
        }
    };

    const logout = () => setUser(null);

    return (
        <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx)
        throw new Error("useAuth must be used inside AuthProvider");
    return ctx;
}

export const ROLE_PERMISSIONS = {
    admin: ["/", "/students", "/promotions", "/teachers", "/curriculum", "/attendance", "/exams", "/finance", "/hostel", "/activities", "/meetings", "/calendar", "/reports", "/users", "/audit", "/settings"],
    teacher: ["/", "/students", "/curriculum", "/attendance", "/exams", "/activities", "/calendar"],
    accountant: ["/", "/finance", "/reports"],
    viewer: ["/", "/reports", "/calendar"],
};
