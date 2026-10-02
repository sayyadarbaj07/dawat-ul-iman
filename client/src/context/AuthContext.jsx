import { createContext, useContext, useState, useEffect } from "react";
import { authApi } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        try {
            const storedUserStr = localStorage.getItem("dawat_user");
            const storedToken = localStorage.getItem("dawat_token");
            if (!storedUserStr || !storedToken) {
                localStorage.removeItem("dawat_user");
                localStorage.removeItem("dawat_token");
                return null;
            }

            const storedUser = JSON.parse(storedUserStr);

            const base64Url = storedToken.split('.')[1];
            if (!base64Url) throw new Error("Invalid token");
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            const payload = JSON.parse(jsonPayload);

            if (payload.id !== storedUser.id) {
                localStorage.removeItem("dawat_user");
                localStorage.removeItem("dawat_token");
                return null;
            }

            return storedUser;
        }
        catch (e) {
            localStorage.removeItem("dawat_user");
            localStorage.removeItem("dawat_token");
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
            localStorage.removeItem("dawat_user");
            localStorage.removeItem("dawat_token");

            const response = await authApi.login(username, password);
            localStorage.setItem("dawat_token", response.token);
            setUser({
                id: response._id,
                name: response.name,
                role: response.role,
                initials: response.initials,
                mustChangePassword: response.mustChangePassword,
            });
            return { success: true };
        } catch (error) {
            console.error("Login failed:", error);
            return { success: false, error };
        }
    };

    const logout = () => {
        localStorage.removeItem("dawat_user");
        localStorage.removeItem("dawat_token");
        setUser(null);
    };

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
    admin: ["/", "/students", "/promotions", "/teachers", "/curriculum", "/attendance", "/exams", "/finance", "/reserve-fund", "/hostel", "/activities", "/meetings", "/calendar", "/reports", "/users", "/audit", "/settings", "/classes", "/data-resolution", "/employees", "/employee-attendance", "/payroll"],
    teacher: ["/", "/students", "/curriculum", "/attendance", "/exams", "/activities", "/calendar", "/classes"],
    accountant: ["/finance", "/reserve-fund"],
    viewer: ["/", "/reports", "/calendar"],
};
