import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../components/providers/AuthProvider';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

export const usePasscode = () => {
    const { passcodeData } = useAuth();
    const [isPasscodeVerified, setIsPasscodeVerified] = useState(
        sessionStorage.getItem('finai_passcode_verified') === 'true'
    );
    const backgroundTimeRef = useRef<number>(0);

    // Auto-lock Logic (30s timeout)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                backgroundTimeRef.current = Date.now();
            } else {
                const timeInBackground = Date.now() - backgroundTimeRef.current;
                if (passcodeData?.enabled && timeInBackground > 30000 && backgroundTimeRef.current > 0) {
                    console.log("App locked due to inactivity");
                    setIsPasscodeVerified(false); // Lock the app
                    sessionStorage.removeItem('finai_passcode_verified');
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [passcodeData?.enabled]);

    // Sync session storage on mount/updates if needed, 
    // but mostly we rely on the initial state and manual updates.
    useEffect(() => {
        // If passcode is disabled, we are effectively verified
        if (passcodeData && !passcodeData.enabled) {
            setIsPasscodeVerified(true);
        }
    }, [passcodeData]);

    const handlePasscodeSuccess = useCallback(() => {
        console.log("[App] Passcode Verified Manually");
        setIsPasscodeVerified(true);
        sessionStorage.setItem('finai_passcode_verified', 'true');
    }, []);

    const handleLogout = useCallback(async () => {
        console.log("[App] Logging out...");
        await signOut(auth);
        sessionStorage.removeItem('finai_passcode_verified');
        setIsPasscodeVerified(false);
    }, []);

    return {
        isPasscodeVerified,
        handlePasscodeSuccess,
        handleLogout
    };
};
