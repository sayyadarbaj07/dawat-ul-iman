import { createContext, useContext, useState, useEffect } from "react";
import { settingsApi } from "@/lib/api";

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const response = await settingsApi.getSettings();
            setSettings(response.data);
        } catch (error) {
            console.error("Failed to fetch settings:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    const updateSettings = async (formData) => {
        try {
            const response = await settingsApi.updateSettings(formData);
            setSettings(response.data);
            return true;
        } catch (error) {
            console.error("Failed to update settings:", error);
            return false;
        }
    };

    return (
        <SettingsContext.Provider value={{ settings, loading, fetchSettings, updateSettings }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const ctx = useContext(SettingsContext);
    if (!ctx) throw new Error("useSettings must be used inside SettingsProvider");
    return ctx;
}
